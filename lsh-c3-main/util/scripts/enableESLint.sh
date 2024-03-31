#!/bin/bash

# Usage:
#     cd c3base
#     ./scripts/enableESLint.sh server|base ticket package step

# @param {String} topic
commit() {
  pushd $REPO_DIR
  git add $PACKAGE
  git commit -m "$TICKET $1 in $PACKAGE package" --no-verify
  popd
}

# @param {Number} step
# @param {String} topic
# @param {String} whatToLookFor
pre_commit() {
  echo "Step $1 of 4 completed. Please verify staged changes and commit before proceeding."
  echo "  What to look for: $3"
  echo "  Commit: pushd repo/$REPO_DIR/$PACKAGE && git add -A \"**/*.js\" && git commit -m \"$TICKET $2 in $PACKAGE package\" --no-verify && popd"
  if [ $1 -ne 4 ]; then
    next_step=$(expr $1 + 1)
    echo "  Next step: ./scripts/enableESLint.sh -$next_step $TICKET $PACKAGE"
  fi
}

display_usage() {
  echo -e "Usage: ./scripts/enableESLint.sh base|server ticket package step\n"
  echo -e "There are 4 steps to perform:"
  echo -e " Step 1: ./scripts/enableESLint.sh base|server ticket package -1"
  echo -e " Step 2: ./scripts/enableESLint.sh base|server ticket package -2"
  echo -e " Step 3: ./scripts/enableESLint.sh base|server ticket package -3"
  echo -e " Step 4: ./scripts/enableESLint.sh base|server ticket package -4\n"
  echo -e "After each step, you must review the staged changes, make manual edits as necessary, and commit before proceeding to the next step.\n"
}

fix_eslint_all() {
  npx eslint --fix --rule "one-var: off" --rule "capitalized-comments: off" --rule "array-element-newline: off" --rule "nonblock-statement-body-position: off" "$GLOB"
}

fix_eslint_rule() {
  npx eslint --fix --no-eslintrc --rule "$1" "$GLOB"
}

main() {
  if [ $STEP -eq "-1" ]; then
    fix_eslint_rule "indent: ['error', 2, { SwitchCase: 1 }]"
    commit "Fix indentation"

    fix_eslint_rule "quotes: ['error', 'single', { avoidEscape: true }]"
    commit "Fix quotes"

    fix_eslint_rule "comma-dangle: ['error', { arrays: 'always-multiline', objects: 'always-multiline', imports: 'always-multiline', exports: 'always-multiline', functions: 'never',}]"
    commit "Fix trailing commas"

    fix_eslint_rule "space-before-function-paren: ['error', { anonymous: 'always', named: 'never', asyncArrow: 'always' }]"
    commit "Fix space between function and paren"

    fix_eslint_rule "object-curly-spacing: ['error', 'always']"
    commit "Fix object curly spacing"

    fix_eslint_rule "spaced-comment: ['error', 'always']"
    commit "Fix comment spacing"

    fix_eslint_rule "no-multiple-empty-lines: ['error', { max: 1, maxEOF: 0, maxBOF: 0 }]"

    cp ./.eslintrc ./repo/$REPO_DIR/$PACKAGE/
    fix_eslint_all
    commit "Enable ESLint"

    fix_eslint_rule "one-var: ['error', 'never']"
    git ls-files --modified -z | xargs -0 perl -i -0pe 's/\n{2} +\nvar /\nvar /g'
    git ls-files --modified -z | xargs -0 perl -i -0pe 's/; var /;\nvar /g'
    fix_eslint_rule "indent: ['error', 2, { SwitchCase: 1 }], no-trailing-spaces: error"
    pre_commit 1 "Fix grouped var declarations" "Misplaced inline (//) comments"
  elif [ $STEP -eq "-2" ]; then
    fix_eslint_rule "capitalized-comments: ['error', 'always', {line: {ignorePattern: '', ignoreInlineComments: true, ignoreConsecutiveComments: true}, block: {ignorePattern: '', ignoreInlineComments: true, ignoreConsecutiveComments: true}}]"
    fix_eslint_all
    pre_commit 2 "Fix comment capitalization" "Commented code, e.g. // this.get(); => // This.get();. \n   How to fix: // \`this.get();\`"
  elif [ $STEP -eq "-3" ]; then
    fix_eslint_rule "array-element-newline: ['error', 'consistent']"
    fix_eslint_all
    pre_commit 3 "Fix array formatting" "Arrays converted to multiline, but the first and last items stayed with the square brackets. e.g.\n    [1,\n     2,\n       3,       4];";
  elif [ $STEP -eq "-4" ]; then
    fix_eslint_rule "nonblock-statement-body-position: ['error', 'beside', { overrides: {} }]"
    fix_eslint_all
    pre_commit 4 "Fix single-line block statements" "\`if\` statements alone are allowed to be inline, e.g. \`if (condition) return;\`, but not when combined with an \`else\`";
  else
    display_usage
    exit 1
  fi
}

if [ $# -ne 4 ]; then
  display_usage
  exit 1
fi

REPO_DIR=$1
TICKET=$2
PACKAGE=$3
STEP=$4

GLOB="./repo/$REPO_DIR/$PACKAGE/**/*.js"

main