/*
 * Copyright 2009-2022 C3 (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

const request = require('request');
const AsyncLock = require('async-lock');

// const CONFIG = require('./config');
// const FILE = require('./file');

const semaphore = new AsyncLock();

let pkgId;

const URL = 'https://gkev8c3apps.c3-e.com/lefvcor1135/gurusearch';
const AUTH_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzUxMiJ9.eyJhcHAiOiJna2V2OGMzYXBwcy1sZWZ2Y29yMTEzNS1ndXJ1c2VhcmNoIiwiaXNzIjoiYzMuYWkiLCJncm91cHMiOlsiQzMuQXBwQWRtaW4iLCJDMy5FbnZBZG1pbiJdLCJzaWQiOjEsImF1ZCI6ImMzLmFpIiwiaWRwIjoiIiwiYzNncm91cHMiOlsiQzMuQXBwQWRtaW4iLCJDMy5FbnZBZG1pbiJdLCJpZHBncm91cHMiOiJ7XCJPaWRjSWRwQ29uZmlnOjpna2V2OGMzYXBwcy5jMy1lLmNvbVwiOltcImdrZXY4YzNhcHBzLmMzLWUuY29tL0MzLlN0dWRpb1VzZXJcIl19Iiwic3NpZHgiOiIiLCJuYW1lIjoiMzFjZjRmZWU4Y2FhMWE2ZTMwMWJkNzkzZDU1Mzg1M2JjNjc2MTNkZGNkOTIyYjVjZDU4NTcyMGQzMjdlNmYxMyIsImFjdGlvbmlkIjoiNjY0Ni44MTYwMTQ5IiwiaWQiOiIzMWNmNGZlZThjYWExYTZlMzAxYmQ3OTNkNTUzODUzYmM2NzYxM2RkY2Q5MjJiNWNkNTg1NzIwZDMyN2U2ZjEzIiwiZXhwIjoxNzE5NTEwNTU3MDAwLCJlbWFpbCI6Imx1aXMuZmVybmFuZGV6LWRlLWxhLXZhcmFAYzMuYWkifQ.dHX2AIz5k9mG_pMsnQmv4-8Qth25rp68RSX2EyfkuIMNH-zGlgDK6IbP17uTSA-7sEAX1BhEqjDX9BImQTzEf55LX1RhsPHmzAf0csISZP-eil69_hCMjFF3izFWuLPJkRQmFwcXvdhL14xY4wOTJ7Rpq_Btv3Msxf2htHhCLCgs3NyT0AJUCnbARtsuR6JBh-z-GqxIdNnCA5QLikgRIs5cQ5kTdBPdmwItkaMcmakCUPiL4VR6BTrqI5Hh7ts-61RhnVuFjN8oRaf8pK8x1f5CjhDs28hR6FGtICiBYgHTkE3TaWJg4ZMWKRL-smouiqCMSi36i7j-Z2xSVpi64w';

const makePOSTRequest = async (typeName, method, data, onSuccess) => {
  const url = URL  + '/api/8' + '/' + typeName + '/' + method;

  // Prevent parallel writes/deletions
  return semaphore.acquire('request', (done) => {
    return request.post(url, {
      method: 'POST',
      body: data,
      json: true,
      headers: {
        Authorization: AUTH_TOKEN,
      },
    }, (err, response, body) => {
      onSuccess?.(body);
      done();
    });
  });
};

await makePOSTRequest('Pkg', 'appMode', {}, (x: any) => console.log(x));

// // const getMetadataPath = (path) => {
// //   return path.substring(path.indexOf(CONFIG.PATH_TO_PACKAGE_REPO) + CONFIG.PATH_TO_PACKAGE_REPO.length);
// // };

// const getPkgId = async () => {
//   if (pkgId) {
//     return pkgId;
//   }

//   await makePOSTRequest('Pkg', 'inst', ['Pkg'], (body) => {
//     pkgId = body;
//   });

//   return pkgId;
// }

// const writeContent = async (path) => {
//   const pkgId = await getPkgId();
//   const metadataPath = getMetadataPath(path);
//   const content = FILE.encodeContent(path);
//   if (content === FILE.NO_CHANGE_TO_FILE) {
//     return;
//   }
//   return makePOSTRequest('Pkg', 'writeContent', [pkgId, metadataPath, {
//     type: 'ContentValue',
//     content,
//   }]);
// }

// const deleteContent = async (path) => {
//   const pkgId = await getPkgId();
//   const metadataPath = getMetadataPath(path);
//   return makePOSTRequest('Pkg', 'deleteContent', [pkgId, metadataPath, true]);
// }

// module.exports = {
//   writeContent,
//   deleteContent,
// };
