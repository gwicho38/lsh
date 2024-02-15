// Import axios with ES Module syntax
import axios from 'axios';
// Import CONFIG with ES Module syntax, assuming config.js has been updated to export a CONFIG object
import { CONFIG } from './../config.js'; // Adjust the relative path as necessary
import crypto from 'crypto';

/**
 * Makes a POST request to a specified endpoint using Axios.
 * 
 * @param {string} typeName The type name for the request.
 * @param {string} method The method name for the request.
 * @param {Object} data The payload for the POST request.
 * @returns {Promise} The promise object representing the result of the HTTP request.
 */
export async function c3Post(typeName, method, data) {
  const url = `${CONFIG.APPURL}/api/8/${typeName}/${method}`;

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
export const createGlobalAuthToken = function (user, pvtKey) {
  // if (!pvtKey)
  //   throw new Error("Cannot generate c3key auth token without private key");

  console.log("Inside of createGlobalAuthToken");

  pvtKey = `-----BEGIN OPENSSH PRIVATE KEY-----
  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
  -----END OPENSSH PRIVATE KEY-----`;

  pvtKey = btoa(pvtKey);
  
  const generateC3KeyAuthToken = function () {
    // WARNING: The following logic is mostly copied from boot.js
    const signAlgo = "RSA-SHA512";
    const signatureText = Date.now().toString();
    const signer = crypto.createSign(signAlgo);
    signer.update(signatureText);
    const signature = signer.sign(pvtKey, "base64");
    const tokenString =
      user +
      ":" +
      Buffer.from(signatureText).toString("base64") +
      ":" +
      signature;
    const authToken = "c3key " + Buffer.from(tokenString).toString("base64");

    return authToken;
  };

  // Publish our generator to the global scope as the type system is expecting it.
  return generateC3KeyAuthToken();
};