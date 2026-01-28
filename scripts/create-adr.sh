#!/bin/bash
# Create a new Architectural Decision Record (ADR)
# Usage: ./scripts/create-adr.sh "Decision Title"

set -e

usage() {
    echo "Usage: $0 <title>"
    echo "Example: $0 'Use AES-256 for secret encryption'"
    exit 1
}

if [ $# -eq 0 ]; then
    usage
fi

TITLE="$1"
ADR_DIR="docs/architecture/adr"

# Ensure ADR directory exists
mkdir -p "$ADR_DIR"

# Convert title to slug (kebab-case)
SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//')

# Find the next ADR number by extracting leading digits from basenames only
# This avoids picking up numbers from parent directory names
NEXT_NUM=1
if ls "$ADR_DIR"/[0-9]*.md 1>/dev/null 2>&1; then
    for file in "$ADR_DIR"/[0-9]*.md; do
        # Extract just the basename and get the leading number
        base=$(basename "$file")
        num=$(echo "$base" | grep -oE '^[0-9]+' || echo "0")
        if [ "$num" -gt "$NEXT_NUM" ] 2>/dev/null || [ "$num" -eq "$NEXT_NUM" ] 2>/dev/null; then
            NEXT_NUM=$((num + 1))
        fi
    done
fi

# Format number with zero-padding
PADDED_NUM=$(printf "%04d" "$NEXT_NUM")

ADR_FILE="$ADR_DIR/${PADDED_NUM}-${SLUG}.md"
TEMPLATE_FILE="$ADR_DIR/adr-template.md"

# Check if file already exists to prevent accidental overwrites
if [ -e "$ADR_FILE" ]; then
    echo "Error: ADR file already exists at $ADR_FILE"
    echo "If you want to create a new ADR with a similar title, please:"
    echo "  1. Use a different title, or"
    echo "  2. Remove the existing file first"
    exit 1
fi

# Check if template exists
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "Error: Template file not found at $TEMPLATE_FILE"
    exit 1
fi

# Escape sed special characters in the title to prevent sed errors
# Characters that need escaping: & \ / (in replacement string)
ESCAPED_TITLE=$(echo "$TITLE" | sed 's/[&/\]/\\&/g')

# Create ADR from template
TODAY=$(date +%Y-%m-%d)
sed -e "s/\[Decision Title\]/$ESCAPED_TITLE/g" \
    -e "s/ADR-XXXX/ADR-$PADDED_NUM/g" \
    -e "s/YYYY-MM-DD/$TODAY/g" \
    "$TEMPLATE_FILE" > "$ADR_FILE"

echo "Created ADR: $ADR_FILE"
echo ""
echo "Next steps:"
echo "  1. Edit the file with your decision details"
echo "  2. Submit a PR for review"
echo "  3. Update the ADR index in README.md"
