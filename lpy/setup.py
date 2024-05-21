# -*- coding: utf-8 -*-
from setuptools import setup

package_dir = \
{'': 'src', 'c3': 'src/c3'}

packages = \
['app', 'c3']

package_data = \
{'': ['*']}

install_requires = \
['click>=8.1.7,<9.0.0',
 'ipython>=8.23.0,<9.0.0',
 'pandoc>=2.3,<3.0',
 'ptpython>=3.0.26,<4.0.0',
 'requests>=2.31.0,<3.0.0',
 'setuptools>=69.5.1,<70.0.0',
 'typer>=0.12.3,<0.13.0']

entry_points = \
{'console_scripts': ['lpy = lpy.app.main:main']}

setup_kwargs = {
    'name': 'lpy',
    'version': '0.0.2',
    'description': 'Python dependency management and packaging made easy.',
    'long_description': '# README\n\n## Inspiration\n\nhttps://medium.com/clarityai-engineering/how-to-create-and-distribute-a-minimalist-cli-tool-with-python-poetry-click-and-pipx-c0580af4c026\n\n## Builds\n\nhttps://d39l7znklsxxzt.cloudfront.net/zh/blog/2021/01/19/publishing-a-proprietary-python-package-on-pypi-using-poetry/\n\nhttps://github.com/python-poetry/poetry/issues/2740\n\nhttps://github.com/aotuai/example-cython-poetry-pypi\n\n>> Poetry Factory\n\nhttps://github.com/python-poetry/poetry-core/blob/0db07bc81b989c5c4933cf019fec7a4f93fbd744/poetry/core/factory.py#L337-L351\n\nhttps://python-poetry.org/docs/pyproject/#scripts\n\n## Example `pyproject.toml`\n\n```toml\n\n[tool.poetry]\nname = "poetry"\nversion = "1.9.0.dev0"\ndescription = "Python dependency management and packaging made easy."\nauthors = ["Sébastien Eustace <sebastien@eustace.io>"]\nmaintainers = [\n    "Arun Babu Neelicattu <arun.neelicattu@gmail.com>",\n    "Bjorn Neergaard <bjorn@neersighted.com>",\n    "Branch Vincent <branchevincent@gmail.com>",\n    "Randy Döring <radoering.poetry@gmail.com>",\n    "Steph Samson <hello@stephsamson.com>",\n    "finswimmer <finswimmer77@gmail.com>",\n    "Secrus <b.sokorski@gmail.com>",\n]\nlicense = "MIT"\nreadme = "README.md"\ninclude = [{ path = "tests", format = "sdist" }]\nhomepage = "https://python-poetry.org/"\nrepository = "https://github.com/python-poetry/poetry"\ndocumentation = "https://python-poetry.org/docs"\nkeywords = ["packaging", "dependency", "poetry"]\nclassifiers = [\n    "Topic :: Software Development :: Build Tools",\n    "Topic :: Software Development :: Libraries :: Python Modules",\n]\n\n[tool.poetry.urls]\nChangelog = "https://python-poetry.org/history/"\n\n# Requirements\n[tool.poetry.dependencies]\npython = "^3.8"\n\npoetry-core = "1.9.0"\npoetry-plugin-export = "^1.7.0"\nbuild = "^1.2.1"\ncachecontrol = { version = "^0.14.0", extras = ["filecache"] }\ncleo = "^2.1.0"\ndulwich = "^0.21.2"\nfastjsonschema = "^2.18.0"\nimportlib-metadata = { version = ">=4.4", python = "<3.10" }\ninstaller = "^0.7.0"\nkeyring = "^24.3.1"\n# packaging uses calver, so version is unclamped\npackaging = ">=23.1"\npexpect = "^4.7.0"\npkginfo = "^1.10"\nplatformdirs = ">=3.0.0,<5"\npyproject-hooks = "^1.0.0"\nrequests = "^2.26"\nrequests-toolbelt = "^1.0.0"\nshellingham = "^1.5"\ntomli = { version = "^2.0.1", python = "<3.11" }\ntomlkit = ">=0.11.4,<1.0.0"\n# trove-classifiers uses calver, so version is unclamped\ntrove-classifiers = ">=2022.5.19"\nvirtualenv = "^20.23.0"\nxattr = { version = "^1.0.0", markers = "sys_platform == \'darwin\'" }\n\n[tool.poetry.group.dev.dependencies]\npre-commit = ">=2.10"\n\n[tool.poetry.group.test.dependencies]\ncoverage = ">=7.2.0"\ndeepdiff = "^6.3"\nhttpretty = "^1.1"\njaraco-classes = "^3.3.1"\npytest = "^8.0"\npytest-cov = "^4.0"\npytest-mock = "^3.9"\npytest-randomly = "^3.12"\npytest-xdist = { version = "^3.1", extras = ["psutil"] }\n\n[tool.poetry.group.typing.dependencies]\nmypy = ">=1.8.0"\ntypes-requests = ">=2.28.8"\n\n# only used in github actions\n[tool.poetry.group.github-actions]\noptional = true\n[tool.poetry.group.github-actions.dependencies]\npytest-github-actions-annotate-failures = "^0.1.7"\n\n[tool.poetry.scripts]\npoetry = "poetry.console.application:main"\n\n[build-system]\nrequires = ["poetry-core>=1.5.0"]\nbuild-backend = "poetry.core.masonry.api"\n\n\n[tool.ruff]\nextend-exclude = [\n    "docs/*",\n    # External to the project\'s coding standards\n    "tests/fixtures/git/*",\n    "tests/fixtures/project_with_setup*/*",\n    "tests/masonry/builders/fixtures/pep_561_stub_only*/*",\n    "tests/utils/fixtures/setups/*",\n]\nfix = true\nline-length = 88\nsrc = ["src"]\ntarget-version = "py38"\n\n[tool.ruff.lint]\nextend-select = [\n    "B",   # flake8-bugbear\n    "C4",  # flake8-comprehensions\n    "ERA", # flake8-eradicate/eradicate\n    "I",   # isort\n    "N",   # pep8-naming\n    "PIE", # flake8-pie\n    "PGH", # pygrep\n    "RUF", # ruff checks\n    "SIM", # flake8-simplify\n    "T20", # flake8-print\n    "TCH", # flake8-type-checking\n    "TID", # flake8-tidy-imports\n    "UP",  # pyupgrade\n]\nignore = [\n    "B904", # use \'raise ... from err\'\n    "B905", # use explicit \'strict=\' parameter with \'zip()\'\n    "N818", #  Exception name should be named with an Error suffix\n]\nextend-safe-fixes = [\n    "TCH", # move import from and to TYPE_CHECKING blocks\n]\nunfixable = [\n    "ERA", # do not autoremove commented out code\n]\n\n[tool.ruff.lint.flake8-tidy-imports]\nban-relative-imports = "all"\n\n[tool.ruff.lint.isort]\nforce-single-line = true\nlines-between-types = 1\nlines-after-imports = 2\nknown-first-party = ["poetry"]\nknown-third-party = ["poetry.core"]\nrequired-imports = ["from __future__ import annotations"]\n\n\n[tool.mypy]\nfiles = "src, tests"\nmypy_path = "src"\nnamespace_packages = true\nexplicit_package_bases = true\nshow_error_codes = true\nstrict = true\nenable_error_code = [\n    "ignore-without-code",\n    "redundant-expr",\n    "truthy-bool",\n]\nexclude = [\n    "tests/fixtures",\n    "tests/masonry/builders/fixtures",\n    "tests/utils/fixtures",\n]\n\n# use of importlib-metadata backport makes it impossible to satisfy mypy\n# without some ignores: but we get different sets of ignores at different\n# python versions.\n[[tool.mypy.overrides]]\nmodule = [\n    \'poetry.plugins.plugin_manager\',\n    \'poetry.repositories.installed_repository\',\n    \'tests.console.commands.self.test_show_plugins\',\n    \'tests.helpers\',\n]\nwarn_unused_ignores = false\n\n[[tool.mypy.overrides]]\nmodule = [\n    \'deepdiff.*\',\n    \'fastjsonschema.*\',\n    \'httpretty.*\',\n    \'pexpect.*\',\n    \'requests_toolbelt.*\',\n    \'shellingham.*\',\n    \'virtualenv.*\',\n    \'xattr.*\',\n]\nignore_missing_imports = true\n\n\n[tool.pytest.ini_options]\naddopts = "-n logical"\ntestpaths = ["tests"]\nmarkers = [\n    "network: mark tests that require internet access",\n]\n\n\n[tool.coverage.report]\nexclude_also = [\n    "if TYPE_CHECKING:"\n]\n\n```',
    'author': 'lefv',
    'author_email': 'None',
    'maintainer': 'lefv',
    'maintainer_email': 'luis@lefv.io',
    'url': 'https://www.lefv.io',
    'package_dir': package_dir,
    'packages': packages,
    'package_data': package_data,
    'install_requires': install_requires,
    'entry_points': entry_points,
    'python_requires': '>=3.12,<4.0',
}
from build import *
build(setup_kwargs)

setup(**setup_kwargs)
