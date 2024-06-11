from requests import Request, Session
from .config import APPURL, AUTH_TOKEN, PATH_TO_PACKAGE_REPO
from .file import encode_content, NO_CHANGE_TO_FILE
import json
import re

pkg_id = None
s = Session()

def format_prepped_request(prepped, encoding=None):
    # prepped has .method, .path_url, .headers and .body attribute to view the request
    encoding = encoding or requests.utils.get_encoding_from_headers(prepped.headers)
    body = prepped.body.decode(encoding) if encoding else '<binary data>' 
    headers = '\n'.join(['{}: {}'.format(*hv) for hv in prepped.headers.items()])
    return 

def make_post_request(type_name, method, data, on_success=None):
    print("make_post_request")
    print(f"{type_name}, {method}, {data}")
    url = f"{APPURL}/api/8/{type_name}/{method}"
    headers = {
        'Authorization': AUTH_TOKEN,
        'Content-Type': 'application/json'
    }
    req = Request(method='GET', url=url, headers=headers, data=data)
    # prepped = s.prepare_request(req)
    print(str(req));
    # print(f"make_post_request: {url}, {data}, {headers}")
    # request_dump = dump.dump_all(prepared)
    # print(request_dump.decode('utf-8'))
    return
    # response = requests.post(url, json=data, headers=headers)
    # if response.status_code == 200 and on_success:
    #     on_success(response.json())
    # return response

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
    print("write_content")
    if re.search(r'\.\w+$', path) or path.endswith('~'):
        print("Badly formatted file")
        pass
    pkg_id = get_pkg_id()
    metadata_path = get_metadata_path(path)
    content = None
    # with open(path, 'rb') as file:
    #     print(file)
    #     content = file
    print(metadata_path)
    print(content)
    # if content == NO_CHANGE_TO_FILE:
    #     return
    # return make_post_request('Pkg', 'writeContent', [pkg_id, metadata_path, {
    #     'type': 'ContentValue',
    #     'content': content
    # }])

def delete_content(path):
    pkg_id = get_pkg_id()
    metadata_path = get_metadata_path(path)
    return make_post_request('Pkg', 'deleteContent', [pkg_id, metadata_path, True])
