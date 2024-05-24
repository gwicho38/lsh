import click
import subprocess
import typer
import IPython
import os
import click
from ptpython.repl import embed
from lpy.c3 import c3
from lpy.repo import repo


@click.group()
def lpy() -> None:
    pass


@click.group()
def coursera() -> None:
    pass


@click.group()
def lib() -> None:
    pass

@click.command()
def initdb():
    click.echo("Initialized the database")


@click.command()
def dropdb():
    click.echo("Dropped the database")

@click.command()
@click.argument("username")
@click.argument("password")
def connect(username, password):
    click.echo(
        f"Connecting to Coursera with username: {username} and password: {password}"
    )

# Add commands to coursera group
coursera.add_command(initdb)
coursera.add_command(dropdb)
coursera.add_command(connect)

# Add subgroups to lpy group
lpy.add_command(coursera)
lpy.add_command(lib)
lpy.add_command(c3)


@click.group()
def lpy() -> None:
    pass


@click.group()
def coursera() -> None:
    pass


@click.group()
def lib() -> None:
    pass


@click.command()
def initdb():
    click.echo("Initialized the database")


@click.command()
def dropdb():
    click.echo("Dropped the database")


@click.command()
@click.argument("username")
@click.argument("password")
def connect(username, password):
    try:
        result = subprocess.run(
            ["coursera-dl", "-u", username, "-p", password],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        click.echo(result.stdout)
    except subprocess.CalledProcessError as e:
        click.echo(f"Error: {e.stderr}", err=True)

def configure(repl):
    """
    Configures ptpython REPL.
    `repl` is an instance of `ptpython.repl.embed.Repl`.
    """
    # Enable syntax highlighting.
    repl.enable_syntax_highlighting = True
    # Use Vi mode.
    repl.vi_mode = True
    # Show line numbers.
    repl.show_line_numbers = True
    # Enable auto-completion.
    repl.enable_auto_suggest = True
    # Set a custom color scheme.
    repl.use_code_colorscheme('monokai')

    # Additional settings can be configured here.
    # repl.completion_visualisation = CompletionVisualisation.POP_UP
    # repl.show_status_bar = True
    # repl.enable_mouse_support = True
    # repl.confirm_exit = False


@click.command()
def repl():
    """Start an interactive Python REPL using ptpython."""
    banner = "Welcome to the ptpython REPL. Type `exit` or `Ctrl-D` to exit."
    history_filename = '.ptpython_history'
    
    embed(globals=globals(), locals=locals(), history_filename=history_filename)
    
# Add commands to coursera group
coursera.add_command(initdb)
coursera.add_command(dropdb)
coursera.add_command(connect)

# Add subgroups to lpy group
lpy.add_command(coursera)
lpy.add_command(lib)
lpy.add_command(repl)
# print(c3)
lpy.add_command(c3)
lpy.add_command(repo)

GLOBALS = {"C3": {}, "APP": {}, "C3_TOKEN": {}, "C3_URL": {}}


def set_global(global_name: str, global_value: any):
    global GLOBALS
    GLOBALS[global_name] = global_value


def get_global(global_name: str):
    global GLOBALS
    return GLOBALS[global_name]


# def main(interactive: str = "") -> None:
# set_global("C3", load_c3(get_global("C3_URL"), get_global("C3_TOKEN")))
# c3 = get_global("C3")
# IPython.embed()


def main():
    set_global("APP", typer.Typer())
    lpy()


if __name__ == "__main__":
    main()
