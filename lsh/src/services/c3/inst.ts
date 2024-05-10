export class JsHttpRequest {
  constructor(public method: string, public url: string, public headers: any, public body: any, public conn: any) {}
}

export class JsHttpResponse {
  constructor(public responseType: string, public response: string, public responseText: string, public reasonPhrase: string, public statusCode: number, public headers: any, public elapsedMs: string) {}
}

export function getXHRResponseHeaders(xhr: XMLHttpRequest): any {
  let headers: any = {};
  let lines = xhr.getAllResponseHeaders().trim().split('\r\n');
  lines.forEach(line => {
    let [name, value] = line.split(': ');
    headers[name.toLowerCase()] = value;
  });
  return headers;
}

export function generateResponse(xhr: XMLHttpRequest): JsHttpResponse {
  return new JsHttpResponse(
    'text',
    xhr.responseText,
    xhr.responseText,
    xhr.statusText,
    xhr.status,
    getXHRResponseHeaders(xhr),
    xhr.getResponseHeader('X-Elapsed')
  );
}

export function sendHttpRequest(method: string, url: string, headers: any, body: any): Promise<JsHttpResponse> {
  return new Promise((resolve, reject) => {
    let xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    for (let key in headers) {
      xhr.setRequestHeader(key, headers[key]);
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(generateResponse(xhr));
      } else {
        reject(new Error(`HTTP request failed with status ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Network request failed'));
    xhr.send(body);
  });
}
