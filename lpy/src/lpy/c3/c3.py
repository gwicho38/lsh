import click
from .api import write_content, delete_content
from .watch import watch
from .maven import maven
from urllib.request import urlopen

TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzUxMiJ9.eyJhcHAiOiJna2V2OGMzYXBwcy1ibGl0enRlc3QtYXJ0aWZhY3RodWJzZXJ2aWNlIiwiaXNzIjoiYzMuYWkiLCJncm91cHMiOlsiQzMuQXBwQWRtaW4iXSwic2lkIjoxLCJhdWQiOiJjMy5haSIsImlkcCI6IiIsImMzZ3JvdXBzIjpbIkMzLkFwcEFkbWluIl0sImlkcGdyb3VwcyI6IntcIk9pZGNJZHBDb25maWc6OmdrZXY4YzNhcHBzLmMzLWUuY29tXCI6W1wiZ2tldjhjM2FwcHMuYzMtZS5jb20vQzMuU3R1ZGlvVXNlclwiXX0iLCJzc2lkeCI6IiIsIm5hbWUiOiIzMWNmNGZlZThjYWExYTZlMzAxYmQ3OTNkNTUzODUzYmM2NzYxM2RkY2Q5MjJiNWNkNTg1NzIwZDMyN2U2ZjEzIiwiYWN0aW9uaWQiOiI4MzQyLjU3ODU2MTU3MiIsImlkIjoiMzFjZjRmZWU4Y2FhMWE2ZTMwMWJkNzkzZDU1Mzg1M2JjNjc2MTNkZGNkOTIyYjVjZDU4NTcyMGQzMjdlNmYxMyIsImV4cCI6MTcxODc2MjA0NzAwMCwiZW1haWwiOiJsdWlzLmZlcm5hbmRlei1kZS1sYS12YXJhQGMzLmFpIn0.ZxMMXeB355zbAnJ-0VjZGVaUwrsIroa0fA05PU8XWzO95qVXdbsN4lwnBS8BshAOG8vTqPg-fm_49D_jDqKc3k7M89-uekENmLjy6-lwF1Mn2BQDIpOiybYR4NAHsmc-6pmcMlWAD3gKeDykwpeLjjHXYHPTtG_Lr21ND9Sy_0hFwPdNYrK6aavObA2wHc2rGYAFgHxcN8iOtdiAJgEYgwzeOTYnyX2WZ0Cnv3m10LZQX68HeD8iW01TF_BXioO-GHgKZECjRLHXHN5JkFJ4ZO9d-ScuUNn7odffJ8_lwZOer61FEd_yBNB3gztaQlUIcpcRIEKLGsR3Y_Pxj5X-Rw'

# v8 version of get_c3
def get_c3(url: str, tenant: str, tag: str, auth: str):
    from urllib.request import urlopen
    src = urlopen(url + '/remote/c3.py').read()
    exec_scope = {}
    exec(src, exec_scope)  # pylint: disable=exec-used
    return exec_scope["get_c3"](url=url, authz=auth)

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
    
def download(c3_ctx, artifact_id):
    content_location = c3_ctx.ArtifactHubService.make(artifact_id).get("this").content.contentLocation
    file_url = C3File.make(content_location).apiEndpoint("GET", True)
    download_name = f"{artifact['name']}{artifact['semanticVersion']}.zip"

    # Download the file
    response = requests.get(file_url, stream=True)
    with open(download_name, 'wb') as file:
        shutil.copyfileobj(response.raw, file)
    del response

    print(f"Downloaded {download_name}")

@click.command(name="get-build")
def get_pkg_build():
    """Get complete build for {package_name}"""
    # https://gkev8c3apps.c3-e.com/blitztest/artifacthubservice/static/console/index.html
    # https://gkev8c3apps.c3-e.com/blitztest/studio/branches/github-c3-e-c3fed-guru-cornea--develop/135
    _c3 = get_c3('https://gkev8c3apps.c3-e.com/blitztest/artifacthubservice', 'blitztest', 'artifacthubservice', TOKEN)
    package_name = 'guruSearchUI'
    sem_ver = '8.3.2+develop.135.c0d8a7ee8c8cb63810800e93f544275105ab580c'
    _filter = f"name == \"guruSearchUI\" && semanticVersion == \"8.3.2+develop.135.c0d8a7ee8c8cb63810800e93f544275105ab580c\""
    target_build = _c3.ArtifactHubService.Artifact.fetch(spec={"filter": _filter, "order": "descending(meta.updated)", "limit": 1}).objs[0].get("this")
    print(target_build)
    artifact = _c3.ArtifactHub.artifactForVersion(package_name, sem_ver)
    content_location = _c3.ArtifactHubService.Artifact.make(artifact.id).get().content.contentLocation
    print(content_location)
    

c3.add_command(write)
c3.add_command(delete)
c3.add_command(watch)

if __name__ == "__main__":
    c3()
