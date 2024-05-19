import os
import subprocess
import click
import requests
from requests.auth import HTTPBasicAuth

def convert_markdown_to_html(input_file, output_file):
    """
    Convert a markdown file to an HTML file using Pandoc.
    """
    command = ['pandoc', input_file, '-o', output_file]
    try:
        subprocess.run(command, check=True)
        click.echo(f"Converted {input_file} to {output_file}")
    except subprocess.CalledProcessError as e:
        click.echo(f"Error converting {input_file} to HTML: {e}")

def upload_to_confluence(base_url, auth, parent_page_id, title, content):
    """
    Upload HTML content to Confluence.
    """
    url = f"{base_url}/rest/api/content/"
    headers = {
        'Content-Type': 'application/json'
    }
    data = {
        "type": "page",
        "title": title,
        "ancestors": [{"id": parent_page_id}],
        "space": {"key": "YOUR_SPACE_KEY"},  # Replace with your Confluence space key
        "body": {
            "storage": {
                "value": content,
                "representation": "storage"
            }
        }
    }
    response = requests.post(url, json=data, headers=headers, auth=auth)
    if response.status_code == 200:
        click.echo(f"Successfully uploaded page '{title}' to Confluence.")
    else:
        click.echo(f"Failed to upload page '{title}' to Confluence: {response.content}")

def process_directory(directory, base_url, auth, parent_page_id):
    """
    Recursively process a directory, converting all Markdown files to HTML
    and uploading them to Confluence.
    """
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.md'):
                input_file = os.path.join(root, file)
                output_file = input_file
                # output_file = os.path.splitext(input_file)[0] + '.html'
                # convert_markdown_to_html(input_file, output_file)
                with open(output_file, 'r') as f:
                    content = f.read()
                title = os.path.splitext(file)[0]
                upload_to_confluence(base_url, auth, parent_page_id, title, content)

@click.command()
@click.argument('directory')
@click.option('--base-url', default="https://c3energy.atlassian.net", prompt='Confluence Base URL', help='The base URL of your Confluence instance.')
@click.option('--username', default=os.environ['CONFLUENCE_USERNAME'], prompt='Confluence Username', help='Your Confluence username.')
@click.option('--token', prompt='Confluence API Token', default=os.environ['CONFLUENCE_API_TOKEN'], hide_input=True, help='Your Confluence API token.')
@click.option('--parent-page-id', default= os.environ['CONFLUENCE_PARENT_ID'], prompt='Parent Page ID', help='The ID of the parent page under which to nest the pages.')
def main(directory=os.environ['CONFLUENCE_LOCAL_ROOT'], 
         base_url=os.environ['CONFLUENCE_BASE_URL'], 
         username=os.environ['CONFLUENCE_USERNAME'], 
         token=os.environ['CONFLUENCE_API_TOKEN'], 
         parent_page_id=os.environ['CONFLUENCE_PARENT_ID']):
    """
    Recursively convert Markdown files to HTML and upload them to Confluence as nested content.
    """
    auth = HTTPBasicAuth(username, token)
    process_directory(directory, base_url, auth, parent_page_id)

if __name__ == '__main__':
    main()
