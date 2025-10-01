# Installation

LSH can be installed via npm or Homebrew.

## npm (Recommended)

```bash
npm install -g gwicho38-lsh
```

## Homebrew

### Option 1: Via Custom Tap

```bash
brew tap gwicho38/lsh
brew install lsh
```

### Option 2: Directly from Formula

```bash
brew install gwicho38/lsh/lsh
```

### Option 3: From Local Formula (Development)

```bash
cd /path/to/lsh/repo
brew install --build-from-source Formula/lsh.rb
```

## Verify Installation

```bash
lsh --version
lsh self version
```

## Update

### npm
```bash
lsh self update
# or
npm update -g gwicho38-lsh
```

### Homebrew
```bash
brew update
brew upgrade lsh
```

## Uninstall

### npm
```bash
npm uninstall -g gwicho38-lsh
```

### Homebrew
```bash
brew uninstall lsh
```
