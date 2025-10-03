#!/bin/bash
# Fix root-owned build directories
# Run this if you get "EACCES: permission denied" errors

echo "🔧 Fixing build directory permissions..."

# Remove root-owned directories
sudo rm -rf dist types lsh *.tsbuildinfo 2>/dev/null || true
find . -name "*.tsbuildinfo" -exec sudo rm -f {} \; 2>/dev/null || true

echo "✅ Removed root-owned build artifacts"
echo ""
echo "Now run: npm run build"
