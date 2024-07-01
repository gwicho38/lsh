def execute_shell_command(command: str):
    """Execute a shell command and print the output."""
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    if result.stdout:
        print(f"Output:\n{result.stdout}")
    if result.stderr:
        print(f"Error:\n{result.stderr}")
