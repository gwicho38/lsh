import requests
from .config import APPURL, AUTH_TOKEN, PATH_TO_PACKAGE_REPO
from .file import encode_content, NO_CHANGE_TO_FILE

pkg_id = None

def make_post_request(type_name, method, data, on_success=None):
    url = f"{APPURL}/api/8/{type_name}/{method}"
    headers = {
        'Authorization': AUTH_TOKEN,
        'Content-Type': 'application/json'
    }
    response = requests.post(url, json=data, headers=headers)
    if response.status_code == 200 and on_success:
        on_success(response.json())
    return response

def get_metadata_path(path):
    return path[len(PATH_TO_PACKAGE_REPO):]

def get_pkg_id():
    global pkg_id
    if pkg_id:
        return pkg_id

    def handle_response(body):
        global pkg_id
        pkg_id = body

    make_post_request('Pkg', 'inst', ['Pkg'], handle_response)
    return pkg_id

def write_content(path):
    pkg_id = get_pkg_id()
    metadata_path = get_metadata_path(path)
    content = encode_content(path)
    if content == NO_CHANGE_TO_FILE:
        return
    return make_post_request('Pkg', 'writeContent', [pkg_id, metadata_path, {
        'type': 'ContentValue',
        'content': content
    }])

def delete_content(path):
    pkg_id = get_pkg_id()
    metadata_path = get_metadata_path(path)
    return make_post_request('Pkg', 'deleteContent', [pkg_id, metadata_path, True])
