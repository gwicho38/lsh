/* eslint-disable import/prefer-default-export */
import crypto from "crypto";
import "dotenv/config";

declare global {
  /**
   * Function that generates a token based on a username and a key pair.
   *
   * @returns a new valid key authentication token
   */
  function generateAuthToken(): string;

  function generateSessionToken(): JSON;
}

export const generateSessionToken = function() {
  let USER = JSON.parse(process.env.USER);
  return USER; // const basicUser: string = TestIdp.createTestUsersForGroup('GenAiSearch.Role.User')[0];
  // const basicUserToken: string = SessionToken.generate(this.basicUser).signedToken;
  // return basicUserToken;
}

/**
 * Creates a function that generates key tokens based on a private key.
 *
 * @param user The username of the user to authenticate
 * @param pvtKey The private key to use
 */
export const createGlobalAuthTokenGenerator = function(
  user: string,
  pvtKey: string
): void {
  if (!pvtKey)
    throw new Error("Cannot generate key auth token without private key");

  const generatekeyAuthToken = function() {
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
    const authToken = "key " + Buffer.from(tokenString).toString("base64");

    return authToken;
  };

  // Publish our generator to the global scope as the type system is expecting it.
  global.generateAuthToken = generatekeyAuthToken;
};
