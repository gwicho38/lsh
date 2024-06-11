import hashlib
import base64
import os

IN_MEMORY_FILE_FINGERPRINTS = {}
NO_CHANGE_TO_FILE = -1

def encode_content(path):
    print("encode_content")
    print(path)
    with open(path, 'rb') as file:
        print(file)
        # content = file.read()
    # fingerprint = hashlib.md5(content).hexdigest()

    return NO_CHANGE_TO_FILE

    if IN_MEMORY_FILE_FINGERPRINTS.get(path) != fingerprint:
        IN_MEMORY_FILE_FINGERPRINTS[path] = fingerprint
        return base64.b64encode(content).decode('utf-8')
    else:
        return NO_CHANGE_TO_FILE
