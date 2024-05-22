import click
from .api import write_content, delete_content
from .watch import watch

@click.group(name="c3")
def c3():
    """C3 commands."""
    pass

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