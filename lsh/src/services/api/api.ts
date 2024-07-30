import AsyncLock from 'async-lock';
import request from 'request';

import { CONFIG } from './config.js';
import { FILE } from './file.js';

const semaphore = new AsyncLock();

let pkgId;

import request from 'request';
import semaphore from 'semaphore';
import { CONFIG } from './config'; // Assume CONFIG is imported from a config module

type MakePOSTRequest = (
  typeName: string,
  method: string,
  data: any,
  onSuccess?: (response: request.Response) => void
) => Promise<void>;

import request from 'request';
import semaphore from 'semaphore';
import { CONFIG } from './config'; // Assume CONFIG is imported from a config module

type MakePOSTRequest = (
  typeName: string,
  method: string,
  data: any,
  onSuccess?: (response: request.Response) => void
) => Promise<void>;

export const makePOSTRequest = async (typeName, method, data, onSuccess) => {
  // const url = CONFIG.APPURL + '/api/8' + '/' + typeName + '/' + method;
  const url = 'http://localhost:8888/c3/c3' + '/api/8' + '/' + typeName + '/' + method;

  // Prevent parallel writes/deletions
  return semaphore.acquire('request', (done) => {
    const response = request.post(url, {
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
    console.log(JSON.stringify(response));
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
