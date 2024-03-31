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
export declare const generateSessionToken: () => any;
/**
 * Creates a function that generates key tokens based on a private key.
 *
 * NOTE: We need this to support key-based tokens. The typesystem is expecting a function to be defined
 *       so that it can "refresh" the key token any time a request is sent.
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
export declare const createGlobalAuthTokenGenerator: (user: string, pvtKey: string) => void;