export declare class JsHttpRequest {
    method: string;
    url: string;
    headers: any;
    body: any;
    conn: any;
    constructor(method: string, url: string, headers: any, body: any, conn: any);
}
export declare class JsHttpResponse {
    responseType: string;
    response: string;
    responseText: string;
    reasonPhrase: string;
    statusCode: number;
    headers: any;
    elapsedMs: string;
    constructor(responseType: string, response: string, responseText: string, reasonPhrase: string, statusCode: number, headers: any, elapsedMs: string);
}
export declare function getXHRResponseHeaders(xhr: XMLHttpRequest): any;
export declare function generateResponse(xhr: XMLHttpRequest): JsHttpResponse;
export declare function sendHttpRequest(method: string, url: string, headers: any, body: any): Promise<JsHttpResponse>;
