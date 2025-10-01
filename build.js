import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename); // Not used in this script

console.warn('Creating shell wrapper for LSH...');

// Create a shell script wrapper that includes the dist directory
const wrapperScript = `#!/bin/bash
# LSH Wrapper Script
# This script runs the LSH application with its bundled dependencies

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"

# Check if we're running from the installed location
if [[ "$SCRIPT_DIR" == "/usr/local/bin" ]]; then
    # Running from system installation - use bundled files
    LSH_DIR="/usr/local/lib/lsh"
    if [[ ! -d "$LSH_DIR" ]]; then
        echo "Error: LSH installation not found at $LSH_DIR"
        exit 1
    fi
    cd "$LSH_DIR"
    exec node dist/app.js "$@"
else
    # Running from source directory
    cd "$SCRIPT_DIR"
    exec node dist/app.js "$@"
fi
`;

// Write the wrapper script
fs.writeFileSync('lsh', wrapperScript, { mode: 0o755 });

console.warn('Shell wrapper created: lsh');
console.warn('Executable has been created!');
