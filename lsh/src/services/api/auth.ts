/*
 * Copyright 2009-2022 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

/* eslint-disable import/prefer-default-export */
import crypto from "crypto";
import "dotenv/config";

declare global {
  /**
   * Function that generates a token based on a username and a key pair.
   *
   * @returns a new valid c3key authentication token
   */
  function generateC3KeyAuthToken(): string;

  function generateC3SessionToken(): JSON;
}

export const generateC3SessionToken = function() {
  let BA_USER = JSON.parse(process.env.BA_USER);
  return BA_USER; // const basicUser: string = TestIdp.createTestUsersForGroup('GenAiSearch.Role.User')[0];
  // const basicUserToken: string = SessionToken.generate(this.basicUser).signedToken;
  // return basicUserToken;
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
export const createGlobalAuthTokenGenerator = function(
  user: string,
  pvtKey: string
): void {
  if (!pvtKey)
    throw new Error("Cannot generate c3key auth token without private key");



  const generateC3KeyAuthToken = function() {
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
  global.generateC3KeyAuthToken = generateC3KeyAuthToken;
};
