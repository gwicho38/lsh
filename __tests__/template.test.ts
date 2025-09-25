// File path: ./test/sum.test.js

// Here, we're using ES6 import statements.
// The actual path would depend on where your 'sum' function is located within your project.
// import { sum } from '../src/utils.js';

import { describe, it, expect } from '@jest/globals';

const hello = "hello";

describe('dummy jest test template', () => {
  it('should match hello string', () => {
    expect(hello.match("hello")).toBeTruthy();
  });
});
