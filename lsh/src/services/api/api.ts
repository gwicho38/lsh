import AsyncLock from 'async-lock';
import request from 'request';
import { prettyPrintJson } from 'pretty-print-json';

import { CONFIG } from './config.js';
import { FILE } from './file.js';

const semaphore = new AsyncLock();

let pkgId;

export const c3Request = async (typeName, method, data, onSuccess) => {
  const url = process.env.APPURL + '/api/8' + '/' + typeName + '/' + method;

  // Prevent parallel writes/deletions
  return semaphore.acquire('request', (done) => {
    const response = request.post(url, {
      method: 'POST',
      body: data,
      json: true,
      headers: {
        Authorization: process.env.AUTH_TOKEN,
      },
    }, (err, response, body) => {
      onSuccess?.(body);
      done();
    });
    // console.log(JSON.stringify(response));
    return response;
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

  await c3Request('Pkg', 'inst', ['Pkg'], (body) => {
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
  return c3Request('Pkg', 'writeContent', [pkgId, metadataPath, {
    type: 'ContentValue',
    content,
  }], () => console.log("Success"));
}

const deleteContent = async (path) => {
  const pkgId = await getPkgId();
  const metadataPath = getMetadataPath(path);
  return c3Request('Pkg', 'deleteContent', [pkgId, metadataPath, true], () => console.log("deleted!"));
}
