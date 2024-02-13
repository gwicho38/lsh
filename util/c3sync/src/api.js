const request = require('request');
const AsyncLock = require('async-lock');

const CONFIG = require('./../config');
const FILE = require('./file');

const semaphore = new AsyncLock();

let pkgId;


const c3Post = (typeName, method, data) => {
  const url = `${CONFIG.APPURL}/api/8/${typeName}/${method}`;

  return new Promise((resolve, reject) => {
    request.post(url, {
      method: 'POST',
      body: data,
      json: true,
      headers: {
        Authorization: CONFIG.AUTH_TOKEN,
      },
    }, (err, response) => {
      if (err) {
        reject(err);
      } else {
        resolve(response); // Resolve the promise with the body of the response
      }
    });
  });
};

module.exports = c3Post; 
