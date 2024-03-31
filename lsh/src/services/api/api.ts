/*
 * Copyright 2009-2022 C3 (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

import request from 'request';
import AsyncLock from 'async-lock';

import { CONFIG}  from './config.js';
import { FILE } from './file.js';

const semaphore = new AsyncLock();

let pkgId;

export const makePOSTRequest = async (typeName, method, data, onSuccess) => {
  console.log("makePostRequest");
  const url = CONFIG.APPURL + '/api/8' + '/' + typeName + '/' + method;
  console.log(url);

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
      console.log(body);
      onSuccess?.(response);
      done();
    });
  });
};

const getMetadataPath = (path) => {
  console.log("getMetadataPath");
  return path.substring(path.indexOf(CONFIG.PATH_TO_PACKAGE_REPO) + CONFIG.PATH_TO_PACKAGE_REPO.length);
};

const getPkgId = async () => {
  console.log("getPkgId");
  if (pkgId) {
    return pkgId;
  }

  await makePOSTRequest('Pkg', 'inst', ['Pkg'], (body) => {
    pkgId = body;
  });

  return pkgId;
}

const writeContent = async (path) => {
  console.log("writeContent");
  const pkgId = await getPkgId();
  const metadataPath = getMetadataPath(path);
  const content = FILE.encodeContent(path);
  if (await content === FILE.NO_CHANGE_TO_FILE) {
    return;
  }
  return makePOSTRequest('Pkg', 'writeContent', [pkgId, metadataPath, {
    type: 'ContentValue',
    content,
  }], () => console.log("Success"));
}

const deleteContent = async (path) => {
  const pkgId = await getPkgId();
  const metadataPath = getMetadataPath(path);
  return makePOSTRequest('Pkg', 'deleteContent', [pkgId, metadataPath, true], () => console.log("deleted!"));
}
