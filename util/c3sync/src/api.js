// external depedencies
import axios from 'axios';
import crypto from 'crypto';
import os from 'os';

/**
 * Decoding c3 auth
 * eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzUxMiJ9.eyJhcHAiOiJna2V2OGMzYXBwcy1sZWZ2MjQwMjEzLWd1cnVzZWFyY2h1aSIsImlzcyI6ImMzLmFpIiwiZ3JvdXBzIjpbIkMzLkFwcEFkbWluIiwiQzMuRW52QWRtaW4iXSwic2lkIjoxLCJhdWQiOiJjMy5haSIsImlkcCI6IiIsImMzZ3JvdXBzIjpbIkMzLkFwcEFkbWluIiwiQzMuRW52QWRtaW4iXSwiaWRwZ3JvdXBzIjoie1wiT2lkY0lkcENvbmZpZzo6Z2tldjhjM2FwcHMuYzMtZS5jb21cIjpbXCJna2V2OGMzYXBwcy5jMy1lLmNvbS9DMy5TdHVkaW9Vc2VyXCJdfSIsInNzaWR4IjoiIiwibmFtZSI6IjMxY2Y0ZmVlOGNhYTFhNmUzMDFiZDc5M2Q1NTM4NTNiYzY3NjEzZGRjZDkyMmI1Y2Q1ODU3MjBkMzI3ZTZmMTMiLCJpZCI6IjMxY2Y0ZmVlOGNhYTFhNmUzMDFiZDc5M2Q1NTM4NTNiYzY3NjEzZGRjZDkyMmI1Y2Q1ODU3MjBkMzI3ZTZmMTMiLCJleHAiOjE3MDgyMDkxNzMwMDAsImVtYWlsIjoibHVpcy5mZXJuYW5kZXotZGUtbGEtdmFyYUBjMy5haSJ9.2X1qefBfswy3VDWDQHiOz-c_Q5UMLcdcdlwdG-Ul2jdJAXv7Nn9TM4KVEEl1Kd8ZEGq6uLMFvPTmYIvjHTaZWdzVzduXAsS0Xl_PqHRNMqN63Jrf9qvSYaGGMzJTFuBQZWP33BNzFH_1BqmYk_lfrtsa88tocW2g8qvCB2Fc42tz6lf3SnKva51gPlg1M4U_6KzHweUPOA5CwkmrJHAnqeOrW9zN7FII93P4fNYCx9bUeEKMWVkTumHmDoc-7rEcKjIB0zFE_Malsgco9PjB10k7fsEw6MVSefsE8TtnxKhnDmG5ZdWVreevxNvhryIu1yQ1wbMZMU6REom76ecbUw;
 */

// {"typ":"JWT","alg":"RS512"}
// eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzUxMiJ9

// // {
//   "app": "gkev8c3apps-lefv240213-gurusearchui",
//   "iss": "c3.ai",
//   "groups": ["C3.AppAdmin", "C3.EnvAdmin"],
//   "sid": 1,
//   "aud": "c3.ai",
//   "idp": "",
//   "c3groups": ["C3.AppAdmin", "C3.EnvAdmin"],
//   "idpgroups": "{\"OidcIdpConfig::gkev8c3apps.c3-e.com\":[\"gkev8c3apps.c3-e.com/C3.StudioUser\"]}",
//   "ssidx": "",
//   "name": "31cf4fee8caa1a6e301bd793d553853bc67613ddcd922b5cd585720d327e6f13",
//   "id": "31cf4fee8caa1a6e301bd793d553853bc67613ddcd922b5cd585720d327e6f13",
//   "exp": 1708209173000,
//   "email": "luis.fernandez-de-la-vara@c3.ai"
// }

// eyJhcHAiOiJna2V2OGMzYXBwcy1sZWZ2MjQwMjEzLWd1cnVzZWFyY2h1aSIsImlzcyI6ImMzLmFpIiwiZ3JvdXBzIjpbIkMzLkFwcEFkbWluIiwiQzMuRW52QWRtaW4iXSwic2lkIjoxLCJhdWQiOiJjMy5haSIsImlkcCI6IiIsImMzZ3JvdXBzIjpbIkMzLkFwcEFkbWluIiwiQzMuRW52QWRtaW4iXSwiaWRwZ3JvdXBzIjoie1wiT2lkY0lkcENvbmZpZzo6Z2tldjhjM2FwcHMuYzMtZS5jb21cIjpbXCJna2V2OGMzYXBwcy5jMy1lLmNvbS9DMy5TdHVkaW9Vc2VyXCJdfSIsInNzaWR4IjoiIiwibmFtZSI6IjMxY2Y0ZmVlOGNhYTFhNmUzMDFiZDc5M2Q1NTM4NTNiYzY3NjEzZGRjZDkyMmI1Y2Q1ODU3MjBkMzI3ZTZmMTMiLCJpZCI6IjMxY2Y0ZmVlOGNhYTFhNmUzMDFiZDc5M2Q1NTM4NTNiYzY3NjEzZGRjZDkyMmI1Y2Q1ODU3MjBkMzI3ZTZmMTMiLCJleHAiOjE3MDgyMDkxNzMwMDAsImVtYWlsIjoibHVpcy5mZXJuYW5kZXotZGUtbGEtdmFyYUBjMy5haSJ9

// 2X1qefBfswy3VDWDQHiOz-c_Q5UMLcdcdlwdG-Ul2jdJAXv7Nn9TM4KVEEl1Kd8ZEGq6uLMFvPTmYIvjHTaZWdzVzduXAsS0Xl_PqHRNMqN63Jrf9qvSYaGGMzJTFuBQZWP33BNzFH_1BqmYk_lfrtsa88tocW2g8qvCB2Fc42tz6lf3SnKva51gPlg1M4U_6KzHweUPOA5CwkmrJHAnqeOrW9zN7FII93P4fNYCx9bUeEKMWVkTumHmDoc-7rEcKjIB0zFE_Malsgco9PjB10k7fsEw6MVSefsE8TtnxKhnDmG5ZdWVreevxNvhryIu1yQ1wbMZMU6REom76ecbUw

// local dependencies
import { CONFIG } from './../config.js'; // Adjust the relative path as necessary
import { getPrivateKey, setPrivateKey } from './shared.js';
/**
 * Makes a POST request to a specified endpoint using Axios.
 * 
 * @param {string} typeName The type name for the request.
 * @param {string} method The method name for the request.
 * @param {Object} data The payload for the POST request.
 * @returns {Promise} The promise object representing the result of the HTTP request.
 * 
 * @summary     
 * var postOptions = {
      hostname: opts.hostname,
      port: opts.port,
      agent: opts.agent,
      path: path,
      method: 'POST',
      headers: {
        "Content-type": 'application/json',
        "Authorization": config.authToken,
        "Content-Length": data.length,
        "Connection": 'keep-alive',
        "Accept": 'application/json'
      }
    };
 * 
 */
export async function c3Post(typeName, method, data) {
  const url = `${CONFIG.APPURL}/api/8/${typeName}/${method}`;
  const cachedToken = getPrivateKey() != "EMPTY" ? getPrivateKey() : getPrivateKey(setPrivateKey(createGlobalAuthToken()));

  try {
    const response = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: CONFIG.AUTH_TOKEN,
      },
    });

    // Return the response data. Adjust according to your needs, for example, you might want to return `response.data` directly.
    return response;
  } catch (error) {
    // Handle errors as per your existing logic
    if (error.response) {
      console.log(error.response.data);
      console.log(error.response.status);
      console.log(error.response.headers);
      throw error.response;
    } else if (error.request) {
      console.log(error.request);
      throw error.request;
    } else {
      console.log('Error', error.message);
      throw error.message;
    }
  }
}

/**
 * Creates a function that generates c3key tokens based on a private key.
 *
 * NOTE: We need this to support c3key-based tokens. The typesystem is expecting a function to be defined
 *       so that it can "refresh" the c3key token any time a request is sent.
 *
 *       This is not ideal and the type system should provide full support for it, but the current v7
 *       implementation is hardcoded in boot.js as part of the `c3` CLI so with this function we are
 *       effectively emulating the same global scope that boot.js populates.
 *
 *       This solution was chosen as we expect to improve this for the future v8 version of the c3 CLI
 *       and type system (JS SDKs).
 *
 * @param user The username of the user to authenticate
 * @param pvtKey The private key to use
 */
export const createGlobalAuthToken = function () {
  // if (!pvtKey)
  //   throw new Error("Cannot generate c3key auth token without private key");

  console.log("Inside of createGlobalAuthToken");

  function generateKeyPair() {
    return crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048, // bits - standard for RSA keys
      publicKeyEncoding: {
        type: 'spki', // recommended to be 'spki' by the Node.js docs
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8', // recommended to be 'pkcs8' by the Node.js docs
        format: 'pem',
      },
    });
  }

  function signData(privateKey, data) {
    const signer = crypto.createSign('SHA512');
    signer.update(data);
    signer.end();
    const signature = signer.sign(privateKey, 'base64');
    return signature;
  }

  function getUserId() {
    try {
      const userInfo = os.userInfo();

      console.log('Current User Information:');
      console.log(`- Username: ${userInfo.username}`);
      console.log(`- Home Directory: ${userInfo.homedir}`);
      if (process.platform !== 'win32') { // UID and GID are not available on Windows
        // console.log(`- UID: ${userInfo.uid}`);
        // console.log(`- GID: ${userInfo.gid}`);
        return userInfo.uid;
      }
    } catch (error) {
      console.error('Failed to get user information:', error);
      return "";
    }
  }

  const userId = getUserId();

  const pvtKey = generateKeyPair()['privateKey'];
  // const data = "Data to sign with RSA-SHA512";
  // const signature = signData(privateKey, data);
  // {"typ":"JWT","alg":"RS512"}
  // eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzUxMiJ9.
  const generateC3KeyAuthToken = function () {
    // WARNING: The following logic is mostly copied from boot.js
    const signAlgo = "RSA-SHA512";
    const signatureText = Date.now().toString();
    const signer = crypto.createSign(signAlgo);
    signer.update(signatureText);
    // console.log(pvtKey);
    // process.exit(0);
    const signature = signer.sign(pvtKey, "base64");
    const tokenString =
      userId +
      ":" +
      Buffer.from(signatureText).toString("base64") +
      ":" +
      signature;
    const authToken = "c3key " + Buffer.from(tokenString).toString("base64");
    console.log(authToken);
    process.exit(0);
    return authToken;
  };

  // Publish our generator to the global scope as the type system is expecting it.
  return generateC3KeyAuthToken();
};

/**
 * Convenience function for generating c3server URLs
 *
 * Examples:
 *
 *   pathFor('Tenant.deploy', 'c3','c3') ->
 *      http://SERVER/api/1/c3/c3/Tenant?action=deploy
 *
 */
export const c3ApiPath = function (typeAction, tenant, tag) {
  var s = typeAction.split('.');
  var c3type = s[0];
  var action = s[1];
  var ttg = tenant != null ? tenant + '/' + tag + '/' : ''
  var path = '/api/1/' + ttg + c3type + '?action=' + action
  log.verbose("PATH: " + path);
  return path;
};