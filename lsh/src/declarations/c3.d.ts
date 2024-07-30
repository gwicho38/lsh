
/**
 * TypeScript definition for c3.js
 */
declare module 'c3' {
    class JsHttpRequest {
        method: string;
        url: string;
        headers: any;
        body: any;
        conn: any;

        constructor(method: string, url: string, headers: any, body?: any, conn?: any);
        sendAsync(data?: any): Promise<JsHttpResponse>;
        sendSync(data?: any): JsHttpResponse;
    }

    class JsHttpResponse {
        responseType: string;
        response: string;
        responseText: string;
        reasonPhrase: string;
        statusCode: number;
        headers: any;
        elapsedMs: number;

        constructor(responseText: string, reasonPhrase: string, statusCode: number, headers: any, elapsedMs: number);
    }

    class _C3 {
        constructor(httpRequest: JsHttpRequest, httpResponse: JsHttpResponse, postConnect?: Function);

        connect(url: string, authz: string, actionEngine?: string, spec?: any): any;
        disconnect(conn: any): void;
        connection(): any;
        connectAsync(url: string, authz: string, actionEngine?: string, spec?: any): Promise<any>;
        connectionPromise(): Promise<any>;

        private $JsHttpRequest: JsHttpRequest;
        private $JsHttpResponse: JsHttpResponse;
        private $postConnect?: Function;
        private $start: number;
        private $conn: any;

        private $isInvalidAuth(res: any): boolean;
        private $defaultActionEngine(): string;
        private $extractBaseUrl(url: string): string;
        private $setupHttpRequest(baseUrl: string, authz: string, actionEngine: string, spec: any): JsHttpRequest;
        private $buildConn(baseUrl: string, authz: string, res: JsHttpResponse, actionEngine: string, spec: any): any;
        private $handleInvalidAuth(url: string, actionEngine: string, res: any, spec: any, async?: boolean): any;
        private $handleUnsuccessfulRequest(url: string, actionEngine: string, res: any, spec: any, async?: boolean): any;
        private $formatUnsuccessfulResponse(res: JsHttpResponse): string;
    }

    // Exporting a default instance and class for easy global usage
    const c3: _C3;
    export { JsHttpRequest, JsHttpResponse, _C3 as C3, c3 };
}
