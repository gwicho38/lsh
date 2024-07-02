# external imports
import click

# local imports
from lpy.app.main import set_global

def pkg() -> None:
    pass

# create top level root_repos_build_directory
# create root_build_directory
# define root package
# buildQueue.push(rootPkg)
# build(root_pkg):
#   find_dependency_repo(d)
#   if !repo in build_map
#       clone repo
#       locate(d) -> 
#       cp(d) --> [dirs in d, *.c3pkg.json]
#       build_map.add(d)
#       process_pkg_json(d)
#           for p in package_list:
#               if p not in build_map --> buildQueue.push(p)
#       


def main():
    set_global("PKG", pkg)
    pkg()

if __name__ == "__main__":
    main()