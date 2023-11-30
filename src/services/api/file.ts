/*
 * Copyright 2009-2022 C3 (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

const fs = require('fs');
const fprint = require('fprint');

const IN_MEMORY_FILE_FINGERPRINTS = {};
const NO_CHANGE_TO_FILE = -1;

const encodeContent = (path) => {
  const content = fs.readFileSync(path);
  const fingerprint = fprint.digestSync(content, 'md5');

  if (IN_MEMORY_FILE_FINGERPRINTS[path] !== fingerprint) {
    IN_MEMORY_FILE_FINGERPRINTS[path] = fingerprint;
    return fs.readFileSync(path, {
      encoding: 'base64',
    });
  } else {
    return NO_CHANGE_TO_FILE;
  }
};

module.exports = {
  encodeContent,
  IN_MEMORY_FILE_FINGERPRINTS,
  NO_CHANGE_TO_FILE,
};
