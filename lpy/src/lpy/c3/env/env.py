import click
import os
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
# from ..config import PACKAGES_TO_SYNC, PATH_TO_PACKAGE_REPO, APPURL
# from .api import write_content, delete_content