import typer
import IPython
from lpy.c3 import load_c3

c3 = {}
app = {}

def set_global(global_name: str, global_value: any):
    global global_name
    global_name = global_value

def get_global(global_name: str):
    global global_name
    return global_name


TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzUxMiJ9.eyJhcHAiOiJsb2NhbC1jMy1jMyIsImZpcnN0bmFtZSI6IkJBX0ZpcnN0IiwiaXNzIjoiYzMuYWkiLCJncm91cHMiOlsiQzMuQ2x1c3RlckFkbWluIl0sImxhc3RuYW1lIjoiQkFfTGFzdCIsInNpZCI6MSwiYXVkIjoiYzMuYWkiLCJpZHAiOiJUZXN0SWRwIiwiYzNncm91cHMiOlsiQzMuQ2x1c3RlckFkbWluIl0sImlkcGdyb3VwcyI6Int9Iiwic3NpZHgiOiIiLCJuYW1lIjoiQkEiLCJhY3Rpb25pZCI6Ijk2NzQuMjAzOTk1IiwiaWQiOiJCQSIsImV4cCI6MTcxMzQxNzA2MTAwMCwiZW1haWwiOiJiYUBjMy5haSJ9.K1b0D5lLg4hptzkf_Gi2aPuwL9I6FOIGjtdO_kb9sSxP2GHCv3gE1GNkwi4OK90Ia3GAMXXzq8C_naSjEk0CAatCsdDCZ-qY4kKwzkOEuEJGqMOYs4UcCPk_AvndX8fX6eJxdne0s6A41TbWkZhCXLrZMtmhko1U1IlrfK9a01fz8ytoooEc5o2tq9paBdDycuuJGTdaFkuP94DStohnyduHjNkcJnLt1RWlhFgBH49V-DzwL5JelKIar-vJ2b2NsPPJ1V9Vawp6_akCAXUWhwkpkYiQQOZKfigWacUdtZlLdeCc_gA86yoXi9xo63x5ZARyqRYMZGWave4bN2YUTg"

url = "http://localhost:8888/c3/c3"

def main() -> None:
    set_global("app", typer.Typer())
    set_global("c3", load_c3(url, TOKEN))
    IPython.embed()

if __name__ == "__main__":
    print("main.py")
