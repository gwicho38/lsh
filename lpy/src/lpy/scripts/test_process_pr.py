import subprocess
import os
import tempfile
import git

# Create a temporary repository for testing
with tempfile.TemporaryDirectory() as temp_repo_path:
    repo = git.Repo.init(temp_repo_path)
    base_branch = 'base'
    target_branch = 'target'

    # Create base branch with initial commit
    base_file_path = os.path.join(temp_repo_path, 'base_file.txt')
    with open(base_file_path, 'w') as f:
        f.write('Initial content in base branch')
    repo.index.add([base_file_path])
    repo.index.commit('Initial commit in base branch')
    repo.git.checkout('-b', base_branch)

    # Create target branch with a different commit
    repo.git.checkout('HEAD', b=target_branch)
    target_file_path = os.path.join(temp_repo_path, 'target_file.txt')
    with open(target_file_path, 'w') as f:
        f.write('Different content in target branch')
    repo.index.add([target_file_path])
    repo.index.commit('Initial commit in target branch')

    # Run the process_pr command
    result = subprocess.run([
        'python', 'lpy/src/lpy/app/main.py', 'process_pr', temp_repo_path, base_branch, target_branch
    ], capture_output=True, text=True)

    # Print the output
    print(result.stdout)
    print(result.stderr)