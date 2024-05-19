import typer
import IPython
import os
import click
from lpy.c3 import load_c3

GLOBALS = {
    "C3": {},
    "APP": {},
    "C3_TOKEN": {},
    "C3_URL": {}
}

def set_global(global_name: str, global_value: any):
    global GLOBALS
    GLOBALS[global_name] = global_value

def get_global(global_name: str):
    global GLOBALS
    return GLOBALS[global_name]

@click.command(name="lpy")
@click.option("--interactive", "-i", required=False, help="launch an interactive shell")
def main(interactive: str = "") -> None:
    set_global("APP", typer.Typer())
    # set_global("C3", load_c3(get_global("C3_URL"), get_global("C3_TOKEN")))
    # c3 = get_global("C3")
    # IPython.embed()

if __name__ == "__main__":
    print("main.py")
