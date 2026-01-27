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

# Convert title to slug (kebab-case)
SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//')

# Find the next ADR number
if ls "$ADR_DIR"/[0-9]*.md 1>/dev/null 2>&1; then
    LAST_NUM=$(ls "$ADR_DIR"/[0-9]*.md | grep -oE '[0-9]+' | head -1 | sort -n | tail -1)
    NEXT_NUM=$((LAST_NUM + 1))
else
    NEXT_NUM=1
fi

# Format number with zero-padding
PADDED_NUM=$(printf "%04d" "$NEXT_NUM")

ADR_FILE="$ADR_DIR/${PADDED_NUM}-${SLUG}.md"
TEMPLATE_FILE="$ADR_DIR/adr-template.md"

# Check if template exists
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "Error: Template file not found at $TEMPLATE_FILE"
    exit 1
fi

# Create ADR from template
TODAY=$(date +%Y-%m-%d)
sed -e "s/\[Decision Title\]/$TITLE/g" \
    -e "s/ADR-XXXX/ADR-$PADDED_NUM/g" \
    -e "s/YYYY-MM-DD/$TODAY/g" \
    "$TEMPLATE_FILE" > "$ADR_FILE"

echo "Created ADR: $ADR_FILE"
echo ""
echo "Next steps:"
echo "  1. Edit the file with your decision details"
echo "  2. Submit a PR for review"
echo "  3. Update the ADR index in README.md"
