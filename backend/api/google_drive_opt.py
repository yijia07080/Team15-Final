from django.conf import settings
import requests
from pathlib import Path
import json

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
        total_size = storage_quota.get('limit', 0)
        used_size = storage_quota.get('usage', 0)
        return total_size, used_size
    else:
        raise response

def get_file_list(access_token, folder_id):
    '''
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
        "q": f"'{folder_id}' in parents",
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
        raise response

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
        raise response

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
        raise response
    
def delete_file(access_token, file_id):
    url = f"https://www.googleapis.com/drive/v3/files/{file_id}"
    headers = {
        "Authorization": f"Bearer {access_token}",
    }

    response = requests.delete(url, headers=headers)
    if response.status_code == 204:
        return True
    else:
        raise response