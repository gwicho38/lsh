import re
import os
import shutil
import click
import sys
from fnmatch import fnmatch

@click.group()
def vsce():
    pass

def parse_gitignore(gitignore_path):
    """Parse a .gitignore file and return a list of patterns."""
    patterns = []
    with open(gitignore_path, 'r') as file:
        for line in file:
            line = line.strip()
            if line and not line.startswith('#'):
                patterns.append(line)
    return patterns

def is_ignored(path, patterns):
    """Check if a path matches any of the patterns in the .gitignore file."""
    for pattern in patterns:
        if fnmatch(path, pattern) or fnmatch(path, f'*/{pattern}'):
            return True
    return False


def print_directory_tree(root_dir):
    """Print the directory tree starting from the root directory."""
    with os.scandir(root_dir) as entries:
        for entry in entries:
            if entry.is_dir():
                print(f"{entry.name}/")

@click.command()
def clean():
    root_dir: str = "/Users/lefv/c3/"
    gitignore_path: str = "/Users/lefv/repos/lsh/lpy/.gitignore"
    
    print(f"Cleaning directories and files under: {root_dir}")
    
    # Print the directory tree before cleaning
    print("\nDirectory tree before cleaning:")
    print_directory_tree(root_dir)
    
    # Regex pattern to match directories under /Users/lefv/.vscode/extensions/c3ai.c3-ai-dx-v8-<version>
    regex = re.compile(r'\/Users\/lefv\/\.vscode\/extensions\/c3ai\.c3-ai-dx-v8-\d+\.\d+\.\d+\/.*')
    
    for dirpath, dirnames, filenames in os.walk(root_dir, followlinks=True):
        # Check if directory matches the regex pattern
        if regex.match(dirpath):
            print(f"Matched directory: {dirpath}")
        
        # Remove directories named "gen" or ".vs-cache"
        for dirname in dirnames:
            if dirname in ["gen", ".vs-cache"]:
                dir_to_delete = os.path.join(dirpath, dirname)
                print(f"Deleting directory: {dir_to_delete}")
                shutil.rmtree(dir_to_delete, ignore_errors=True)
        
        # Remove files named ".fingerprints.txt"
        for filename in filenames:
            if filename == ".fingerprints.txt":
                file_to_delete = os.path.join(dirpath, filename)
                print(f"Deleting file: {file_to_delete}")
                os.remove(file_to_delete)
    
    # Specific directory to remove
    # Generalize the removal of .uicli directories using the regex pattern
    for dirpath, dirnames, _ in os.walk("/Users/lefv/.vscode/extensions"):
        for dirname in dirnames:
            if re.match(r'c3ai\.c3-ai-dx-v8-\d+\.\d+\.\d+', dirname):
                ui_cli_home = os.path.join(dirpath, dirname, '.uicli')
                if os.path.exists(ui_cli_home):
                    print(f"Deleting directory: {ui_cli_home}")
                    shutil.rmtree(ui_cli_home, ignore_errors=True)

    # Print the directory tree after cleaning
    print("\nDirectory tree after cleaning:")
    print_directory_tree(root_dir)

if __name__ == "__main__":
    vsce.add_command(clean)
