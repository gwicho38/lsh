#!/bin/sh
# Test shell script for LSH

echo "=== LSH Shell Script Test ==="
echo "Script: $0"
echo "Arguments: $@"
echo "User: $USER"
echo "Home: $HOME"
echo "PWD: $PWD"

# Test variables
MY_VAR="Hello from shell script"
echo "Custom variable: $MY_VAR"

# Test arithmetic
NUM1=10
NUM2=5
echo "Arithmetic: $NUM1 + $NUM2 = $((NUM1 + NUM2))"

# Test conditionals
if [ "$USER" = "root" ]; then
    echo "Running as root"
else
    echo "Running as regular user: $USER"
fi

# Test loops
echo "Counting from 1 to 3:"
for i in 1 2 3; do
    echo "  Count: $i"
done

# Test functions
greet() {
    local name="$1"
    echo "Hello, $name!"
}

greet "Shell Script"
greet "LSH User"

# Test command substitution
echo "Current date: $(date)"
echo "Current directory: $(pwd)"

# Test file operations
TEST_FILE="/tmp/lsh_script_test.txt"
echo "Creating test file: $TEST_FILE"
echo "Test content" > "$TEST_FILE"

if [ -f "$TEST_FILE" ]; then
    echo "File created successfully"
    echo "File contents:"
    cat "$TEST_FILE"
    rm "$TEST_FILE"
    echo "File cleaned up"
else
    echo "Failed to create file"
fi

# Test error handling
echo "Testing error handling..."
false && echo "This should not print"
false || echo "This should print (error caught)"

echo "=== Script completed successfully ==="