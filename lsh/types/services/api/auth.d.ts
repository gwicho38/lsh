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
 * @param user The username of the user to authenticate
 * @param pvtKey The private key to use
 */
export declare const createGlobalAuthTokenGenerator: (user: string, pvtKey: string) => void;
