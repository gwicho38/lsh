import requests
from openai import OpenAI

client = OpenAI(api_key=os.environ.get('OPEN_AI_KEY'))
import click
import os

# Replace with your OpenAI API key

def get_file_content(owner, repo, branch, path):
    # GitHub API URL for the file contents
    url = f'https://api.github.com/repos/{owner}/{repo}/contents/{path}?ref={branch}'

    # Make the API request
    token = os.environ.get('GITHUB_API_KEY') # Replace with your GitHub token
    headers = {'Authorization': f'token {token}'}

    # Send the GET request
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.text

def analyze_file_change(base_content, target_content):
    response = client.completions.create(engine="davinci-codex",
    prompt=f"Base content:\n{base_content}\n\nTarget content:\n{target_content}\n\nAnalyze how the changes in this file differ from the base version, provide context, and suggest how to resolve any conflicts.",
    max_tokens=500)
    analysis = response.choices[0].text.strip()
    return analysis

@click.command()
@click.argument('repo_url')
@click.argument('base_branch')
@click.argument('target_branch')
@click.argument('filename')
def process_pr(repo_url, base_branch, target_branch, filename):
    try:
        # Extract owner and repo from URL
        parts = repo_url.split('/')
        owner = parts[3]
        repo = parts[4]

        # Get the file content from both branches
        base_content = get_file_content(owner, repo, base_branch, filename)
        target_content = get_file_content(owner, repo, target_branch, filename)

        # Analyze the file changes
        analysis = analyze_file_change(base_content, target_content)

        print(f"File: {filename}")
        print(f"Analysis: {analysis}")

    except ValueError as e:
        print(f"Error: {e}")
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")

@click.group()
def repo():
    pass

repo.add_command(process_pr)

if __name__ == "__main__":
    process_pr()
