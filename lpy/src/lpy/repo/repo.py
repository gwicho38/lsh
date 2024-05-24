import git
import difflib
import openai
import click

# Replace with your OpenAI API key
openai.api_key = 'your_openai_api_key_here'

def get_repo(repo_path):
    return git.Repo(repo_path)

def create_pr(base_branch, target_branch, repo):
    base = repo.git.checkout(base_branch)
    target = repo.git.checkout(target_branch)
    pr_branch = f'pr/{base_branch}_to_{target_branch}'
    
    repo.git.checkout('-b', pr_branch)
    repo.git.merge(base_branch)
    
    return pr_branch

def classify_hunks(repo, pr_branch):
    repo.git.checkout(pr_branch)
    diffs = repo.git.diff('HEAD~1', '--unified=0').split('\n')
    
    hunks = []
    for diff in diffs:
        if diff.startswith('@@'):
            hunk_header = diff
        elif diff.startswith('+'):
            hunk = {
                'type': 'addition',
                'content': diff[1:]
            }
            hunks.append(hunk)
        elif diff.startswith('-'):
            hunk = {
                'type': 'removal',
                'content': diff[1:]
            }
            hunks.append(hunk)
        elif diff:
            hunk = {
                'type': 'modification',
                'content': diff[1:]
            }
            hunks.append(hunk)
    
    return hunks

def fuzzy_match_hunks(hunks, repo_path):
    repo = get_repo(repo_path)
    matched_hunks = []
    
    for hunk in hunks:
        response = openai.Completion.create(
            engine="davinci-codex",
            prompt=f"Find references to the following hunk in the repository:\n\nHunk: {hunk['content']}\n",
            max_tokens=200
        )
        references = response['choices'][0]['text'].strip()
        matched_hunks.append({
            'hunk': hunk,
            'references': references
        })
    
    return matched_hunks

def find_related_files(hunks, repo_path):
    repo = get_repo(repo_path)
    related_files = set()
    
    for hunk in hunks:
        response = openai.Completion.create(
            engine="davinci-codex",
            prompt=f"Find related files for the following hunk in the repository:\n\nHunk: {hunk['content']}\n",
            max_tokens=200
        )
        files = response['choices'][0]['text'].strip().split('\n')
        related_files.update(files)
    
    return list(related_files)

@click.group(name="repo")
def repo():
    pass

@click.command()
@click.argument('repo_path')
@click.argument('base_branch')
@click.argument('target_branch')
def process_pr(repo_path, base_branch, target_branch):
    repo = get_repo(repo_path)
    pr_branch = create_pr(base_branch, target_branch, repo)
    hunks = classify_hunks(repo, pr_branch)
    matched_hunks = fuzzy_match_hunks(hunks, repo_path)
    related_files = find_related_files(hunks, repo_path)
    
    print("Matched Hunks:")
    for matched in matched_hunks:
        print(f"Hunk: {matched['hunk']['content']}")
        print(f"References: {matched['references']}")
        print()
    
    print("Related Files:")
    for file in related_files:
        print(file)

repo.add_command(process_pr)

if __name__ == "__main__":
    repo()
