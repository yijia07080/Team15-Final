from django.http import JsonResponse, HttpResponse, HttpResponseRedirect, HttpResponseBadRequest
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.core.cache import cache
from django.core.mail import send_mail
from django.urls import reverse
from django.http import HttpResponse, FileResponse
from django.conf import settings
from .models import Bookmarks, TreeStructure, User, Provider
import secrets
from datetime import datetime, timedelta
from pathlib import Path
import tempfile
import subprocess
import requests
import logging
import json
import html
import time
import os
import re
from . import google_drive_opt

logger = logging.getLogger(__name__)

TEMP_DIR = Path(tempfile.gettempdir())  # in docker, this is ~/tmp

DRIVE_ROOT_FOLDER = "Team 15 Web App Container"

password_reset_tokens = {}

# some utils
def get_path_to_file(bid, account):
    """
    Returns a list of bid that root to the file.
    """
    pathlist = []
    current = bid
    while current is not None:
        try:
            pathlist.append(current)
            ts = TreeStructure.objects.get(bid=current, account=account)
            current = ts.parent_id
        except TreeStructure.DoesNotExist:
            break

    pathlist.reverse()
    return pathlist

def add_db_bookmarks(bookmarks, parent_ids, accounts):
    """
    add bookmark to database
    and adjust tree structure, group used_size
    bookmarks: list of Bookmarks objects
    """
    if len(bookmarks) != len(parent_ids) != len(accounts):
        raise ValueError("bookmarks, parent_ids and accounts must have the same length")

    add_num = len(bookmarks)
    if add_num == 0:
        return

    new_bookmarks = Bookmarks.objects.bulk_create(bookmarks)

    # adjust tree structure
    for i in range(add_num):
        ts = TreeStructure(
            account=User.objects.get(account=accounts[i]),
            bookmark_foreignkey=new_bookmarks[i],
            bid=new_bookmarks[i].bid,
            parent_id=parent_ids[i],
            children_id=[]
        )

        parent_tree = TreeStructure.objects.get(account=accounts[i], bid=parent_ids[i])
        parent_tree.children_id = parent_tree.children_id + [new_bookmarks[i].bid]

        ts.save()
        parent_tree.save()

    # adjust group used_size
    for i in range(add_num):
        path_to_file = get_path_to_file(new_bookmarks[i].bid, accounts[i])
        for j in range(1, len(path_to_file) - 1):
            folder = Bookmarks.objects.get(bid=path_to_file[j], account=accounts[i])
            folder.used_size += new_bookmarks[i].used_size
            folder.save()

def delete_db_file(bid, account):
    """
    delete bookmark from database
    and adjust tree structure, group used_size
    enforce: if True, delete the group or folder even if it has children
    """
    # delete bookmark from database
    try:
        bookmark = Bookmarks.objects.get(bid=bid, account=account)
        ts = TreeStructure.objects.get(account=account, bid=bid)
        parent_tree = TreeStructure.objects.get(account=account, bid=ts.parent_id)

        # check if the group or folder has children
        if (bookmark.file_type == "group" or bookmark.file_type == "folder"):
            raise ValueError("Cannot delete a group or folder that has children. Please move or delete its children first.")

        # adjust group used_size
        path_to_file = get_path_to_file(bid, account)
        for i in range(1, len(path_to_file) - 1):  # group to file parent
            folder = Bookmarks.objects.get(bid=path_to_file[i], account=account)
            folder.used_size -= bookmark.used_size
            folder.save()

        # delete tree structure
        parent_tree.children_id = [child for child in parent_tree.children_id if child != bid]
        parent_tree.save()
        bookmark.delete()
    except Bookmarks.DoesNotExist:
        pass

def delete_db_folder(bid, account):
    """
    delete folder from database
    and adjust tree structure, group used_size
    """
    try:
        folder = Bookmarks.objects.get(bid=bid, account=account)
        ts = TreeStructure.objects.get(account=account, bid=bid)
        parent_tree = TreeStructure.objects.get(account=account, bid=ts.parent_id)

        if folder.file_type != "folder" and folder.file_type != "group":
            raise ValueError("Only folder or group can be deleted with this function.")

        # check if the group or folder has children
        if len(ts.children_id) > 0:
            raise ValueError("Cannot delete a group or folder that has children. Please move or delete its children first.")

        # remove space providers
        if folder.file_type == "group":
            for provider in Provider.objects.filter(account=account, provider_account__in=folder.space_providers):
                provider.delete()

        # delete tree structure
        parent_tree.children_id = [child for child in parent_tree.children_id if child != bid]
        parent_tree.save()
        folder.delete()
    except Bookmarks.DoesNotExist:
        pass

def ensure_cookie(request):
    """
    如果 session 過期或未登入（從註冊中跳出），則清除 session
    return False if not authenticated
    """
    is_authenticated = request.session.get('is_authenticated', False)
    if not is_authenticated:
        request.session.flush()
        return False

def update_db_from_drive(account, update_provider_size=False, update_files=False, update_token=False):
    """
    ensure data consistency between database and google drive
    update_size: update provider's avaliable size if db and drive not match
    update_files: 
        update file list and used size of all bookmarks if db and drive not match
        if db file not in drive, delete it from db
        if drive file not in db, do nothing        
    update_token: check if token expired
    """
    # check if token expired
    if update_token:
        for provider in Provider.objects.filter(account=account):
            access_token = provider.access_token
            try:
                google_drive_opt.check_access_token(access_token)
            except google_drive_opt.ResponseError as e:
                if e.response.status_code == 400:  # token expired
                    logger.info(f" {provider.provider_account} Access token expired: {e}")
                    # refresh token
                    refresh_token = provider.refresh_token
                    new_access_token = google_drive_opt.refresh_access_token(refresh_token)
                    provider.access_token = new_access_token
                    provider.save()
                    logger.info(f"Refreshed access token for {provider.provider_account}")
                else:
                    return JsonResponse({"status": "error", "message": f"Error: {e}"}, status=e.response.status_code)
            except Exception as e:
                raise e

    if update_files:
        db_files = Bookmarks.objects.filter(account=account)
        for provider in Provider.objects.filter(account=account):
            provider_db_files = db_files.filter(space_providers__contains=[provider.provider_account])

            access_token = provider.access_token
            try:
                provider_drive_files = google_drive_opt.get_file_list(access_token, provider.google_id)
            except google_drive_opt.ResponseError as e:
                return JsonResponse({"status": "error", "message": f"Error: {e}"}, status=e.response.status_code)
            except Exception as e:
                raise e
            
            provider_drive_file_ids = [drive_file['id'] for drive_file in provider_drive_files]

            # check if db file not in drive
            for db_file in provider_db_files:
                if db_file.file_type == "group" or db_file.file_type == "folder" or db_file.file_type == "root":
                    continue

                if db_file.google_id not in provider_drive_file_ids:
                    delete_db_file(db_file.bid, account)
                    logger.info(f"Deleted file {db_file.bid} from database because it is not in drive")

    if update_provider_size:
        for provider in Provider.objects.filter(account=account):
            access_token = provider.access_token
            try:
                total_size, used_size = google_drive_opt.get_account_size(access_token)
            except google_drive_opt.ResponseError as e:
                return JsonResponse({"status": "error", "message": f"Error: {e}"}, status=e.response.status_code)
            except Exception as e:
                raise e

            provider.total_size = total_size
            provider.used_size = used_size
            provider.save()

def upload_to_drive(account, local_file_path, parent_id, file_used_size):
    '''
    first update provider total size and used size
    will select a provider from the group space_providers to upload the file
    returns: upload_provider, upload_response, parent_group_bid
    '''
    # decide upload to which provider
    update_db_from_drive(account, update_provider_size=True)
    path_bid = get_path_to_file(parent_id, account)
    group = Bookmarks.objects.get(bid=path_bid[1], account=account)
    upload_providers = Provider.objects.filter(account=account, provider_account__in=group.space_providers)
    upload_provider = None
    for provider in upload_providers:
        if provider.total_size - provider.used_size > file_used_size:
            upload_provider = provider
            break

    if upload_provider is None:
        raise ValueError("No available provider to upload the file")
    
    # upload file to google drive
    try:
        upload_respone = google_drive_opt.upload_file(
            upload_provider.access_token,
            local_file_path,
            upload_provider.google_id
        )
    except google_drive_opt.ResponseError as e:
        raise e
    except Exception as e:
        raise e
    
    return upload_provider, upload_respone, path_bid[1]

@ensure_csrf_cookie
def get_csrf(request):
    """
    Returns the CSRF token for the current session.
    """
    return JsonResponse({"status": "success"})

def forgot_password(request):
    """處理忘記密碼請求"""
    if request.method == 'POST':
        email = request.POST.get('email')
        try:
            user = User.objects.get(account=email)
            
            token = secrets.token_urlsafe(32)
            
            password_reset_tokens[token] = {
                'user': user.account,
                'expires': datetime.now() + timedelta(hours=1)  # 令牌有效期為1小時
            }
            
            frontend_url = "http://localhost:5174"
            reset_link = f"{frontend_url}/reset-password/{token}/"
            
            subject = '重設您的密碼'
            message = f'''
            您好，

            我們收到了重設您密碼的請求。請點擊以下連結來重設密碼：
            
            {reset_link}
            
            此連結將在一小時後失效。如果您並未請求重設密碼，請忽略此郵件。

            NTU Team15網站團隊
            '''
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )
            
            return render(request, 'forgot_password.html', {
                'success': '重設密碼的連結已發送到您的郵箱，請查收。(如果沒有收到請檢查垃圾郵件或是重新寄送)'
            })
            
        except User.DoesNotExist:
            return render(request, 'forgot_password.html', {
                'error': '此帳號尚未註冊'
            })
    
    # GET 請求：顯示忘記密碼頁面
    return render(request, 'forgot_password.html')


def reset_password(request, token):
    """處理密碼重設"""
    if token not in password_reset_tokens or datetime.now() > password_reset_tokens[token]['expires']:
        return render(request, 'reset_password.html', {
            'error': '密碼重設連結無效或已過期。請重新申請。'
        })
    
    if request.method == 'POST':
        new_pw = request.POST.get('new_password')
        confirm_pw = request.POST.get('confirm_password')
        
        if new_pw != confirm_pw:
            return render(request, 'reset_password.html', {
                'error': '兩次輸入密碼不一致',
                'token': token
            })
        
        username = password_reset_tokens[token]['user']
        user = User.objects.get(account=username)
        user.password = new_pw
        user.save()
        
        del password_reset_tokens[token]
        
        return redirect('login')
    
    return render(request, 'reset_password.html', {'token': token})

# Request rate limit
def rate_limit(view_func):
    def wrapped_view(request, *args, **kwargs):
        ip = request.META.get('REMOTE_ADDR')
        key = f'rate_limit:{ip}'
        limit = 10  # 每分鐘10次請求
        
        current = cache.get(key, 0)
        if current >= limit:
            return HttpResponse("Too Many Requests", status=429)
        
        cache.set(key, current + 1, 60)  # 60秒過期
        return view_func(request, *args, **kwargs)
    return wrapped_view


@rate_limit
def login_view(request):
    if request.method == 'POST':
        # 驗證 reCAPTCHA
        recaptcha_response = request.POST.get('g-recaptcha-response')
        recaptcha_data = {
            'secret': settings.RECAPTCHA_SECRETKEY,
            'response': recaptcha_response,
            'remoteip': request.META.get('REMOTE_ADDR')
        }
        r = requests.post(settings.RECAPTCHA_URL, data=recaptcha_data)
        result = r.json()
        if not result.get('success'):
            return render(request, 'login.html', {
                'error': 'reCAPTCHA 驗證失敗',
                'sitekey': settings.RECAPTCHA_SITEKEY
            })

        # 帳號密碼驗證
        username = request.POST.get('username')
        password = request.POST.get('password')
        try:
            user = User.objects.get(account=username, password=password)
            request.session['name'] = user.name
            request.session['username'] = user.account
            request.session['picture'] = user.picture
            request.session['is_authenticated'] = True
            request.session.set_expiry(60 * 60 * 24 * 7)
            return redirect('http://localhost:5174')
        except User.DoesNotExist:
            return render(request, 'login.html', {
                'error': '登入失敗',
                'sitekey': settings.RECAPTCHA_SITEKEY
            })
    
    # GET 請求：正常顯示登入頁
    return render(request, 'login.html', {
        'sitekey': settings.RECAPTCHA_SITEKEY
    })

@require_POST
def logout_view(request):
    request.session.flush()
    return JsonResponse({'status': 'success'})

def oauth2callback(request):
    code = request.GET.get('code')
    token_resp = requests.post(
        'https://oauth2.googleapis.com/token',
        data={
            'code': code,
            'client_id': settings.CLIENT_ID,
            'client_secret': settings.CLIENT_SECRET,
            'redirect_uri': settings.REDIRECT_URI,
            'grant_type': 'authorization_code'
        }
    )
    tokens = token_resp.json()
    access_token = tokens.get('access_token')
    refresh_token = tokens.get('refresh_token')
    userinfo_resp = requests.get(
        'https://openidconnect.googleapis.com/v1/userinfo',
        headers={'Authorization': f'Bearer {access_token}'}
    )
    userinfo = userinfo_resp.json()
    email = userinfo.get('email')
    name = userinfo.get('name')
    picture = userinfo.get('picture')

    try:
        existing = User.objects.get(account=email)
        if existing.password:
            return render(request, 'login.html', {
                'error': '此帳號已存在，請使用密碼登入',
                'sitekey': settings.RECAPTCHA_SITEKEY
            })
    except User.DoesNotExist:
        pass

    '''
    initialize database and google drive
    Provider:
        註冊google作為provider
    bookmark:
        root id 0
        group id 1 (使用註冊google作為這個group的provider)
    '''
    user, created = User.objects.update_or_create(
        account=email,
        defaults={'name': name, 'picture': picture, 'password': ''}
    )
    try:
        drive_root_folder = google_drive_opt.create_folder(access_token, DRIVE_ROOT_FOLDER)
        total_size, used_size = google_drive_opt.get_account_size(access_token)
    except google_drive_opt.ResponseError as e:
        return JsonResponse({"status": "error", "message": f"Error: {e}"}, status=e.response.status_code)
    except Exception as e:
        raise e
    
    provider, created = Provider.objects.update_or_create(
        account=user,
        defaults={
            'provider_account': email,
            'provider_name': name,
            'provider_picture': picture,
            'access_token': access_token,
            'refresh_token': refresh_token,
            'google_id': drive_root_folder['id'],
            'total_size': total_size,
            'used_size': used_size,
        }
    )

    root, bm_created = Bookmarks.objects.get_or_create(
        bid=0,
        account=user,
        defaults={
            'url': '#',
            'img': 'folder.png',
            'name': 'Home',
            'tags': [],
            'hidden': True,
            'last_modified': datetime.now().isoformat(),
            'file_type': "root",
        }
    )
    group, group_created = Bookmarks.objects.get_or_create(
        bid=1,
        account=user,
        defaults={
            'url': '#',
            'img': 'group.png',
            'name': '群組1',
            'tags': [],
            'hidden': False,
            'last_modified': datetime.now().isoformat(),
            'file_type': "group",
            'space_providers': [provider.provider_account],
            'used_size': 0,
        }
    )
    tree, ts_created = TreeStructure.objects.update_or_create(
        account=user,
        bookmark_foreignkey=root,
        bid=root.bid,
        defaults={'parent_id': None, 'children_id': [group.bid]}
    )
    gtree, ts_created = TreeStructure.objects.update_or_create(
        account=user,
        bookmark_foreignkey=group,
        bid=group.bid,
        defaults={'parent_id': 0, 'children_id': []}
    )

    request.session['name'] = name
    request.session['username'] = email
    request.session['picture'] = picture
    request.session['is_authenticated'] = False
    request.session.set_expiry(60 * 60 * 24 * 7)
    return render(request, 'password.html')

def provider_oauth2callback(request):
    """
    OAuth2 callback for provider login.
    This is used to register a new provider account.
    Oauth2 should include state:
    {
        "group_id": <group_id>,
        "redirect_url": <redirect_url>
    }
    """
    if request.method != 'GET':
        return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)
    state_param = request.GET.get("state")
    if not state_param:
        return JsonResponse({"status": "error", "message": "Missing state parameter"}, status=400)
    try:
        state_json = json.loads(state_param)
    except ValueError:
        return JsonResponse({"status": "error", "message": "Invalid state parameter"}, status=400)
    group_id = state_json.get("group_id")
    
    code = request.GET.get('code')
    token_resp = requests.post(
        'https://oauth2.googleapis.com/token',
        data={
            'code': code,
            'client_id': settings.CLIENT_ID,
            'client_secret': settings.CLIENT_SECRET,
            'redirect_uri': settings.PROVIDER_REDIRECT_URI,
            'grant_type': 'authorization_code'
        }
    )
    tokens = token_resp.json()
    access_token = tokens.get('access_token')
    refresh_token = tokens.get('refresh_token')

    ensure_cookie(request)
    if not access_token: # 待處理，重複授權情況
        return JsonResponse({'status': 'error', 'message': 'no access_token'}, status=400)
    
    state_json = json.loads(request.GET.get('state'))

    account = request.session.get('username', 'admin')
    if account == 'admin':
        return JsonResponse({"status": "error", "message": "No user session found"}, status=400)
    user = User.objects.get(account=account)

    group_id = state_json.get('groupId')
    try:
        group = Bookmarks.objects.get(bid=group_id, account=user)
    except Bookmarks.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Group not found"}, status=404)
    if group.file_type != "group":
        return JsonResponse({"status": "error", "message": "Not a group"}, status=400)

    provider_info_response = requests.get(
        'https://openidconnect.googleapis.com/v1/userinfo',
        headers={'Authorization': f'Bearer {access_token}'}
    )

    provider_info = provider_info_response.json()
    email = provider_info.get('email')
    name = provider_info.get('name')
    picture = provider_info.get('picture')

    # init google drive folder if not exists
    try:
        existing_provider = Provider.objects.get(account=user, provider_account=email)
        drive_root_folder = {'id': existing_provider.google_id}
    except Provider.DoesNotExist:
        try:
            drive_root_folder = google_drive_opt.create_folder(access_token, DRIVE_ROOT_FOLDER)  
        except google_drive_opt.ResponseError as e:
            return JsonResponse({"status": "error", "message": f"Error: {e}"}, status=e.response.status_code)
        except Exception as e:
            raise e
        
    # update or create provider
    try:
        total_size, used_size = google_drive_opt.get_account_size(access_token)
    except google_drive_opt.ResponseError as e:
        return JsonResponse({"status": "error", "message": f"Error: {e}"}, status=e.response.status_code)
    except Exception as e:
        raise e

    provider, created = Provider.objects.update_or_create(
        account=user,
        defaults={
            'provider_account': email,
            'provider_name': name,
            'provider_picture': picture,
            'access_token': access_token,
            'refresh_token': refresh_token,
            'google_id': drive_root_folder['id'],
            'total_size': total_size,
            'used_size': used_size,
        }
    )

    # add provider to group
    if provider.provider_account not in group.space_providers:
        group.space_providers.append(provider.provider_account)
        group.save()
    return redirect(state_json.get('redirectBridge', 'http://localhost:5174/'))

def remove_provider(request, group_id):
    '''
    remove a provider account from a group
    request:
    - provider_account: the account of the provider to remove
    '''
    if request.method != 'POST':
        return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)
    
    ensure_cookie(request)

    account = request.session.get('username', 'admin')
    if not account:
        return JsonResponse({"status": "error", "message": "No user session found"}, status=400)
    
    update_db_from_drive(account, update_provider_size=True, update_files=True)

    data = json.loads(request.body)
    remove_provider_account = data.get('provider_account')
    user = User.objects.get(account=account)

    try:
        group = Bookmarks.objects.get(bid=group_id, account=user)
        if group.file_type != "group":
            return JsonResponse({"status": "error", "message": "Not a group"}, status=400)
        if remove_provider_account not in group.space_providers:
            return JsonResponse({"status": "error", "message": "Provider not found in group"}, status=404)
    except Bookmarks.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Group not found"}, status=404)

    remove_provider_files = Bookmarks.objects.filter(account=user, space_providers__contains=[remove_provider_account])
    remove_provider_files = remove_provider_files.exclude(file_type__in=["group", "folder", "root"])
    if not remove_provider_files.exists():  # dierectly remove provider if no files
        Provider.objects.filter(account=user, provider_account=remove_provider_account).delete()
        group.space_providers = [p for p in group.space_providers if p != remove_provider_account]
        group.save()
        return JsonResponse({"status": "success", "message": "Provider removed successfully"})
       
    # ensure have enough space to remove provider
    # p1 [[[this webapp used]   used_size] total_size]
    # p2 [[[...]   used_size]              total_size]
    # p3 [[[...]           used_size]      total_size]
    # if remove p3, p3 webapp used_size < p1.total_size + p2.total_size - p1.used_size - p2.used_size
    remove_provider_files_used_size = sum(file.used_size for file in remove_provider_files)
    avaliable_size = 0
    other_providers = Provider.objects.filter(account=user).exclude(provider_account=remove_provider_account)
    remove_provider = Provider.objects.get(account=user, provider_account=remove_provider_account)
    for provider in other_providers:
        avaliable_size += provider.total_size - provider.used_size
    
    if remove_provider_files_used_size > avaliable_size:
        return JsonResponse({"status": "error", "message": "Not enough space to remove provider"}, status=400)
    
    # move files to other providers
    current_provider = other_providers.first()
    for file in remove_provider_files:
        while current_provider.total_size - current_provider.used_size < file.used_size:
            # switch to next provider
            other_providers = other_providers.exclude(provider_account=current_provider.provider_account)
            if not other_providers.exists():
                return JsonResponse({"status": "error", "message": "Not enough space to move files"}, status=400)
            current_provider = other_providers.first()

        # move file to current provider
        try:
            new_file_json = google_drive_opt.move_file_to_account(
                remove_provider.access_token,
                current_provider.access_token,
                file.google_id,
                current_provider.google_id
            )

            file.google_id = new_file_json['id']
            file.space_providers = [p for p in file.space_providers if p != remove_provider_account]
            file.save()
        except google_drive_opt.ResponseError as e:
            return JsonResponse({"status": "error", "message": f"Error moving file", "response": e.response}, status=e.response.status_code)
        except Exception as e:
            raise e

    # remove provider
    Provider.objects.filter(account=user, provider_account=remove_provider_account).delete()
    group.space_providers = [p for p in group.space_providers if p != remove_provider_account]
    group.save()
    return JsonResponse({"status": "success", "message": "Provider removed successfully"})

def set_password(request):
    if request.method == 'POST':
        new_pw = request.POST.get('new_password')
        confirm_pw = request.POST.get('confirm_password')
        if new_pw != confirm_pw:
            return render(request, 'password.html', {'error': '兩次輸入密碼不一致'})
        username = request.session.get('username')
        user = User.objects.get(account=username)
        user.password = new_pw
        user.save()
        request.session['is_authenticated'] = True
        return redirect('http://localhost:5174')
    return render(request, 'password.html')

def bookmarks_init_api(request):
    '''
    returns JSON:
    {
        'userInfo': {
            'username': 'a@example.com',
            'name':     'example',
            'picture':  '',
        },
        'idToBookmark': {
            0: {
                id : 0,
                url: "#",
                img: "folder.png",
                name: "home",
                tags: [],
                hidden: true,
                metadata: {
                    last_modified: "2025-04-07T02:06:22.107Z",
                    file_type: "root", 
                    used_size: 2600880,  // this is the file or folder or group used size in this webapp
                    
                    // only for file_type = "group"
                    total_size: 10000000,  // this is the total drive size add by all space providers total_size
                    spaceProviders: [
                        {
                        name: "a@example.com",
                        picture: "",
                        total_size: 10000000,  // this is the provider total drive size
                        used_size: 2600880,  // this is the provider used size including all drive content
                        },
                    ]
                }
            }, 
            ...
        },
        'treeStructure': {
            0: {
                parent_id: None,
                children_id: [1, 2, ...]
            },
            1: {
                parent_id: 0,
                children_id: []
            },
            ...
        }
    }
    '''
    if request.method == 'GET':
        return JsonResponse({'status': 'error', 'message': 'GET method not allowed'}, status=405)
    
    ensure_cookie(request)
    
    account = request.session.get('username', 'admin')
    name = request.session.get('name', 'default')
    picture = request.session.get('picture', '')

    user = User.objects.get(account=account)
    bookmarks = user.bookmarks.all()
    tree_qs   = user.tree_structure.all()

    # ensure data consistency between database and google drive
    if account != 'admin':
        update_db_from_drive(user, update_provider_size=True, update_files=True, update_token=True)

    ts_map = {
        ts.bid: {
            'parent_id':   ts.parent_id,
            'children_id': ts.children_id,  # 假設是 ArrayField 或 JSONField
        }
        for ts in tree_qs
    }

    idToBookmark = {}
    for bm in bookmarks:
        bid = bm.bid
        idToBookmark[bid] = {
            'id':    bid,
            'url':   bm.url,
            'img':   bm.img,
            'name':  bm.name,
            'tags':  bm.tags,
            'hidden':  bm.hidden,
            'metadata': {
                'last_modified': bm.last_modified.isoformat(),
                'file_type':     bm.file_type,
                'used_size':     bm.used_size,
            }
        }
        
        if bm.file_type == 'group':
            provider_objs = Provider.objects.filter(account=user, provider_account__in=bm.space_providers)
            idToBookmark[bid]['metadata']['total_size'] = 0
            idToBookmark[bid]['metadata']['spaceProviders'] = []
            for provider in provider_objs:
                idToBookmark[bid]['metadata']['spaceProviders'].append({
                    'name': provider.provider_account,
                    'picture': provider.provider_picture,
                    'total_size': provider.total_size,
                    'used_size': provider.used_size,
                })

                idToBookmark[bid]['metadata']['total_size'] += provider.total_size

    response_data = {
        'userInfo': {
            'username': account,
            'name':     name,
            'picture':  picture,
        },
        'idToBookmark': idToBookmark,
        'treeStructure': ts_map,
    }
    return JsonResponse(response_data)

def upload_file(request):
    """
    API for uploading files.
    request should be form-data and include:
    - file: the file to upload
    - new_bookmark: the bookmark item to upload
        {
            id,
            name,
            url,
            tags,
            img,
            hidden,
            metadata: {
                last_modified,
                file_type,
                used_size,
            },
        }
    - parent_id: the parent bid of the file

    returns:
    {
        "status": "success",
        "message": "File uploaded successfully"
        "group_used_size": {group id: used size},
    }
    """
    if request.method == 'GET':
        return JsonResponse({"status": "error", "message": "GET method not allowed"}, status=405)

    ensure_cookie(request)

    account = request.session.get('username', 'admin')

    file = request.FILES.get("file")
    bookmark_json = json.loads(request.POST.get("new_bookmark"))
    parent_id = request.POST.get("parent_id")

    if parent_id == 0 or parent_id is None:
        return JsonResponse({"status": "error", "message": f"Invalid parent_id {parent_id}"}, status=400)
    
    file_name_pathobj = Path(file.name)
    file_stem, file_suffix = file_name_pathobj.stem, file_name_pathobj.suffix
    temp_file_path = TEMP_DIR / f"{file_stem}-{secrets.token_hex(16)}{file_suffix}"

    if file:
        with open(temp_file_path, "wb+") as destination:
            for chunk in file.chunks():
                destination.write(chunk)

        # just for guest
        if account == 'admin':
            return JsonResponse({"status": "success", "message": "File uploaded successfully. (admin)"}, status=200)

        upload_provider, upload_respone, parent_group_bid = upload_to_drive(account, temp_file_path, parent_id, bookmark_json['metadata']['used_size'])
    
        # add to database
        new_bookmark_obj = Bookmarks(
            account=User.objects.get(account=account),
            bid=bookmark_json['id'],
            url=bookmark_json['url'],
            img=bookmark_json['img'],
            name=bookmark_json['name'],
            tags=bookmark_json['tags'],
            hidden=bookmark_json['hidden'],
            last_modified=bookmark_json['metadata']['last_modified'],
            file_type=bookmark_json['metadata']['file_type'],
            used_size=temp_file_path.stat().st_size,
            space_providers=[upload_provider.provider_account],
            google_id=upload_respone['id'],
        )
        add_db_bookmarks([new_bookmark_obj], [parent_id], [account])

        # get new group used size
        group = Bookmarks.objects.get(bid=parent_group_bid, account=account)
        group_used_size_response = {parent_group_bid: group.used_size}
        return JsonResponse({
            "status": "success", 
            "message": "File uploaded successfully", 
            "group_used_size": group_used_size_response}, 
            status=200
        )
    else:
        return JsonResponse({"status": "error", "message": "No file uploaded"}, status=400)
    
def download(request, bid):
    # if request.method == 'GET':
    #     return JsonResponse({"status": "error", "message": "GET method not allowed"}, status=405)
    
    ensure_cookie(request)

    account = request.session.get('username', 'admin')
    if account == 'admin':
        return JsonResponse({"status": "error", "message": "admin can't download file"}, status=400)
    
    # get file info
    try:
        bookmark = Bookmarks.objects.get(bid=bid, account=account)
    except Bookmarks.DoesNotExist:
        return JsonResponse({"status": "error", "message": "File not found"}, status=404)
    
    # TODO: download folder
    if bookmark.file_type == 'group' or bookmark.file_type == 'folder':
        return JsonResponse({"status": "error", "message": "Can't download folder"}, status=400)

    # download file from google drive to temp file
    provider = Provider.objects.get(account=account, provider_account=bookmark.space_providers[0])
    access_token = provider.access_token
    try:
        local_file_path = google_drive_opt.download_file(
            access_token,
            bookmark.google_id,
            TEMP_DIR 
        )

        if local_file_path:
            # send file to client
            f = open(local_file_path, 'rb')
            response = FileResponse(f)
            response['Content-Disposition'] = f'attachment; filename="{bookmark.name}"'
            response['Content-Type'] = 'application/octet-stream'
            return response
        else:
            return JsonResponse({"status": "error", "message": "File download failed"}, status=500)
    except google_drive_opt.ResponseError as e:
        return JsonResponse({"status": "error", "message": f"Error: {e}"}, status=e.response.status_code)
    except Exception as e:
        return JsonResponse({"status": "error", "message": "File download failed"}, status=500)

def bookmark_move(request, bid):
    """
    move bid to another folder or group
    request should be form-data and include:
    - new_parent_id: the new parent bid of the file
    """
    if request.method == 'GET':
        return JsonResponse({"status": "error", "message": "GET method not allowed"}, status=405)

    ensure_cookie(request)
    
    account = request.session.get('username', 'admin')
    if account == 'admin':
        return JsonResponse({"status": "error", "message": "admin can't move folder"}, status=400)
    
    update_db_from_drive(account, update_provider_size=True, update_files=True)

    # get file info
    try:
        bookmark = Bookmarks.objects.get(bid=bid, account=account)
    except Bookmarks.DoesNotExist:
        return JsonResponse({"status": "error", "message": "File not found"}, status=404)
    
    # check if the file is a group or root
    if bookmark.file_type == 'group' or bookmark.file_type == 'root':
        return JsonResponse({"status": "error", "message": "Can't move group or root folder"}, status=400)
    
    # can't move to root
    data = json.loads(request.body)
    new_parent_id = data.get("new_parent_id")
    if new_parent_id is None:
        return JsonResponse({"status": "error", "message": f"Invalid new_parent_id {new_parent_id}"}, status=400)
    
    try:
        new_parent = Bookmarks.objects.get(bid=new_parent_id, account=account)
    except Bookmarks.DoesNotExist:
        return JsonResponse({"status": "error", "message": "New parent folder not found"}, status=404)
    
    # can't move to file
    if new_parent.file_type != 'group' and new_parent.file_type != 'folder':
        return JsonResponse({"status": "error", "message": "New parent folder must be a group or folder"}, status=400)

    bookmark_ts = TreeStructure.objects.get(account=account, bookmark_foreignkey=bookmark)
    new_parent_ts = TreeStructure.objects.get(account=account, bookmark_foreignkey=new_parent)
    old_parent_ts = TreeStructure.objects.get(account=account, bid=bookmark_ts.parent_id)

    if new_parent_ts.bid == old_parent_ts.bid:
        return JsonResponse({"status": "success", "message": "File already in the target folder"}, status=200)

    # adjust tree structure (same as move)
    bookmark_ts.parent_id = new_parent.bid
    new_parent_ts.children_id = list(set(new_parent_ts.children_id + [bookmark.bid]))  
    old_parent_ts.children_id = [cid for cid in old_parent_ts.children_id if cid != bookmark.bid]


    # if new parent in other group, move file to new parent group
    new_parent_group = get_path_to_file(new_parent.bid, account)[1]
    old_group = get_path_to_file(bookmark.bid, account)[1]
    if new_parent_group == old_group:
        bookmark_ts.save()
        new_parent_ts.save()
        old_parent_ts.save()
        return JsonResponse({"status": "success", "message": "File moved successfully"}, status=200)
    
    # move file to new parent group
    move_bids = []
    move_bookmarks = []
    new_providers = []
    try:
        bfs_bid_queue = [bookmark.bid]
        while len(bfs_bid_queue) > 0:
            current_bid = bfs_bid_queue.pop(0)
            move_bids.append(current_bid)
            children = TreeStructure.objects.filter(account=account, parent_id=current_bid).values_list('bid', flat=True)
            bfs_bid_queue.extend(children)
        
        for move_bid in move_bids:
            move_bookmark = Bookmarks.objects.get(bid=move_bid, account=account)
            if move_bookmark.file_type == 'folder':
                continue
            move_bookmarks.append(move_bookmark)
            from_provider = Provider.objects.get(account=account, provider_account=move_bookmark.space_providers[0])
            from_access_token = from_provider.access_token

            new_provider = None
            for provider in Provider.objects.filter(account=account, provider_account__in=new_parent.space_providers):
                if provider.total_size - provider.used_size >= move_bookmark.used_size:
                    new_provider = provider
                    break

            if new_provider is None:
                return JsonResponse({"status": "error", "message": "Not enough space in new parent group"}, status=400)
            new_providers.append(new_provider)

            to_access_token = new_provider.access_token
            new_google_id = google_drive_opt.copy_file_to_account(
                from_access_token,
                to_access_token,
                move_bookmark.google_id,
                new_provider.google_id
            )['id']
            move_bookmark.google_id = new_google_id
            move_bookmark.space_providers = [new_provider.provider_account]
    except Exception as e:
        # rollback
        # remove new provider drive file
        for i in range(len(move_bookmarks)):
            google_drive_opt.delete_file(
                new_providers[i].access_token,
                move_bookmarks[i].google_id
            )

        if type(e) is google_drive_opt.ResponseError:
            return JsonResponse({"status": "error", "message": f"Error moving file", "response": e.response}, status=e.response.status_code)
        return JsonResponse({"status": "error", "message": "Error moving file"}, status=500)
    
    bookmark_ts.save()
    new_parent_ts.save()
    old_parent_ts.save()

    for i in range(len(move_bookmarks)):
        move_bookmarks[i].save()
        add_db_bookmarks([move_bookmarks[i]], [new_parent.bid], [account])
        delete_db_file(move_bookmarks[i].bid, account)

    return JsonResponse({"status": "success", "message": "File moved successfully"}, status=200)

def bookmark_rename(request, bid):
    """
    rename bookmark
    request should be form-data and include:
    - new_name: the new name of the file
    """
    if request.method == 'GET':
        return JsonResponse({"status": "error", "message": "GET method not allowed"}, status=405)

    ensure_cookie(request)

    account = request.session.get('username', 'admin')
    if account == 'admin':
        return JsonResponse({"status": "error", "message": "admin can't rename folder"}, status=400)
    
    # get file info
    try:
        bookmark = Bookmarks.objects.get(bid=bid, account=account)
    except Bookmarks.DoesNotExist:
        return JsonResponse({"status": "error", "message": "File not found"}, status=404)
    
    # check if the file is a root
    if bookmark.file_type == 'root':
        return JsonResponse({"status": "error", "message": "Can't rename root"}, status=400)
    
    # get new name
    data = json.loads(request.body)
    new_name = data.get("new_name")
    if new_name is None:
        return JsonResponse({"status": "error", "message": f"Invalid name {new_name}"}, status=400)
    
    # update database
    bookmark.name = new_name
    bookmark.save()

    # update google drive
    if bookmark.file_type != 'group' and bookmark.file_type != 'folder':
        provider = Provider.objects.get(account=account, provider_account=bookmark.space_providers[0])
        access_token = provider.access_token
        new_name_pathobj = Path(new_name)
        google_drive_opt.rename_file(
            access_token,
            bookmark.google_id,
            new_name_pathobj.stem + f'-{secrets.token_hex(16)}' + new_name_pathobj.suffix
        )
    
    return JsonResponse({"status": "success", "message": "File renamed successfully"}, status=200)

def bookmark_new_folder(request):
    """
    create new folder
    request should be form-data and include:
    - new_folder: the new folder item to upload
        {
            id,
            name,
            url,
            img,
            tags,
            hidden,
            metadata: {
                last_modified,
                file_type,
                used_size,
            },
        }
    - parent_id: the parent bid of the file
    """
    if request.method == 'GET':
        return JsonResponse({"status": "error", "message": "GET method not allowed"}, status=405)

    ensure_cookie(request)

    account = request.session.get('username', 'admin')
    if account == 'admin':
        return JsonResponse({"status": "error", "message": "admin can't create folder"}, status=400)

    request_data = json.loads(request.body)
    new_folder_json = request_data.get("new_folder")
    parent_id = request_data.get("parent_id")

    if parent_id is None:
        return JsonResponse({"status": "error", "message": "Can't create root folder"}, status=400)
    
    file_type = new_folder_json['metadata']['file_type']
    if file_type != 'folder' and file_type != 'group':
        return JsonResponse({"status": "error", "message": f"Invalid file_type {file_type}"}, status=400)

    if file_type == 'folder' and parent_id == 0:
        return JsonResponse({"status": "error", "message": "Can't create folder in root"}, status=400)
    if file_type == 'group' and parent_id != 0:
        return JsonResponse({"status": "error", "message": "Group can only be created in root"}, status=400)

    # check if the file is a group
    if file_type == 'group':
        new_folder_json['metadata']['spaceProviders'] = []
        new_folder_json['metadata']['total_size'] = 0
    else:
        new_folder_json['metadata']['spaceProviders'] = None
    new_folder_json['metadata']['used_size'] = 0

    # adjust tree structure
    new_folder = Bookmarks(
        account=User.objects.get(account=account),
        bid=new_folder_json['id'],
        url="#",
        img="folder.png" if file_type == 'folder' else "group.png",
        name=new_folder_json['name'],
        tags=new_folder_json['tags'],
        hidden=new_folder_json['hidden'],
        last_modified=new_folder_json['metadata']['last_modified'],
        file_type=file_type,
        used_size=new_folder_json['metadata']['used_size'],
        space_providers=new_folder_json['metadata']['spaceProviders'],
    )

    add_db_bookmarks([new_folder], [parent_id], [account])

    return JsonResponse({"status": "success", "message": "Folder created successfully"}, status=200)
    
def bookmark_delete(request, bid, enforce=False):
    """
    delete bookmark
    if enforce is True, delete the folder and all its children
    """
    if request.method == 'GET':
        return JsonResponse({"status": "error", "message": "GET method not allowed"}, status=405)

    ensure_cookie(request)

    account = request.session.get('username', 'admin')
    if account == 'admin':
        return JsonResponse({"status": "error", "message": "admin can't delete folder"}, status=400)
    
    # get file info
    try:
        bookmark = Bookmarks.objects.get(bid=bid, account=account)
    except Bookmarks.DoesNotExist:
        return JsonResponse({"status": "error", "message": "File not found"}, status=404)
    
    # check if the file is a root
    if bookmark.file_type == 'root':
        return JsonResponse({"status": "error", "message": "Can't delete root"}, status=400)
    
    delete_bids = []
    bfs_bid_queue = [bookmark.bid]
    while len(bfs_bid_queue) > 0:
        current_bid = bfs_bid_queue.pop(0)
        delete_bids.append(current_bid)
        children = TreeStructure.objects.filter(account=account, parent_id=current_bid).values_list('bid', flat=True)
        bfs_bid_queue.extend(children)

    if len(delete_bids) > 2 and not enforce:
        return JsonResponse({"status": "error", "message": "Can't delete multiple files at once"}, status=400)
    
    delete_bookmarks = Bookmarks.objects.filter(bid__in=delete_bids, account=account)
    delete_files = delete_bookmarks.exclude(file_type__in=['group', 'folder'])
    delete_folders = delete_bookmarks.filter(file_type__in=['group', 'folder'])

    # remove from google drive
    for i, delete_file in enumerate(delete_files):
        provider = Provider.objects.get(account=account, provider_account=delete_file.space_providers[0])
        access_token = provider.access_token
        try:
            google_drive_opt.delete_file(
                access_token,
                delete_file.google_id
            )
        except google_drive_opt.ResponseError as e:
            return JsonResponse({"status": "error", "message": f"Error: {e}"}, status=e.response.status_code)
        except Exception as e:
            raise e
    
    # remove from database
    for i, delete_file in enumerate(delete_files):
        delete_db_file(delete_file.bid, account)
    for i, delete_folder in enumerate(delete_folders):
        delete_db_folder(delete_folder.bid, account)

    return JsonResponse({"status": "success", "message": "File deleted successfully"}, status=200)
