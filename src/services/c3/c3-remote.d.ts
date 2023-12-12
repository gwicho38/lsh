/*
 * Copyright 2009-2023 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

/**
 * We allow `any` in this file because it is not including all types but in the future we could generate this file from the type metadata
 * and get all types without hardcoding them here.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "@c3/remote" {
  declare global {
    /*
     *~ Here, declare things that go in the global namespace, or augment
     *~ existing declarations in the global namespace
     */
    declare const C3: C3Remote;
  }

  export type C3Remote = {
    connectAsync(
      this: void,
      url: string,
      authz: string,
      actionEngine?: string | any,
      spec?: RemoteConnectSpec
    ): Promise<ServerConnection>;
  };

  import { IncomingHttpHeaders, OutgoingHttpHeaders } from "http";

  // Alias http package types
  type ServerResponseHeaders = IncomingHttpHeaders;
  type ServerRequestHeaders = OutgoingHttpHeaders;

  export class AbstractContent {
    content?: ArrayBuffer;

    contentLength?: number;

    contentType?: string;

    contentEncoding?: string;
  }

  export class ContentValue {
    readString(offset?: number, len?: number, spec?: any): string;

    static fromBinary(
      value?: ArrayBuffer,
      contentType?: string,
      contentEncoding?: string
    ): ContentValue;

    static fromString(value?: string, contentType?: string): ContentValue;
  }

  export class AsyncThinTypeSystem {
    type: (name: string, failIfMissing?: string) => Promise<AsyncTypeProxy>;

    connection(): ServerConnection;
  }

  export class AsyncTypeProxy extends TypeProxyBase {
    constructor(ts: AsyncThinTypeSystem, name?: string);

    call(action: string, args?: any[]): Promise<any>;

    callByName(action: string, args?: { [arg: string]: any }): Promise<any>;

    asPersistable(failIfNot?: boolean): AsyncPersistableProxy | never | void;
  }

  export class TypeProxy extends TypeProxyBase {
    call(action: string, args?: { [arg: string]: any }): any;

    asPersistable(failIfNot?: boolean): PersistableProxy | never | void;
  }

  export class PersistableProxy extends TypeProxy {
    isPersistable(): this is PersistableProxy;

    get(id: string, include?: string): never;

    fetch(spec?: any): never;
  }

  export class AsyncPersistableProxy extends TypeProxy {
    isPersistable(): this is AsyncPersistableProxy;

    get(id: string, include?: string): Promise<any>;

    fetch(spec?: any): Promise<any>;
  }

  export class TypeProxyBase {
    constructor(ts: ThinTypeSystemBase, name?: string);

    readonly typeName: string;

    isPersistable(): this is PersistableProxy | AsyncPersistableProxy;

    sync(): never;

    async(): Promise<AsyncTypeProxy>;

    readonly typeSys: ThinTypeSystemBase;

    connection(): ServerConnection;

    toString(): string;
  }

  export class ThinTypeSystemBase {
    constructor(conn: ServerConnection);

    sync(): never;

    async(): AsyncThinTypeSystem;

    readonly connection: ServerConnection;
  }

  export class ServerConnection {
    constructor(url?: string, auth?: string, tenant?: string, tag?: string);

    url(): string;

    tenant(): string;

    tag(): string;

    close(): void;

    request(init?: ServerRequestInit): never;

    asyncRequest(init?: ServerRequestInit): AsyncServerRequest;

    thinTypeSys(): never;

    asyncThinTypeSystem(): AsyncThinTypeSystem;

    $authz: string;
  }

  export class AsyncServerRequest extends ServerRequestBase {
    send(
      content?: string | ArrayBuffer | Uint8Array | Record<string, unknown>
    ): Promise<ServerResponse>;
  }

  export class ServerRequest extends ServerRequestBase {
    constructor(conn: ServerConnection, init?: ServerRequestInit);

    send(
      content?: string | ArrayBuffer | Uint8Array | Record<string, unknown>
    ): ServerResponse;
  }

  export class ServerRequestBase {
    constructor(conn: ServerConnection, init?: ServerRequestInit);

    readonly connection: ServerConnection;
  }

  interface ServerRequestInit {
    method?: string;
    path?: string;
    accept?: string;
    extraHeaders?: ServerRequestHeaders;
  }

  interface ServerRequestOptions {
    host?: string;
    port?: number | string;
    method: string;
    path?: string;
    auth?: string;
    headers: ServerRequestHeaders;
  }

  interface ServerResponse {
    statusCode?: number;
    headers: ServerResponseHeaders;
    content?: ContentValue;
  }
}
