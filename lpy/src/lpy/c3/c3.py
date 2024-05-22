import click
import subprocess
import typer
import IPython
import os
import click
from ptpython.repl import embed
import hashlib
import base64
# from lpy.config import configure
import click
import requests

@click.group()
def c3(name="c3"):
    pass

# only run this if on local jupyter instance
@click.command(name="write")
def write():
    print('write')

# def load_c3(url, auth):
#     import os
#     """Returns c3 remote type system for python."""
#     from urllib.request import urlopen
#     src = urlopen(os.path.join(url, 'remote/c3.py')).read()
#     exec_scope = {}
#     exec(src, exec_scope)  # pylint: disable=exec-used
#     return exec_scope["get_c3"](url=url, authz=auth)

c3.add_command(write)

## Helpers
IN_MEMORY_FILE_FINGERPRINTS = {}
NO_CHANGE_TO_FILE = -1

def encode_content(path):
    with open(path, 'rb') as file:
        content = file.read()
    fingerprint = hashlib.md5(content).hexdigest()

    if IN_MEMORY_FILE_FINGERPRINTS.get(path) != fingerprint:
        IN_MEMORY_FILE_FINGERPRINTS[path] = fingerprint
        return base64.b64encode(content).decode('utf-8')
    else:
        return NO_CHANGE_TO_FILE
    

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


import click
import os
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class Watcher:
    def __init__(self, directories):
        self.observer = Observer()
        self.directories = directories

    def run(self):
        event_handler = Handler()
        for directory in self.directories:
            self.observer.schedule(event_handler, directory, recursive=True)
        self.observer.start()
        try:
            while True:
                pass
        except KeyboardInterrupt:
            self.observer.stop()
        self.observer.join()

class Handler(FileSystemEventHandler):
    @staticmethod
    def process(event):
        if event.is_directory:
            return
        elif event.event_type == 'created' or event.event_type == 'modified':
            write_content(event.src_path)
        elif event.event_type == 'deleted':
            delete_content(event.src_path)

    def on_created(self, event):
        self.process(event)

    def on_modified(self, event):
        self.process(event)

    def on_deleted(self, event):
        self.process(event)

@click.command()
def watch():
    watch_dirs = [os.path.join(PATH_TO_PACKAGE_REPO, pkg) for pkg in PACKAGES_TO_SYNC]
    watcher = Watcher(watch_dirs)
    click.echo(f"Listening to file updates at: {', '.join(watch_dirs)}")
    watcher.run()
    
@click.command()
@click.argument('path')
def write(path):
    """Write content to C3."""
    write_content(path)
    click.echo(f"Content written for path: {path}")

@click.command()
@click.argument('path')
def delete(path):
    """Delete content from C3."""
    delete_content(path)
    click.echo(f"Content deleted for path: {path}")

c3.add_command(write)
c3.add_command(delete)
c3.add_command(watch)

if __name__ == "__main__":
    print("main")