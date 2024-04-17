import typer
import IPython
from lpy.c3 import load_c3

GLOBALS = {
   "c3": {},
    "app": {}
}
c3 = {}
app = {}

def set_global(global_name: str, global_value: any):
    global GLOBALS
    GLOBALS[global_name] = global_value

def get_global(global_name: str):
    global GLOBALS
    return GLOBALS[global_name]


TOKEN = "REDACTED"

url = "http://localhost:8888/c3/c3"

def main() -> None:
    set_global("app", typer.Typer())
    set_global("c3", load_c3(url, TOKEN))
    c3 = get_global("c3")
    IPython.embed()

if __name__ == "__main__":
    print("main.py")
