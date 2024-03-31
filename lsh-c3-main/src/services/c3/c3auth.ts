import { createGlobalAuthTokenGenerator } from "../api/auth";

createGlobalAuthTokenGenerator("user", "key");

// const getAuthTokenFromProxyRequest = (req: Request) => {
//     let token = getC3AuthTokenFromCookie(req.header("cookie"));
//     if (!token) {
//       token = authToken;
//     }
//     if (token.startsWith("c3key")) {
//       token = generateC3KeyAuthToken();
//     }
//     return token;
//   };