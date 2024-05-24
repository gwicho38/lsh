#! /usr/bin/env python
import os
import subprocess
import re
import argparse

def search_files(root_dir, string_a, string_b):
    matching_files = []
    
    # Use rg to find files containing string_a
    rg_command_a = ['rg', '-l', string_a, root_dir]
    result_a = subprocess.run(rg_command_a, capture_output=True, text=True)
    files_a = set(result_a.stdout.strip().split('\n')) if result_a.stdout else set()
    
    # Use rg to find files containing string_b
    rg_command_b = ['rg', '-l', string_b, root_dir]
    result_b = subprocess.run(rg_command_b, capture_output=True, text=True)
    files_b = set(result_b.stdout.strip().split('\n')) if result_b.stdout else set()
    
    # Find files with filenames containing string_a and string_b
    filename_intersections = set()
    for dirpath, _, filenames in os.walk(root_dir):
        for filename in filenames:
            file_path = os.path.join(dirpath, filename)
            if re.search(string_a, filename) and re.search(string_b, filename):
                filename_intersections.add(file_path)
            elif re.search(string_a, filename) or re.search(string_b, filename):
                if file_path in files_a or file_path in files_b:
                    filename_intersections.add(file_path)
    
    # Combine file intersections from content and filename matches
    intersect_files = (files_a.intersection(files_b)).union(filename_intersections)
    
    # Get file context for matching files
    for file_path in intersect_files:
        try:
            with open(file_path, 'r', errors='ignore') as file:
                content = file.read()
                if string_a in content or string_b in content:
                    matching_files.append({
                        'file': file_path,
                        'content': content
                    })
        except Exception as e:
            print(f"Could not read file {file_path}: {e}")
    
    return matching_files

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Search for files containing both search strings in content or filenames.')
    parser.add_argument('root_dir', type=str, help='Root directory to search')
    parser.add_argument('string_a', type=str, help='First search string')
    parser.add_argument('string_b', type=str, help='Second search string')
    
    args = parser.parse_args()
    
    results = search_files(args.root_dir, args.string_a, args.string_b)
    
    for result in results:
        print(f"File: {result['file']}")
        print("Content:")
        print(result['content'])
        print('-' * 80)
