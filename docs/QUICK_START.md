# LSH Quick Start Guide

Get up and running with LSH in minutes.

LSH is an **encrypted secrets manager**: it encrypts your `.env` with AES-256,
stores the ciphertext on **IPFS** (addressed by CID), and publishes the
`key→CID` pointer under a name derived from your key — so anyone with the same
key can pull the latest version back, with no account and no central server.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Install](#install)
- [First-Time Setup](#first-time-setup)
- [Push & Pull Secrets](#push--pull-secrets)
- [Durable Sync (survives node going offline)](#durable-sync)
- [Team Collaboration](#team-collaboration)
- [Verifying Your Installation](#verifying-your-installation)
- [Troubleshooting](#troubleshooting)
- [Next Steps](#next-steps)

---

## Prerequisites

- **Node.js ≥ 20.18**
- **IPFS Kubo** — LSH uses the system Kubo binary for IPFS. `lsh init` and
  `lsh doctor` can detect, install, and start it for you.

## Install

```bash
npm install -g lsh-framework
lsh --version
```

## First-Time Setup

```bash
# Interactive setup: generates an encryption key and ensures Kubo is ready
lsh init
```

Or do it manually:

```bash
# Generate a 64-char-hex AES-256 key
lsh key

# Store it in your LSH config (~/.config/lsh/lshrc)
lsh config set LSH_SECRETS_KEY <generated-key>

# Verify Kubo is installed and running
lsh doctor
```

> **Keep `LSH_SECRETS_KEY` safe.** It is the only thing required to decrypt and
> pull your secrets. The IPFS/w3name pointer is derived from it.

## Push & Pull Secrets

```bash
# From a project with a .env file:
echo "API_KEY=my-secret-key" > .env

# Encrypt + add to IPFS + publish the pointer
lsh push --env dev

# On another machine (same LSH_SECRETS_KEY): resolve pointer + fetch + decrypt
lsh pull --env dev
cat .env   # API_KEY=my-secret-key
```

Multiple environments are independent:

```bash
lsh push --env dev
lsh push --env staging
lsh push --env prod

lsh pull --env prod
```

## Durable Sync

By default the content lives on your local Kubo node and its `key→CID` pointer
is published durably via **w3name** (with a DHT-IPNS fallback). Pointer
durability is separate from *byte* durability: once your node goes offline, the
encrypted bytes may disappear unless they are pinned somewhere.

To make the bytes durable, set a remote pinning service token — LSH
auto-registers it on the next push (defaults to 4EVERLAND's free 5 GB tier):

```bash
lsh config set LSH_PIN_TOKEN <psa-token>
lsh push --env prod        # bytes now pinned remotely
```

See [CONFIGURATION.md](CONFIGURATION.md) for `LSH_PIN_SERVICE`,
`LSH_PIN_ENDPOINT`, and `LSH_DISCOVERY`.

## Team Collaboration

The encryption key is the only thing teammates must share. Distribute it through
a password manager — never in plain text. Each member sets it and pulls:

```bash
npm install -g lsh-framework
lsh config set LSH_SECRETS_KEY <team-encryption-key>
lsh pull --env production
```

For durability across the team, the publisher should set `LSH_PIN_TOKEN` so the
bytes remain available even when their machine is offline.

## Verifying Your Installation

```bash
# Check version
lsh --version

# Verify Kubo / environment health
lsh doctor

# Round-trip a test secret
echo "TEST_KEY=hello-world" > test.env
lsh push test.env --env dev
lsh pull --env dev
cat .env        # should contain TEST_KEY=hello-world

# Cleanup
rm -f test.env .env
```

## Troubleshooting

**`lsh doctor` reports Kubo not installed/running**
```bash
lsh init        # installs and/or starts Kubo
lsh doctor      # re-check
```

**Pull can't find the pointer / content**
```bash
# Ensure the same LSH_SECRETS_KEY is set as the machine that pushed
lsh config get LSH_SECRETS_KEY

# If the publishing node is offline and no pin service was set, the bytes
# may be gone — set LSH_PIN_TOKEN before pushing for durability.
```

**Custom data directory**
```bash
export LSH_DATA_DIR=~/my-lsh-data
```

## Next Steps

- **Secrets Management:** [SECRETS_GUIDE.md](features/secrets/SECRETS_GUIDE.md)
- **Configuration:** [CONFIGURATION.md](CONFIGURATION.md)
- **Architecture & data flow:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Quick reference:** [SECRETS_QUICK_REFERENCE.md](features/secrets/SECRETS_QUICK_REFERENCE.md)

---

## Security Reminders

- 🔒 Never commit your `.env` to git — add it to `.gitignore`.
- 🔒 Store `LSH_SECRETS_KEY` in a password manager; share via secure channels only.
- 🔒 Use a separate key per team/project where isolation matters.
- 🔒 `chmod 600 ~/.config/lsh/lshrc`.
