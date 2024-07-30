/*
 * Copyright 2009-2021 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

/**
 * Basic Implementation of C3.c3typ. This class should be agnostic to connection instance,
 * with exception to $conn property.
 * When needing to reference the `C3` global within this class, use `this` rather than accessing
 * the global - do not access variables outside of the local scope of the function.
 */
class _C3 {
  constructor(httpRequest, httpResponse, postConnect) {
    const start = new Date().getTime();
    Object.defineProperty(this, '$JsHttpRequest', { value: httpRequest });
    Object.defineProperty(this, '$JsHttpResponse', { value: httpResponse });
    if (typeof postConnect === 'function') {
      Object.defineProperty(this, '$postConnect', { value: postConnect });
    }
    Object.defineProperty(this, '$start', { value: start });
  }

  #defaultActionEngine() {
    if (typeof window === 'object' || typeof importScripts === 'function') {
      if (typeof C3_ACTION_ENGINE === 'string' && /-browser$/.test(C3_ACTION_ENGINE)) {
        return C3_ACTION_ENGINE;
      }
      return 'js-client-browser';
    } else {
      const re = /-node$/;
      if (typeof C3_ACTION_ENGINE === 'string' && re.test(C3_ACTION_ENGINE)) {
        return C3_ACTION_ENGINE;
      }
      if (re.test(process.env.C3_ACTION_ENGINE)) {
        return process.env.C3_ACTION_ENGINE;
      }
      return 'js-client-node';
    }
  }

  #extractBaseUrl(url) {
    if (url == null || url === '') {
      throw new Error('Missing URL to connect to server.');
    }
    try {
      return new URL(url).href.replace(/\/$/, '');
    } catch (e) {
      throw new Error('Invalid URL for server; complete HTTP address required.\n' + e);
    }
  }

  #setupHttpRequest(baseUrl, authz, actionEngine, spec) {
    const headers = authz ? { Authorization: authz } : {};
    headers.Accept = 'text/javascript';
    let url = baseUrl + '/typesys/8/bootstrap.' + actionEngine + '.js';
    if (spec != null && spec.tier != null) {
      url += '?tier=' + encodeURIComponent(spec.tier);
      if (spec.async === true) url += '&async';
      if (spec.preload === true) url += '&preload';
    }
    return new this.$JsHttpRequest('GET', url, headers);
  }

  #buildConn(baseUrl, authz, res, actionEngine, spec) {
    if (res.statusCode !== 200) {
      throw new Error('Metadata request for ServerConnection implementation failed (status ' + res.statusCode + ').');
    }

    let implCode = res.responseText;
    if (implCode == null || implCode === '') {
      throw new Error('Metadata response for ServerConnection implementation is empty.');
    }

    // load the ServerConnection type using a temporary connection
    let ServerConnection;
    let loadFn;
    {
      let bootstrapLoader = {
        _registerType: function(type) {
          if (type.name() == 'ServerConnection') {
            ServerConnection = type;
          }
          this.$typeCache[type.name()] = type;
        },
        $typeCache: {},
      };
      try {
        loadFn = eval(implCode);
        loadFn.call(undefined, globalThis, bootstrapLoader);
      } catch (e) {
        console.error(e);
        e.message = `Implementation of bootstrap types is invalid JavaScript for action engine ${actionEngine}: ${e.message}`;
        throw e;
      }
    };
    if (typeof ServerConnection != 'function') {
      throw new Error('ServerConnection implementation missing constructor.');
    }

    // now register all types on the real connection and return it
    let conn = new ServerConnection(baseUrl, authz, actionEngine);
    loadFn.call(undefined, globalThis, conn);
    if (spec?.redirectLoginHandler) {
      Object.defineProperty(conn, '$redirectLoginHandler', { value: spec.redirectLoginHandler });
    }
    if (spec?.tokenExpirationHandler) {
      Object.defineProperty(conn, '$tokenExpirationHandler', { value: spec.tokenExpirationHandler });
    }
    if (spec?.forceLocalTypes) {
      Object.defineProperty(conn, '$forceLocalTypes', { value: spec.forceLocalTypes });
    }
    if (spec?.pkgRoots) {
      Object.defineProperty(conn, '$pkgRoots', { value: spec.pkgRoots });
    }
    if (spec?.noSourceMapPointer) {
      Object.defineProperty(conn, '$noSourceMapPointer', { value: spec.noSourceMapPointer });
    }
    if (spec?.typesWithSourceMap) {
      Object.defineProperty(conn, '$typesWithSourceMap', { value: spec.typesWithSourceMap });
    }
    if (spec?.numRetries) {
      Object.defineProperty(conn, '$numRetries', { value: spec.numRetries });
    }
    if (spec?.requestTimeoutHandler) {
      Object.defineProperty(conn, '$requestTimeoutHandler', { value: spec.requestTimeoutHandler });
    }
    if (spec?.interactive) {
      Object.defineProperty(conn, '$interactive', { value: spec.interactive });
    }
    if (spec != null) {
      if (spec.tier === 'THIN') {
        if (spec.async) {
          let ts = conn.$typeCache.AsyncThinTypeSystem;
          if (ts != null) {
            Object.defineProperty(conn, '$asyncThin', { value: new ts(conn) });
          }
        } else {
          let ts = conn.$typeCache.ThinTypeSystem;
          if (ts != null) {
            Object.defineProperty(conn, '$syncThin', { value: new ts(conn) });
          }
        }
      } else if (spec.tier === 'FULL') {
        if (spec.async) {
          let ts = conn.$typeCache.AsyncTypeSystem;
          if (ts != null) {
            Object.defineProperty(conn, '$asyncFull', { value: new ts(conn) });
          }
        } else {
          let ts = conn.$typeCache.TypeSystem;
          if (ts != null) {
            Object.defineProperty(conn, '$syncFull', { value: new ts(conn) });
          }
        }
      }
    }
    conn.$bootstrapTypes = Object.keys(conn.$typeCache);
    conn.$async = spec.async;
    return conn;
  }

  connect(url, authz, actionEngine = this.#defaultActionEngine(), spec = {}) {
    const baseUrl = this.#extractBaseUrl(url);
    const req = this.#setupHttpRequest(baseUrl, authz, actionEngine, spec);
    const res = req.sendSync();

    if (this.#isInvalidAuth(res)) {
      return this.#handleInvalidAuth(url, actionEngine, res, spec);
    } else if (res.statusCode >= 400) {
      return this.#handleUnsuccessfulRequest(url, actionEngine, res, spec);
    }

    let conn = this.#buildConn(baseUrl, authz, res, actionEngine, spec);
    if (this.$conn == null) {
      Object.defineProperty(this, '$conn', { value: conn, configurable: true });
    }
    if (this.$postConnect) {
      this.$postConnect(conn);
    }
    return conn;
  }

  disconnect(conn) {
    if (conn) {
      conn.close();
    }
    if (this.$conn == conn) {
      delete this.$conn;
    }
  }

  connection() {
    return this.$conn;
  }

  #isInvalidAuth(res) {
    // IDP providers configured in C3 return a custom header 'invalid' when the token is invalid
    return !!(res?.headers?.['authorization'] === 'invalid' || res?.header?.['authorization'] === 'invalid');
  }

  connectAsync(url, authz, actionEngine = this.#defaultActionEngine(), spec = {}) {
    const baseUrl = this.#extractBaseUrl(url);
    const req = this.#setupHttpRequest(baseUrl, authz, actionEngine, spec);

    return req.sendAsync().then((res) => {
      if (this.#isInvalidAuth(res)) {
        return this.#handleInvalidAuth(url, actionEngine, res, spec, true);
      } else if (res.statusCode >= 400) {
        return this.#handleUnsuccessfulRequest(url, actionEngine, res, spec, true);
      }

      let conn = this.#buildConn(baseUrl, authz, res, actionEngine, spec);
      if (this.$conn == null) {
        Object.defineProperty(this, '$conn', { value: conn });
      }
      return conn;
    });
  }

  connectionPromise() {
    return new Promise((resolve, _reject) => resolve(this.$conn));
  }

  #handleInvalidAuth(url, actionEngine, res, spec, async) {
    if (typeof spec?.redirectLoginHandler === 'function') {
      // The res contains the redirect url of Idp login and redirectLoginHandler should get the valid token from Idp login
      if (async) {
        return spec?.redirectLoginHandler(res).then((token) => {
          return this.connectAsync(url, token, actionEngine, spec);
        });
      } else {
        let token = spec?.redirectLoginHandler(res);
        return this.connect(url, token, actionEngine, spec);
      }
    } else {
      throw new Error(`Redirect was detected but no redirect handler was provided. ${this.#formatUnsuccessfulResponse(res)}`);
    }
  }

  #handleUnsuccessfulRequest(url, actionEngine, res, spec, async) {
    const numRetries = spec.numRetries ?? 3;
    if (numRetries > 0 && res.statusCode === 401 && typeof spec?.redirectLoginHandler === 'function') {
      const newSpec = { ...spec, numRetries: numRetries - 1 };
      return async
        ? this.connectAsync(url, null, actionEngine, newSpec)
        : this.connect(url, null, actionEngine, newSpec);
    } else {
      throw new Error(`Connection failed. ${this.#formatUnsuccessfulResponse(res)}`);
    }
  }

  #formatUnsuccessfulResponse(res) {
    return `Status code: ${res.statusCode}, Reason: ${res.reasonPhrase}, Response: ${res.responseText}`;
  }
}

function createC3($JsHttpRequest, $JsHttpResponse, $postConnect) {
  return new _C3($JsHttpRequest, $JsHttpResponse, $postConnect);
}

class JsHttpRequest {
  constructor(method, url, headers, body, conn) {
    this.method = method;
    this.url = url;
    this.headers = headers;
    this.body = body;
    this.conn = conn;
  }
}

class JsHttpResponse {
  constructor(responseText, reasonPhrase, statusCode, headers, elapsedMs) {
    this.responseType = 'text';
    this.response = responseText;
    this.responseText = responseText;
    this.reasonPhrase = reasonPhrase;
    this.statusCode = statusCode;
    this.headers = headers;
    this.elapsedMs = elapsedMs;
  }
}

(function (root, factory) {
  function xhrResponseHeaders(xhr) {
    let headers = {};
    let lines = xhr.getAllResponseHeaders().split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      let h = lines[i].trim();
      if (/^[A-Z][^:]*:/i.test(h)) {
        let k = h.replace(/ *:.*$/, '');
        headers[k] = h.replace(/^[^:]*: */, '');
      }
    }
    return headers;
  }

  function _errMessage(url, e) {
    return new Error(`Unable to connect to "${url}".\n ${e}`)
  }

  function _shouldRetryRequest(code) {
    // These are the error codes we allow retrying the request
    return code === 'ETIMEDOUT' || code === 'ECONNRESET' || code === 'EHOSTUNREACH';
  }

  // subtypes of application/ that indicate text; see ContentType#isAnyText
  const APPLICATION_TEXT = ['json', 'x-ndjson', 'yaml', 'csv', 'xml', 'javascript', 'typescript', 'x-python'];

  function _isTextContent(contentType) {
    if (contentType == null || contentType === '') return false;
    if (contentType.startsWith("text/")) return true;
    if (contentType.startsWith("application/")) {
      let subtype = contentType.substring(12)
                               .replace(/[ ;].*$/, '')
                               .replace(/^[^+]*\+/, '');
      if (APPLICATION_TEXT.indexOf(subtype) >= 0) return true;
    }
    return false;
  }

  if (typeof window === 'object' || typeof importScripts === 'function') {
    function _sendError(xhr, e) {
    }

    // browser
    JsHttpRequest.prototype.sendAsync = function (data) {
      let self = this;
      const numRetries = self.conn?.$numRetries ?? 3;
      let attempt = 0;
      const start = Date.now();
      return new Promise(function (resolve, reject) {
        function sendRequest() {
          attempt++;
          let xhr = new XMLHttpRequest();
          xhr.open(self.method, self.url, true);
          Object.keys(this.headers || {}).forEach((header) => xhr.setRequestHeader(header, this.headers[header]));
          xhr.onload = function () {
            const now = Date.now();
            if (xhr.readyState === 4) {
              resolve(
                new JsHttpResponse(xhr.responseText, xhr.statusText, xhr.status, xhrResponseHeaders(xhr), now - start)
              );
            }
          };
          xhr.onerror = function (e) {
            _sendError(xhr, e);
            if (_shouldRetryRequest(e.code)) {
              if (self.conn?.$requestTimeoutHandler) {
                self.conn.$requestTimeoutHandler(e);
              }
              if (attempt < numRetries) {
                sendRequest();
                return;
              }
            }
            reject(_errMessage(self.url, e));
          };
          xhr.send(data || self.body || "");
        }
        sendRequest();
      });
    };

    JsHttpRequest.prototype.sendSync = function (data) {
      let xhr = new XMLHttpRequest();
      const numRetries = this.conn?.numRetries ?? 3;
      for (let attempt = 0; attempt < numRetries; attempt++) {
        const start = Date.now();
        xhr.open(this.method, this.url, false);
        Object.keys(this.headers || {}).forEach((header) => xhr.setRequestHeader(header, this.headers[header]));
        try {
          xhr.send(data || this.body || "");
          const now = Date.now();
          return new JsHttpResponse(xhr.responseText, xhr.statusText, xhr.status, xhrResponseHeaders(xhr), now - start);
        } catch (e) {
          _sendError(xhr, e);
          if (_shouldRetryRequest(e.code)) {
            if (this.conn?.$requestTimeoutHandler) {
              this.conn.$requestTimeoutHandler(e);
            }
          } else {
            // We always want to throw on non ETIMEDOUT
            throw _errMessage(this.url, e);
          }
        }
      }
      throw _errMessage(this.url, `${numRetries} consecutive requests attempts have occurred`);
    };

    function postConnect(conn) {
      // localStorage is always for original URL
      if (window.location.href.startsWith(conn.url())) {
        Object.defineProperty(conn, '$localStorage', { value: window.localStorage });
      }
    }

    root.C3 = factory(JsHttpRequest, JsHttpResponse, postConnect);
    Object.defineProperty(root.C3, '$TextEncoder', { value: TextEncoder });
    Object.defineProperty(root.C3, '$TextDecoder', { value: TextDecoder });
  } else {
    // node
    const util = require('util');
    const http = require('http');
    const https = require('https');
    const request = require('sync-request');
    const zlib = require('zlib');
    const fs = require('fs');
    const path = require('path');

    function _body(req, data) {
      if (data == null) data = req.body;
      if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
        data = Buffer.from(data);
      }
      return data;
    }

    function _addReferer(req) {
      return {...req.headers, 'Referer': req.url};
    }

    function _findSslCertificate() {
      try {
        const filePath = process.env["NODE_EXTRA_CA_CERTS"];
        if (!filePath) {
          return;
        }
        return fs.readFileSync(filePath);
      } catch (e) {
        console.error("Could not read CA Certs from NODE_EXTRA_CA_CERTS: " + e);
      }
    }

    JsHttpRequest.prototype.sendAsync = function (data) {
      let self = this;
      const numRetries = self.conn?.$numRetries ?? 3;
      let attempt = 0;
      let responseText = '';
      const start = Date.now();
      return new Promise(function (resolve, reject) {
        function sendRequest() {
          attempt++;
          const certificate = _findSslCertificate();
          const req = (self.url.startsWith('https') ? https : http).request(
            self.url,
            {
              method: self.method,
              headers: _addReferer(self),
              ca: certificate
            },
            function (res) {
              // https://nodejs.org/api/zlib.html#threadpool-usage-and-performance-considerations
              let pipe;
              let compressed = true;
              switch (res.headers['content-encoding']) {
                case 'br':
                  pipe = zlib.createBrotliDecompress({finishFlush: zlib.constants.Z_SYNC_FLUSH});
                  break;
                case 'gzip':
                  pipe = zlib.createGunzip({finishFlush: zlib.constants.Z_SYNC_FLUSH});
                  break;
                case 'deflate':
                  pipe = zlib.createInflate({finishFlush: zlib.constants.Z_SYNC_FLUSH});
                  break;
                default:
                  compressed = false;
                  pipe = res;
                  break;
              }
              pipe.on('data', function (chunk) {
                responseText += chunk;
              }).on('end', () => {
                const now = Date.now();
                resolve(new JsHttpResponse(responseText, res.statusMessage, res.statusCode, res.headers, now - start));
              }).on('error', function (e) {
                reject(new Error('Encountered error: ' + e));
              });
              if (compressed) {
                // stream the response body through the decompression pipe
                let first = true;
                res.on('data', chunk => {
                  if (first) {
                    // make sure the pipe stream encoding matches
                    let charset;
                    let contentType = res.headers['content-type'];
                    if (contentType != null) {
                      let m = /; *charset="([^"]+)"/.exec(contentType);
                      if (m == null) {
                        m = /; *charset=([^"][^;]*)/.exec(contentType);
                      }
                      if (m != null) charset = m[1].trim();
                    }
                    if (typeof chunk === 'string' || _isTextContent(contentType)) {
                      // use correct character set
                      if (charset == null || charset === '') charset = 'utf8';
                      pipe.setEncoding(charset);
                    } else {
                      // don't interpret content as text; keep it binary
                      pipe.setEncoding('binary');
                    }
                    first = false;
                  }
                  pipe.write(chunk);
                }).on('error', e => {
                  pipe.destroy();
                  reject(e);
                }).on('end', () => pipe.end());
              }
            }
          );
          req.on('error', function (e) {
            if (_shouldRetryRequest(e.code)) {
              if (self.conn?.$requestTimeoutHandler) {
                self.conn.$requestTimeoutHandler(e);
              }
              if (attempt < numRetries) {
                sendRequest();
                return;
              }
            }
            reject(_errMessage(self.url, e));
          });
          data = _body(self, data);
          if (data) req.write(data);
          req.end();
        }
        sendRequest();
      });
    };

    JsHttpRequest.prototype.sendSync = function (data) {
      const numRetries = this.conn?.$numRetries ?? 3;
      for(let attempt = 0; attempt < numRetries; attempt++) {
        try {
          const start = Date.now();
          // sync-request follows redirect automatically, meaning we can't handle token expiration on 302 as it will return 200 after redirecting
          let res = request(this.method, this.url, { 
            headers: _addReferer(this),
            body: _body(this, data), 
            followRedirects: false 
          });
          const now = Date.now();
          return new JsHttpResponse(
            res.body.toString('utf8'),
            String(res.statusCode),
            res.statusCode,
            res.headers,
            now - start
          );
        } catch (e) {
          if (_shouldRetryRequest(e.code)) {
            if (this.conn?.$requestTimeoutHandler) {
              this.conn.$requestTimeoutHandler(e);
            }
          } else {
            throw _errMessage(this.url, e);
          }
        }
      }
      // max retries attempts
      throw _errMessage(this.url, `${numRetries} consecutive request attempts have occurred`);
    };

    class LocalStorage {
      #url
      #dir

      constructor(url) {
        if (url == null || url === '') {
          throw new Error('Missing URL for LocalStorage');
        }
        this.#url = url;

        const root = LocalStorage.homeDir();
        if (root == null) {
          throw new Error('No home directory for LocalStorage');
        }
        this.#dir = path.join(root, encodeURIComponent(url));
        if (!fs.existsSync(this.#dir)) fs.mkdirSync(this.#dir);
      }

      setItem(name, value) {
        const file = this.#file(name);
        if (file == null) {
          throw new Error('Missing key for LocalStorage.setItem');
        }
        if (typeof value !== 'string') {
          value = String(value);
        }
        fs.writeFileSync(file, value);
      }

      getItem(name) {
        const file = this.#file(name);
        if (file != null) {
          try {
            return fs.readFileSync(file, { encoding: 'utf8' });
          } catch (e) {}
        }
      }

      removeItem(name) {
        const file = this.#file(name);
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      }

      clear() {
        for (const file of fs.readdirSync(this.#dir)) {
          if (/^\./.test(file)) continue;
          fs.unlinkSync(path.join(this.#dir, file));
        }
      }

      #file(name) {
        if (name != null && name !== '') {
          let fn = encodeURIComponent(name).replace(/^\./, '%2E');
          return path.join(this.#dir, fn);
        }
      }

      toString() {
        return 'LocalStorage(' + this.#url + ')';
      }

      static homeDir() {
        try {
          let dir = path.join(process.env.HOME, '.c3-node-localStorage');
          if (!fs.existsSync(dir)) fs.mkdirSync(dir);
          if (fs.statSync(dir).isDirectory()) return dir;
        } catch (e) {
          // no writable home directory
        }
      }
    }

    function postConnect(conn) {
      if (conn.$interactive && LocalStorage.homeDir() != null) {
        Object.defineProperty(conn, '$localStorage', { value: new LocalStorage(conn.url()) });
      }
    }

    global.require = require;
    global.C3 = factory(JsHttpRequest, JsHttpResponse, postConnect);
    Object.defineProperty(global.C3, '$TextEncoder', { value: util.TextEncoder });
    Object.defineProperty(global.C3, '$TextDecoder', { value: util.TextDecoder });
  }
})(typeof self !== 'undefined' ? self : this, createC3);