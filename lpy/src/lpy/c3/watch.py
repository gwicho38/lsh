import click
import os
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from .config import PACKAGES_TO_SYNC, PATH_TO_PACKAGE_REPO, APPURL
from .api import write_content, delete_content

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
          print(event)
          # print(event.src_path)
            # write_content(event.src_path)
        elif event.event_type == 'deleted':
          print(event.src_path)
            # delete_content(event.src_path)

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
