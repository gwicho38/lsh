from os.path import dirname, basename, isfile, join
import glob
import os

_base_dir = dirname(__file__)

# importing everything from subjects/*.py to register them all in CLI
__all__ = [
    __import__('subjects.' + os.path.relpath(f, _base_dir)[:-3].replace(os.path.sep, '.'), locals(), globals()).__name__
    for f in glob.glob(join(_base_dir, '**/*.py'), recursive=True)
    if isfile(f) and basename(f) != '__init__.py'
]
