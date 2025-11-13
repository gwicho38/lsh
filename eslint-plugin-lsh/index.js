/**
 * ESLint Plugin for LSH
 *
 * Custom ESLint rules to enforce LSH coding standards.
 */

import noHardcodedStrings from './rules/no-hardcoded-strings.js';

export default {
  rules: {
    'no-hardcoded-strings': noHardcodedStrings,
  },
};
