/**
 * ESLint Rule: no-hardcoded-strings
 *
 * Prevents hard-coded strings in the codebase. All strings should be
 * imported from the constants files (src/constants/).
 *
 * Exceptions:
 * - Strings imported from src/constants/
 * - Template literals used for formatting (with variables)
 * - Very short strings (1-2 characters) like separators
 * - Test files (*.test.ts, *.spec.ts, __tests__/)
 * - Strings in comments
 * - Import/export paths
 * - RegExp patterns
 * - Type annotations
 */

import path from 'path';

The rule has grown quite large—consider extracting the “allowed patterns”, file‐skip logic and AST helpers into small modules. That will keep this file focused on “reporting” and improve readability.

1) utils/allowedStrings.ts  
```ts
export const DEFAULT_ALLOWED_PATTERNS = [
  /^[\s\n\r\t]$/, /^[.,;:!?]$/, /^[-_/\\]$/, /^[\[\]{}()]$/,
  /^[\s.,;:!?\-_/\\]+$/, /^$/, /^\.\w{1,5}$/, /^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)$/,
  /^(true|false|null|undefined)$/, /^[@\w\-./]+$/, /^(utf8|utf-8|ascii|base64|hex|binary)$/i
];

export function isAllowedString(
  value: string,
  allowedStrings: Set<string>,
  minLength: number
): boolean {
  if (allowedStrings.has(value) || value.length < minLength) {
    return true;
  }
  return DEFAULT_ALLOWED_PATTERNS.some((pat) => pat.test(value));
}
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow hard-coded strings not defined in constants files',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          allowedStrings: {
            type: 'array',
            description: 'Array of string patterns that are allowed',
            items: {
              type: 'string',
            },
          },
          minLength: {
            type: 'number',
            description: 'Minimum string length to enforce (default: 3)',
            default: 3,
          },
          allowTemplateStrings: {
            type: 'boolean',
            description: 'Allow template strings with expressions (default: true)',
            default: true,
          },
          constantsPaths: {
            type: 'array',
            description: 'Paths to constants files (default: ["/constants/"])',
            items: {
              type: 'string',
            },
            default: ['/constants/'],
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      hardcodedString:
        'Hard-coded string "{{string}}" detected. Import from constants file instead (e.g., ERRORS, PATHS, ENV_VARS from \'./constants/index.js\').',
      hardcodedStringWithSuggestion:
        'Hard-coded string "{{string}}" detected. Consider using {{suggestion}} from constants.',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const minLength = options.minLength || 3;
    const allowTemplateStrings = options.allowTemplateStrings !== false;
    const allowedStrings = new Set(options.allowedStrings || []);
    const constantsPaths = options.constantsPaths || ['/constants/'];

    // Check if current file is in constants directory or test file
    // Use path.normalize for cross-platform compatibility
    const filename = path.normalize(context.getFilename());
    const normalizedConstantsPaths = constantsPaths.map(p => path.normalize(p));

    const isConstantsFile = normalizedConstantsPaths.some((constPath) => {
      // Handle both absolute and relative paths, case-insensitive on Windows
      const normalizedPath = constPath.replace(/^\//, '');
      return filename.toLowerCase().includes(normalizedPath.toLowerCase());
    });

    const isTestFile =
      filename.includes('__tests__') ||
      filename.includes('.test.') ||
      filename.includes('.spec.');

    // Skip constants files and test files
    if (isConstantsFile || isTestFile) {
      return {};
    }

    // Track imports from constants
    const hasConstantsImport = new Set();

    // Allowed patterns that don't need constants
    const ALLOWED_PATTERNS = [
      // Single characters and very short strings
      /^[\s\n\r\t]$/,
      /^[.,;:!?]$/,
      /^[-_/\\]$/,
      /^[\[\]{}()]$/,

      // Common separators and formatting
      /^[\s.,;:!?\-_/\\]+$/,

      // Empty strings
      /^$/,

      // File extensions
      /^\.\w{1,5}$/,

      // HTTP methods
      /^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)$/,

      // Common words that are OK as literals
      /^(true|false|null|undefined)$/,

      // Package names in require/import
      /^[@\w\-./]+$/,

      // Common JS/TS keywords
      /^(utf8|utf-8|ascii|base64|hex|binary)$/i,
    ];

    // Convert function declarations to expressions to avoid block-scoped issues
    const isAllowedString = (value) => {
      // Check if in allowed list
      if (allowedStrings.has(value)) {
        return true;
      }

      // Check length
      if (value.length < minLength) {
        return true;
      }

      // Check against allowed patterns
      return ALLOWED_PATTERNS.some((pattern) => pattern.test(value));
    };

    const isInImportOrExport = (node) => {
      let parent = node.parent;
      while (parent) {
        if (
          parent.type === 'ImportDeclaration' ||
          parent.type === 'ExportNamedDeclaration' ||
          parent.type === 'ExportAllDeclaration' ||
          parent.type === 'ImportExpression'
        ) {
          return true;
        }
        parent = parent.parent;
      }
      return false;
    };

    const isInTypeAnnotation = (node) => {
      let parent = node.parent;
      while (parent) {
        if (
          parent.type === 'TSTypeAnnotation' ||
          parent.type === 'TSTypeReference' ||
          parent.type === 'TSLiteralType'
        ) {
          return true;
        }
        parent = parent.parent;
      }
      return false;
    };

    const isPropertyKey = (node) => {
      return (
        node.parent &&
        node.parent.type === 'Property' &&
        node.parent.key === node
      );
    };

    const checkString = (node, value) => {
      // Skip if string is allowed
      if (isAllowedString(value)) {
        return;
      }

      // Skip if in import/export
      if (isInImportOrExport(node)) {
        return;
      }

      // Skip if in type annotation
      if (isInTypeAnnotation(node)) {
        return;
      }

      // Skip if it's a property key (object keys are OK)
      if (isPropertyKey(node)) {
        return;
      }

      // Report the hard-coded string with improved message
      context.report({
        node,
        messageId: 'hardcodedString',
        data: {
          string: value.length > 50 ? value.substring(0, 47) + '...' : value,
        },
      });
    };

    return {
      // Track imports from constants
      ImportDeclaration(node) {
        if (
          constantsPaths.some((constPath) => node.source.value.includes('constants'))
        ) {
          node.specifiers.forEach((spec) => {
            // Handle all import specifier types
            if (spec.type === 'ImportSpecifier') {
              // Named import: import { ERRORS } from './constants'
              hasConstantsImport.add(spec.imported.name);
            } else if (spec.type === 'ImportDefaultSpecifier') {
              // Default import: import constants from './constants'
              hasConstantsImport.add(spec.local.name);
            } else if (spec.type === 'ImportNamespaceSpecifier') {
              // Namespace import: import * as constants from './constants'
              hasConstantsImport.add(spec.local.name);
            }
          });
        }
      },

      // Check literal strings
      Literal(node) {
        if (typeof node.value === 'string') {
          checkString(node, node.value);
        }
      },

      // Check template literals
      TemplateLiteral(node) {
        // If allowTemplateStrings is true and template has expressions, skip
        if (allowTemplateStrings && node.expressions.length > 0) {
          return;
        }

        // Check static template strings (no expressions)
        if (node.expressions.length === 0) {
          const value = node.quasis[0].value.cooked;
          if (value) {
            checkString(node, value);
          }
        }
      },
    };
  },
};
