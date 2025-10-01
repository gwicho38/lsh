# Installation

LSH can be installed via npm.

## npm

```bash
npm install -g gwicho38-lsh
```

## Verify Installation

```bash
lsh --version
lsh self version
```

## Update

```bash
lsh self update
# or
npm update -g gwicho38-lsh
```

## Uninstall

```bash
npm uninstall -g gwicho38-lsh
```

## From Source (Development)

```bash
# Clone the repository
git clone https://github.com/gwicho38/lsh.git
cd lsh

# Install dependencies
npm install

# Build TypeScript
npm run build

# Link globally
npm link

# Run
lsh
```
