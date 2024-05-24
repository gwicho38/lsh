# README

## Inspiration

https://medium.com/clarityai-engineering/how-to-create-and-distribute-a-minimalist-cli-tool-with-python-poetry-click-and-pipx-c0580af4c026

## Builds

https://d39l7znklsxxzt.cloudfront.net/zh/blog/2021/01/19/publishing-a-proprietary-python-package-on-pypi-using-poetry/

https://github.com/python-poetry/poetry/issues/2740

https://github.com/aotuai/example-cython-poetry-pypi

https://c3energy.atlassian.net/wiki/spaces/SAM/pages/8400209825/V8+Commands

>> Poetry Factory

https://github.com/python-poetry/poetry-core/blob/0db07bc81b989c5c4933cf019fec7a4f93fbd744/poetry/core/factory.py#L337-L351

https://python-poetry.org/docs/pyproject/#scripts

## Example Session/Auth

PkgExplorerEvent.runTest {"props":{"c3.category":"PkgExplorerEvent","c3.machineId":"mcpm8s6vlJgtm9Ypvn0crf7LfSSTcjU0D2DUyjnkO0U=","c3.sessionId":"3d4caa71433a7dd5f009e7604815b669","c3.workspace":"home:user:c3fed-guru:cornea"}}

## Example `pyproject.toml`

```toml

[tool.poetry]
name = "poetry"
version = "1.9.0.dev0"
description = "Python dependency management and packaging made easy."
authors = ["Sébastien Eustace <sebastien@eustace.io>"]
maintainers = [
    "Arun Babu Neelicattu <arun.neelicattu@gmail.com>",
    "Bjorn Neergaard <bjorn@neersighted.com>",
    "Branch Vincent <branchevincent@gmail.com>",
    "Randy Döring <radoering.poetry@gmail.com>",
    "Steph Samson <hello@stephsamson.com>",
    "finswimmer <finswimmer77@gmail.com>",
    "Secrus <b.sokorski@gmail.com>",
]
license = "MIT"
readme = "README.md"
include = [{ path = "tests", format = "sdist" }]
homepage = "https://python-poetry.org/"
repository = "https://github.com/python-poetry/poetry"
documentation = "https://python-poetry.org/docs"
keywords = ["packaging", "dependency", "poetry"]
classifiers = [
    "Topic :: Software Development :: Build Tools",
    "Topic :: Software Development :: Libraries :: Python Modules",
]

[tool.poetry.urls]
Changelog = "https://python-poetry.org/history/"

# Requirements
[tool.poetry.dependencies]
python = "^3.8"

poetry-core = "1.9.0"
poetry-plugin-export = "^1.7.0"
build = "^1.2.1"
cachecontrol = { version = "^0.14.0", extras = ["filecache"] }
cleo = "^2.1.0"
dulwich = "^0.21.2"
fastjsonschema = "^2.18.0"
importlib-metadata = { version = ">=4.4", python = "<3.10" }
installer = "^0.7.0"
keyring = "^24.3.1"
# packaging uses calver, so version is unclamped
packaging = ">=23.1"
pexpect = "^4.7.0"
pkginfo = "^1.10"
platformdirs = ">=3.0.0,<5"
pyproject-hooks = "^1.0.0"
requests = "^2.26"
requests-toolbelt = "^1.0.0"
shellingham = "^1.5"
tomli = { version = "^2.0.1", python = "<3.11" }
tomlkit = ">=0.11.4,<1.0.0"
# trove-classifiers uses calver, so version is unclamped
trove-classifiers = ">=2022.5.19"
virtualenv = "^20.23.0"
xattr = { version = "^1.0.0", markers = "sys_platform == 'darwin'" }

[tool.poetry.group.dev.dependencies]
pre-commit = ">=2.10"

[tool.poetry.group.test.dependencies]
coverage = ">=7.2.0"
deepdiff = "^6.3"
httpretty = "^1.1"
jaraco-classes = "^3.3.1"
pytest = "^8.0"
pytest-cov = "^4.0"
pytest-mock = "^3.9"
pytest-randomly = "^3.12"
pytest-xdist = { version = "^3.1", extras = ["psutil"] }

[tool.poetry.group.typing.dependencies]
mypy = ">=1.8.0"
types-requests = ">=2.28.8"

# only used in github actions
[tool.poetry.group.github-actions]
optional = true
[tool.poetry.group.github-actions.dependencies]
pytest-github-actions-annotate-failures = "^0.1.7"

[tool.poetry.scripts]
poetry = "poetry.console.application:main"

[build-system]
requires = ["poetry-core>=1.5.0"]
build-backend = "poetry.core.masonry.api"


[tool.ruff]
extend-exclude = [
    "docs/*",
    # External to the project's coding standards
    "tests/fixtures/git/*",
    "tests/fixtures/project_with_setup*/*",
    "tests/masonry/builders/fixtures/pep_561_stub_only*/*",
    "tests/utils/fixtures/setups/*",
]
fix = true
line-length = 88
src = ["src"]
target-version = "py38"

[tool.ruff.lint]
extend-select = [
    "B",   # flake8-bugbear
    "C4",  # flake8-comprehensions
    "ERA", # flake8-eradicate/eradicate
    "I",   # isort
    "N",   # pep8-naming
    "PIE", # flake8-pie
    "PGH", # pygrep
    "RUF", # ruff checks
    "SIM", # flake8-simplify
    "T20", # flake8-print
    "TCH", # flake8-type-checking
    "TID", # flake8-tidy-imports
    "UP",  # pyupgrade
]
ignore = [
    "B904", # use 'raise ... from err'
    "B905", # use explicit 'strict=' parameter with 'zip()'
    "N818", #  Exception name should be named with an Error suffix
]
extend-safe-fixes = [
    "TCH", # move import from and to TYPE_CHECKING blocks
]
unfixable = [
    "ERA", # do not autoremove commented out code
]

[tool.ruff.lint.flake8-tidy-imports]
ban-relative-imports = "all"

[tool.ruff.lint.isort]
force-single-line = true
lines-between-types = 1
lines-after-imports = 2
known-first-party = ["poetry"]
known-third-party = ["poetry.core"]
required-imports = ["from __future__ import annotations"]


[tool.mypy]
files = "src, tests"
mypy_path = "src"
namespace_packages = true
explicit_package_bases = true
show_error_codes = true
strict = true
enable_error_code = [
    "ignore-without-code",
    "redundant-expr",
    "truthy-bool",
]
exclude = [
    "tests/fixtures",
    "tests/masonry/builders/fixtures",
    "tests/utils/fixtures",
]

# use of importlib-metadata backport makes it impossible to satisfy mypy
# without some ignores: but we get different sets of ignores at different
# python versions.
[[tool.mypy.overrides]]
module = [
    'poetry.plugins.plugin_manager',
    'poetry.repositories.installed_repository',
    'tests.console.commands.self.test_show_plugins',
    'tests.helpers',
]
warn_unused_ignores = false

[[tool.mypy.overrides]]
module = [
    'deepdiff.*',
    'fastjsonschema.*',
    'httpretty.*',
    'pexpect.*',
    'requests_toolbelt.*',
    'shellingham.*',
    'virtualenv.*',
    'xattr.*',
]
ignore_missing_imports = true


[tool.pytest.ini_options]
addopts = "-n logical"
testpaths = ["tests"]
markers = [
    "network: mark tests that require internet access",
]


[tool.coverage.report]
exclude_also = [
    "if TYPE_CHECKING:"
]

```