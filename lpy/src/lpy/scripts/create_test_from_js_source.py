import os
import re
import subprocess

def create_test_files():
    # Run the tree command and capture the output
    result = subprocess.run(['tree', '-P', '*.js', '-f', '--noreport'], capture_output=True, text=True)
    if result.returncode != 0:
        print("Error executing tree command")
        return

    # Split the output into lines and clean up
    lines = result.stdout.split('\n')
    lines = [line.strip() for line in lines if '.js' in line]
    lines = [re.sub(r'[^/]*\./', './', line) for line in lines]  # Remove tree characters

    # Define the content to be written to the new files
    content = '''
/*
 * Copyright 2009-2024 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

var filename = '{}';
xdescribe(filename, function () {{
    // TODO: https://c3energy.atlassian.net/browse/COR-XXXX
}});
    '''

    # Iterate through each file found by the tree command
    for line in lines:
        original_file_path = line.strip()
        directory, filename = os.path.split(original_file_path)
        test_file_path = os.path.join(directory, 'test_' + filename)  # prepended with 'test_'

        # Ensure directory exists before attempting to write
        if not os.path.exists(directory):
            os.makedirs(directory)

        # Write the content to the new file, formatting filename into the content
        with open(test_file_path, 'w') as f:
            f.write(content.format(filename))

if __name__ == '__main__':
    create_test_files()
