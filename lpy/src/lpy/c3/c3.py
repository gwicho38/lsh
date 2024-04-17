# only run this if on local jupyter instance
def load_c3(url, auth):
    import os
    """Returns c3 remote type system for python."""
    from urllib.request import urlopen
    src = urlopen(os.path.join(url, 'remote/c3.py')).read()
    exec_scope = {}
    exec(src, exec_scope)  # pylint: disable=exec-used
    return exec_scope["get_c3"](url=url, authz=auth)

if __name__ == "__main__":
    print("main")