# GuruSearchUI

test

## Overview

GuruSearchUI is a part of the Cornea project within the c3fed repository. It is designed to provide an intuitive and efficient user interface for searching and managing data using c3's Generative AI technology.

## Repository Structure

The `cornea/guruSearchUI` folder is organized into three main directories:

1. **config** - Contains configuration files specified by [GuruSearchUI](https://github.com/c3-e/c3fed/tree/cornea/develop/cornea/guruSearchUI/config).

2. **src** - This is the source code directory where the main application logic and components of [GuruSearchUI](https://github.com/c3-e/c3fed/tree/cornea/develop/cornea/guruSearchUI/src)

3. **ui** - Contains the user interface elements, styles, and assets implemented and/or overriding by [GuruSearchUI](https://github.com/c3-e/c3fed/tree/cornea/develop/cornea/guruSearchUI/ui)

## Structure

Current top-level package structure.

```
.
├── README.md
├── config/
├── guruSearchUI.c3pkg.json
├── jsconfig.json
├── src/
└── ui/

```

## Development Environment

### Dependencies

This application depends on the following dependencies:

- [c3generativeAi](https://github.com/c3-e/c3generativeAi)

- [govSecurityV8](https://github.com/c3-e/c3fed/pull/2033)

Dependencies should be resolved by c3server. However, if local development requires updating dependency logic, the following
process can be followed.

### Working Environment

Run `bootstrap_guru_search.sh` located in [./resources/ui/](./resources/ui/bootstrap_guru_search.sh).

### Local UI Bundling

1. Create c3gen

### C3 Server UI Bundling

### Application Bootstrap

TODO: [COR-383 | Implement Data Load Readme](https://c3energy.atlassian.net/browse/COR-383)
