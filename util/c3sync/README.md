# v8sync

`v8sync` is an alternative to the V8 VSCode extension (VSCE). It is a CLI tool that listens to file changes made locally, and updates these changes in your V8 server.

## Instructions

1. Install node packages using `npm ci`.
2. Create local config `cp config.js.sample config.js`.
3. Edit `config.js`.
4. Start server using `node server`.

## Limitations/Workarounds

- If you don't see type updates, it's possible that switching to a more recent server version (past Dec 1 22) will work.
- If you want to switch branches:
  1. Stop the node server (Ctrl + C).
  2. Switch branches.
  3. Restart the node server.
  4. Go through each changed file and press (Cmd + S).

## Motivation

The V8 VSCE is currently unstable. `v8sync` is meant to provide stability by only offering bare-bones functionality: creating, editing, and deleting types, seed data, js/py files, c3docs, etc. It does not include type peeking, code suggestions, and other niceties offered by the VSCE.
