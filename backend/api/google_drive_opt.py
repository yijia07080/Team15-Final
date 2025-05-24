from django.conf import settings
import secrets
import requests
from pathlib import Path
import json
import tempfile

TEMP_DIR = Path(tempfile.gettempdir())  # in docker, this is ~/tmp

class ResponseError(Exception):
    def __init__(self, message, response):
        super().__init__(message)
        self.response = response

def check_access_token(access_token):
    # note that if access_token is invalid, error status is 400, not 401
    url = "https://www.googleapis.com/oauth2/v1/tokeninfo"
    params = {
        "access_token": access_token,
    }
    response = requests.get(url, params=params)
    if response.status_code == 200:
        return True
    else:
        raise ResponseError(f"Error: {response.status_code}, {response.text}", response)
        
def refresh_access_token(
        refresh_token, 
        client_id=settings.CLIENT_ID,
        client_secret=settings.CLIENT_SECRET
    ):
    url = "https://oauth2.googleapis.com/token"
    body = {
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }

    response = requests.post(url, data=body)
    if response.status_code == 200:
        return response.json().get('access_token')
    else:
        raise ResponseError(f"Error: {response.status_code}, {response.text}", response)

def get_account_size(access_token):
    url = "https://www.googleapis.com/drive/v3/about"
    headers = {
        "Authorization": f"Bearer {access_token}",
    }
    params = {
        "fields": "storageQuota",
    }

    response = requests.get(url, headers=headers, params=params)
    if response.status_code == 200:
        storage_quota = response.json().get('storageQuota', {})
        total_size = float(storage_quota.get('limit', 0))
        used_size = float(storage_quota.get('usage', 0))
        return total_size, used_size
    else:
        raise ResponseError(f"Error: {response.status_code}, {response.text}", response)

def get_file_list(access_token, folder_id, trashed=False):
    '''
    if trashed = True, return will include trashed files
    return file list {
        "id": ...,
        "name": ...,
        "size": ...,
        "mimeType": ..., // if is folder, "application/vnd.google-apps.folder"
    }
    '''

    url = f"https://www.googleapis.com/drive/v3/files"
    headers = {
        "authorization": f"Bearer {access_token}",
    }
    params = {
        "q": f"'{folder_id}' in parents and trashed = {str(trashed).lower()}",
        "fields": "files(id, name, size)",
        "pageSize": 1000
    }

    files_list = []
    while True:
        response = requests.get(url, headers=headers, params=params)
        response_json = response.json()
        files_list.extend(response_json.get('files', []))

        if 'nextPageToken' not in response_json:
            break
        params['pageToken'] = response_json['nextPageToken']

    if response.status_code == 200:
        return files_list
    else:
        raise ResponseError(f"Error: {response.status_code}, {response.text}", response)

def create_folder(access_token, folder_name):
    '''
    retrun folder {
        "id": ...,
        "name": ...,
        "size": ...,
    }
    '''
    url = "https://www.googleapis.com/drive/v3/files"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    body = {
        "name": folder_name,
        "mimeType": "application/vnd.google-apps.folder"
    }

    response = requests.post(url, headers=headers, json=body)

    if response.status_code == 200:
        return response.json()
    else:
        raise ResponseError(f"Error: {response.status_code}, {response.text}", response)
    
def upload_file(access_token, file_path, folder_id):
    '''
    return file list {
        "id": ...,
        "name": ...,
        "size": ...,
        "mimeType": ...,
    }
    '''
    if type(file_path) is str:
        file_path = Path(file_path)
    if not file_path.exists():
        if settings.DEBUG:
            raise FileNotFoundError(f"File not found: {file_path}")
        return None

    url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"
    headers = {
        "Authorization": f"Bearer {access_token}",
    }
    metadata = {
        "name": Path(file_path).name,
        "parents": [folder_id]
    }
    files = {
        "metadata": ("metadata", json.dumps(metadata), "application/json"),
        "file": open(file_path, "rb")
    }

    response = requests.post(url, headers=headers, files=files)
    if response.status_code == 200:
        return response.json()
    else:
        raise ResponseError(f"Error: {response.status_code}, {response.text}", response)
    
def download_file(access_token, file_id, folder):
    '''
    return file path if success
    '''
    if type(folder) is str:
        folder = Path(folder)
    if not folder.exists():
        raise FileNotFoundError(f"Folder not found: {folder}")

    url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media"
    headers = {
        "Authorization": f"Bearer {access_token}",
    }
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        file_name = response.headers.get('Content-Disposition')
        path = folder / file_name
        if path.exists():
            return path
        
        with open(path, 'wb') as f:
            f.write(response.content)
        return path
    else:
        raise ResponseError(f"Error: {response.status_code}, {response.text}", response)

def delete_file(access_token, file_id):
    url = f"https://www.googleapis.com/drive/v3/files/{file_id}"
    headers = {
        "Authorization": f"Bearer {access_token}",
    }

    response = requests.delete(url, headers=headers)
    if response.status_code == 204:
        return True
    else:
        raise ResponseError(f"Error: {response.status_code}, {response.text}", response)
    
def rename_file(access_token, file_id, new_name):
    url = f"https://www.googleapis.com/drive/v3/files/{file_id}"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    body = {
        "name": new_name
    }
    response = requests.patch(url, headers=headers, json=body)

    if response.status_code == 200:
        return response.json()
    else:
        raise ResponseError(f"Error: {response.status_code}, {response.text}", response)
    
def move_file_to_account(
    from_access_token, 
    to_access_token, 
    from_file_id,
    to_folder_id
):
    '''
    Move file from one account to another
    return file (new position) {
        "id": ...,
        "name": ...,
        "size": ...,
        "mimeType": ...,
    }
    '''
    # Download the file from the source account
    try:
        file_path = download_file(from_access_token, from_file_id, TEMP_DIR)

        # Upload the file to the destination account
        uploaded_file = upload_file(to_access_token, file_path, to_folder_id)

        # delete the file from the source account
        delete_file(from_access_token, from_file_id)
    except Exception as e:
        raise e

    return uploaded_file

def copy_file_to_account(
    from_access_token, 
    to_access_token, 
    from_file_id,
    to_folder_id
):
    '''
    Copy file from one account to another
    return file (new position) {
        "id": ...,
        "name": ...,
        "size": ...,
        "mimeType": ...,
    }
    '''
    # Download the file from the source account
    try:
        file_path = download_file(from_access_token, from_file_id, TEMP_DIR)

        # Upload the file to the destination account
        uploaded_file = upload_file(to_access_token, file_path, to_folder_id)
    except Exception as e:
        raise e

    return uploaded_file