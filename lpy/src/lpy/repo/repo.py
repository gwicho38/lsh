from openai import OpenAI
import click
import os
import time
import requests
from threading import Thread
from queue import Queue
from openai import OpenAI

# Replace with your OpenAI API key

# GitHub API token (replace with your token or use environment variable)
github_api_token = os.getenv('GITHUB_API_TOKEN', 'GITHUB_API_KEY')
OPEN_AI_KEY = os.environ.get('OPEN_AI_KEY')
openai_client = OpenAI(
    # This is the default and can be omitted
    api_key=OPEN_AI_KEY
)

# Function to display a loading indicator
def loading_indicator(message, queue):
    while queue.empty():
        for char in '|/-\\':
            print(f'\r{message} {char}', end='', flush=True)
            time.sleep(0.1)
    print('\r' + ' ' * len(message) + '\r', end='', flush=True)

def get_pr_details(pr_url):
    pr_url = "https://api.github.com/repos/c3-e/c3generativeAi/pulls/3615"
    github_api_token = "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"
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {github_api_token}",
        "X-GitHub-Api-Version": "2022-11-28"
    }

    response = requests.get(pr_url, headers=headers)

    if response.status_code == 200:
        pr_details = response.json()
        base_branch = pr_details['base']['ref']
        print(base_branch)
        target_branch = pr_details['head']['ref']
        print(target_branch)
        repo_url = pr_details['base']['repo']['html_url']
        print(repo_url)

        return repo_url, base_branch, target_branch
    else:
        raise ValueError(f"Failed to retrieve pull request details from {pr_url}.")

def get_file_content(repo_url, branch, filename):
    repo_path = repo_url.replace("https://github.com/", "")
    github_api_token = "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"
    api_url = f"https://api.github.com/repos/{repo_path}/contents/{filename}?ref={branch}"
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {github_api_token}",
        "X-GitHub-Api-Version": "2022-11-28"
    }

    response = requests.get(api_url, headers=headers)
    if response.status_code == 200:
        file_content = response.json()['content']
        if file_content:
            import base64
            return base64.b64decode(file_content).decode('utf-8')
    else:
        raise ValueError(f"File {filename} not found in branch {branch}.")

def analyze_file_change(base_content, target_content):
    # response = openai_client.completions.create(engine="davinci-codex",
    # prompt=f"Base content:\n{base_content}\n\nTarget content:\n{target_content}\n\nAnalyze how the changes in this file differ from the base version, provide context, and suggest how to resolve any conflicts.",
    # max_tokens=500)

    messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": f"Base content:\n{base_content}"},
        {"role": "user", "content": f"Target content:\n{target_content}"},
        {"role": "user", "content": "Analyze how the changes in this file differ from the base version, provide context, and suggest how to resolve any conflicts."}
    ]
    response = openai_client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=messages,
        max_tokens=500
    )
    # Extract the text from the response
    analysis = response.choices[0].message.content.strip()
    return analysis

@click.group()
def repo():
    """A tool for analyzing pull requests."""
    pass

@repo.group()
def pr():
    """Commands for pull request operations."""
    pass

@pr.command(help="Compare a file between two branches and analyze the changes.",
            epilog="Example usage:\n\n"
                   "  python analyze_pr.py pr compare 'https://api.github.com/repos/c3-e/c3generativeAi/pulls/3615' genai/genAiBase/config/Genai.Agent.Config/QueryOrchestrator_default.json")
@click.argument('pr_url')
@click.argument('filename')
def compare(pr_url, filename):
    queue = Queue()
    # filename = ""

    try:
        # Start loading indicator for PR details retrieval
        # queue = Queue()
        # thread = Thread(target=loading_indicator, args=("Retrieving PR details...", queue))
        # thread.start()

        # Get PR details
        repo_url, base_branch, target_branch = get_pr_details(pr_url)
        # queue.put("done")  # Stop loading indicator
        # thread.join()

        # Start loading indicator for file content retrieval
        # queue = Queue()
        # thread = Thread(target=loading_indicator, args=("Retrieving file content...", queue))
        # thread.start()

        # Get the file content from both branches
        base_content = get_file_content(repo_url, base_branch, filename)
        print(base_content)
        target_content = get_file_content(repo_url, target_branch, filename)
        print(target_content)
        # queue.put("done")  # Stop loading indicator
        # thread.join()

        # Start loading indicator for analysis
        # queue = Queue()
        # thread = Thread(target=loading_indicator, args=("Analyzing file changes...", queue))
        # thread.start()

        # Analyze the file changes
        analysis = analyze_file_change(base_content, target_content)
        # queue.put("done")  # Stop loading indicator
        # thread.join()

        print(f"File: {filename}")
        print(f"Analysis: {analysis}")

    except ValueError as e:
        print(f"Error: {e}")
    except requests.exceptions.RequestException as e:
        print(f"API request failed: {e}")

if __name__ == "__main__":
    repo()
