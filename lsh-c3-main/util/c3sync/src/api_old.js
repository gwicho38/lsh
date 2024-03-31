/*
 * Copyright 2009-2022 C3 (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

const request = require('request');
const AsyncLock = require('async-lock');

const CONFIG = require('../config');
const FILE = require('./file');

const semaphore = new AsyncLock();

let pkgId;

const makePOSTRequest = async (typeName, method, data, onSuccess) => {
  const url = CONFIG.APPURL + '/api/8' + '/' + typeName + '/' + method;

  // Prevent parallel writes/deletions
  return semaphore.acquire('request', (done) => {
    return request.post(url, {
      method: 'POST',
      body: data,
      json: true,
      headers: {
        Authorization: CONFIG.AUTH_TOKEN,
      },
    }, (err, response, body) => {
      onSuccess?.(body);
      done();
    });
  });
};

const getMetadataPath = (path) => {
  return path.substring(path.indexOf(CONFIG.PATH_TO_PACKAGE_REPO) + CONFIG.PATH_TO_PACKAGE_REPO.length);
};

const getPkgId = async () => {
  if (pkgId) {
    return pkgId;
  }

  await makePOSTRequest('Pkg', 'inst', ['Pkg'], (body) => {
    pkgId = body;
  });

  return pkgId;
}

const writeContent = async (path) => {
  const pkgId = await getPkgId();
  const metadataPath = getMetadataPath(path);
  const content = FILE.encodeContent(path);
  if (content === FILE.NO_CHANGE_TO_FILE) {
    return;
  }
  return makePOSTRequest('Pkg', 'writeContent', [pkgId, metadataPath, {
    type: 'ContentValue',
    content,
  }]);
}

const deleteContent = async (path) => {
  const pkgId = await getPkgId();
  const metadataPath = getMetadataPath(path);
  return makePOSTRequest('Pkg', 'deleteContent', [pkgId, metadataPath, true]);
}

module.exports = {
  makePOSTRequest,
  writeContent,
  deleteContent,
};
