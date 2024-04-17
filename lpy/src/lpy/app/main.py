import typer
import IPython
from lpy.c3 import load_c3

c3 = {}
app = {}

def set_global(global_name: str, global_value: any):
    global global_name
    global_name = global_value

def get_global(global_name: str):
    global global_name
    return global_name


TOKEN = "REDACTED"

url = "http://localhost:8888/c3/c3"

def main() -> None:
    set_global("app", typer.Typer())
    set_global("c3", load_c3(url, TOKEN))
    IPython.embed()

if __name__ == "__main__":
    print("main.py")
