from django.http import JsonResponse, HttpResponse, HttpResponseRedirect, HttpResponseBadRequest
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.core.cache import cache
from django.core.mail import send_mail
from django.urls import reverse
from django.http import HttpResponse
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
import os
import re

logger = logging.getLogger(__name__)

temp_dir = Path(tempfile.gettempdir())  # in docker, this is ~/tmp
if not temp_dir.exists():
    temp_dir.mkdir(parents=True, exist_ok=True)

password_reset_tokens = {}

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

def upload_file(request):
    """
    API for uploading files.
    request should be form-data and include:
    - file: the file to upload
    - new_bookmark: the bookmark item to upload
    - parent_id: the parent bookmark id

    returns:
    {
        id: {...new bookmark data...},
    }
    """
    if request.method == "POST":
        file = request.FILES.get("file")
        new_bookmark = request.POST.get("new_bookmark")
        parent_id = request.POST.get("parent_id")
        
        if file:
            with open(temp_dir / file.name, "wb+") as destination:
                for chunk in file.chunks():
                    destination.write(chunk)

            # TODO: check new_bookmark and parent_id
            new_bookmark = json.loads(new_bookmark)
            
            return JsonResponse({"status": "success", "message": "File uploaded successfully"}, status=200)
        else:
            return JsonResponse({"status": "error", "message": "No file uploaded"}, status=400)

    else:
        return JsonResponse({"status": "error", "message": "Invalid request method"}, status=405)

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

# # XSS Protection - Sanitize function for strings
# def sanitize_string(value):
#     """
#     Sanitizes a string value to prevent XSS attacks.
#     Escapes HTML special characters and removes script tags.
#     """
#     if value is None:
#         return None
#     if not isinstance(value, str):
#         return value
    
#     # Escape HTML special characters
#     value = html.escape(value)
#     # Remove script and event handler patterns
#     value = re.sub(r'<script.*?>.*?</script>', '', value, flags=re.IGNORECASE | re.DOTALL)
#     value = re.sub(r'javascript:', '', value, flags=re.IGNORECASE)
#     value = re.sub(r'on\w+\s*=', '', value, flags=re.IGNORECASE)
    
#     return value
# # XSS Protection - Sanitize function for data structures
# def sanitize_data(data):
#     """
#     Recursively sanitizes data structures to prevent XSS attacks.
#     Handles strings, lists, and dictionaries.
#     """
#     if isinstance(data, str):
#         return sanitize_string(data)
#     elif isinstance(data, list):
#         return [sanitize_data(item) for item in data]
#     elif isinstance(data, dict):
#         return {k: sanitize_data(v) for k, v in data.items()}
#     else:
#         return data

# # validate bookmark data
# def validate_bookmark_request(data, require_all_fields=False):
#     required_fields = {
#         'time': str,
#         'parent_id': int,
#         'children_id': list,
#         'url': str,
#         'img': str,
#         'name': str,
#         'tags': list,
#         'starred': bool,
#         'hidden': bool
#     }
#     length_limits = {
#         'url': 2048,
#         'img': 2048,
#         'name': 255,
#         'tags': 50,  # 每個標籤的最大長度
#         'tags_count': 10  # 標籤數量上限
#     }
#     if 'url' in data and len(data['url']) > length_limits['url']:
#         return False, JsonResponse({'status': 'error', 'message': f'URL長度不能超過{length_limits["url"]}個字符'}, status=400)
    
#     if 'img' in data and len(data['img']) > length_limits['img']:
#         return False, JsonResponse({'status': 'error', 'message': f'圖片URL長度不能超過{length_limits["img"]}個字符'}, status=400)
    
#     if 'name' in data and len(data['name']) > length_limits['name']:
#         return False, JsonResponse({'status': 'error', 'message': f'名稱長度不能超過{length_limits["name"]}個字符'}, status=400)
    
#     if 'tags' in data:
#         if len(data['tags']) > length_limits['tags_count']:
#             return False, JsonResponse({'status': 'error', 'message': f'標籤數量不能超過{length_limits["tags_count"]}個'}, status=400)
#         for tag in data['tags']:
#             if len(tag) > length_limits['tags']:
#                 return False, JsonResponse({'status': 'error', 'message': f'每個標籤長度不能超過{length_limits["tags"]}個字符'}, status=400)

#     validated = {}

#     unknown_keys = set(data.keys()) - set(required_fields.keys())
#     if unknown_keys:
#         return False, JsonResponse({'status': 'error', 'message': f'Unknown fields: {list(unknown_keys)}'}, status=400)

#     for key, expected_type in required_fields.items():
#         value = data.get(key)

#         if require_all_fields and value is None:
#             return False, JsonResponse({'status': 'error', 'message': f'Missing field: {key}'}, status=400)

#         if value is not None:
#             if expected_type == int and not isinstance(value, int):
#                 return False, JsonResponse({'status': 'error', 'message': f'{key} must be an integer'}, status=400)
#             if expected_type == str and not isinstance(value, str):
#                 return False, JsonResponse({'status': 'error', 'message': f'{key} must be a string'}, status=400)
#             if expected_type == bool and not isinstance(value, bool):
#                 return False, JsonResponse({'status': 'error', 'message': f'{key} must be a boolean'}, status=400)
#             if expected_type == list and not isinstance(value, list):
#                 return False, JsonResponse({'status': 'error', 'message': f'{key} must be a list'}, status=400)

#             if key == 'tags':
#                 if not all(isinstance(tag, str) for tag in value):
#                     return False, JsonResponse({'status': 'error', 'message': 'Each tag must be a string'}, status=400)
#             if key == 'children_id':
#                 if not all(isinstance(cid, int) for cid in value):
#                     return False, JsonResponse({'status': 'error', 'message': 'Each children_id must be an integer'}, status=400)
#             validated[key] = value
#         else:
#             validated[key] = None

#     return True, validated

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
    initialize database
    User
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
    provider, created = Provider.objects.update_or_create(
        account=user,
        defaults={
            'provider_account': email,
            'provider_name': name,
            'provider_picture': picture,
            'access_token': access_token
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
            'hidden': True,
            'last_modified': datetime.now().isoformat(),
            'file_type': "group",
            'space_providers': [provider.provider_account],
            'used_size': 0,
        }
    )
    tree, ts_created = TreeStructure.objects.update_or_create(
        account=user,
        bid=root,
        defaults={'parent_id': None, 'children_id': [group.bid]}
    )
    gtree, ts_created = TreeStructure.objects.update_or_create(
        account=user,
        bid=group,
        defaults={'parent_id': 0, 'children_id': []}
    )

    request.session['name'] = name
    request.session['username'] = email
    request.session['picture'] = picture
    request.session['is_authenticated'] = False
    request.session.set_expiry(60 * 60 * 24 * 7)
    return render(request, 'password.html')

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
                    used_size: 2600880,
                    
                    // only for file_type = "group"
                    total_size: 10000000,
                    spaceProviders: [
                        {
                        name: "a@example.com",
                        picture: "",
                        total_size: 10000000,
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
    
    # 如果 session 過期或未登入（從註冊中跳出），則清除 session
    is_authenticated = request.session.get('is_authenticated', False)
    if not is_authenticated:
        request.session.flush()
    
    account = request.session.get('username', 'admin')
    name = request.session.get('name', 'default')
    picture = request.session.get('picture', '')

    user = User.objects.get(account=account)
    bookmarks = user.bookmarks.all()
    tree_qs   = user.tree_structure.all()

    # TODO: ensure data consistency between database and google drive

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
            for provider in provider_objs:
                idToBookmark[bid]['metadata']['spaceProviders'] = [
                    {
                        'name': provider.provider_account,
                        'picture': provider.provider_picture,
                        'total_size': 10000000,  # TODO: get real total size from provider
                    }
                ]
                idToBookmark[bid]['metadata']['total_size'] += 10000000

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

