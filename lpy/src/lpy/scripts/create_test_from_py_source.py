import os
import re
import subprocess

def camel_to_snake(name):
    """Convert CamelCase to snake_case."""
    name = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', name).lower()

def create_test_files():
    # Run the tree command and capture the output
    result = subprocess.run(['tree', '-P', '*.py', '-f', '--noreport'], capture_output=True, text=True)
    if result.returncode != 0:
        print("Error executing tree command")
        return

    # Split the output into lines and clean up
    lines = result.stdout.split('\n')
    lines = [line.strip() for line in lines if '.py' in line]
    lines = [re.sub(r'[^/]*\./', './', line) for line in lines]  # Remove tree characters

    # Define the content to be written to the new files
    content = '''
# Copyright 2009-2024 C3 AI (www.c3.ai). All Rights Reserved.
# This material, including without limitation any software, is the confidential trade secret and proprietary
# information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
# strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
# This material may be covered by one or more patents or pending patent applications.

import ast
import json
from typing import TYPE_CHECKING

import pytest

FILENAME = "{}"

# pylint disable=disallowed-name, unused-variable, redefined-outer-name

if TYPE_CHECKING:
    c3 = {{}}  # Make pylance stop complaining about c3
    bar = None

@pytest.mark.skip(reason="https://c3energy.atlassian.net/browse/COR-XXXX")
def ctx():
    ctx = c3.TestApi.createContext(FILENAME)
    yield ctx
    c3.TestApi.teardown(ctx)
    '''

    # Iterate through each file found by the tree command
    for line in lines:
        original_file_path = line.strip()
        directory, filename = os.path.split(original_file_path)
        test_filename = 'test_' + camel_to_snake(filename)
        test_file_path = os.path.join(directory, test_filename)

        # Ensure directory exists before attempting to write
        if not os.path.exists(directory):
            os.makedirs(directory)

        # Write the content to the new file
        with open(test_file_path, 'w') as f:
            f.write(content.format(original_file_path))

if __name__ == '__main__':
    create_test_files()
