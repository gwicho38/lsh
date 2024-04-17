from lpy.c3 import load_c3

# def main() -> int:
#     c3 = load_c3(url=url, auth=TOKEN)
#     print(c3)

TOKEN = "REDACTED"

url = "http://localhost:8888/c3/c3"

def main() -> None:
    import IPython

    c3 = load_c3(url, TOKEN)
    print(c3)
    print("lpy/main.py")
    # lots of code
    # even more code
    IPython.embed()

if __name__ == "__main__":
    # c3 = load_c3(url=url, auth=TOKEN)
    print("main.py")
