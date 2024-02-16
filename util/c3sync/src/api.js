// external depedencies
import axios from 'axios';
import crypto from 'crypto';
import os from 'os';

// local dependencies
import { CONFIG } from './../config.js'; // Adjust the relative path as necessary
import { getC3Key, setC3Key } from './shared.js';
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
  const cachedToken = getC3Key() != "EMPTY" ? getC3Key() : getC3Key(setC3Key(createGlobalAuthToken()));

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