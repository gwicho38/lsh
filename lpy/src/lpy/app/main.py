import typer
import IPython
import os
from lpy.c3 import load_c3
# Using os.environ without a default (can raise KeyError if not found)

GLOBALS = {
   "C3": {},
    "APP": {},
    "C3_TOKEN": os.environ['C3_TOKEN'],
    "C3_URL": os.environ['C3_URL']
}

def set_global(global_name: str, global_value: any):
    global GLOBALS
    GLOBALS[global_name] = global_value

def get_global(global_name: str):
    global GLOBALS
    return GLOBALS[global_name]

def main() -> None:
    set_global("APP", typer.Typer())
    set_global("C3", load_c3(url, get_global("C3_TOKEN")))
    c3 = get_global("C3")
    IPython.embed()

if __name__ == "__main__":
    print("main.py")
