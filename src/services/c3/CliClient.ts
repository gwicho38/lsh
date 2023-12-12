/*
 * Copyright 2009-2023 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

import { URL } from "url";
import https from "https";
import http from "http";

import type { AsyncThinTypeSystem as AsyncThinTypeSystemV7 } from "c3-thin";
import type { AsyncThinTypeSystem as AsyncThinTypeSystemV8 } from "@c3/remote";

import Logger, { LogLevel } from "./lib/Logger";
import { Package } from "./subProcesses/repoWatcher/repository";
// import { findSSLCertificate } from "./util/BundlerUtils";

const logger = new Logger(LogLevel.INFO);

const POLLING_AUTH_TOKEN_TIMEOUT = 120000;
const POLLING_AUTH_TOKEN_INTERVAL = 3000;

/**
 * When getting major server version, we don't have the c3 remote retry functionality yet, so we have to implement
 * our own retry functionality for this first request to the server.
 *
 * @param url The server url to fetch.
 * @param fetchOptions The options for the fetch.
 * @param retries The number of times to try retrying.
 * @param retryDelay The delay for each retry.
 * @param timeout Optional timeout. If this time limit is hit before the three requests are made, it will reject.
 * @returns Promise to resolve or reject.
 */

const retryFetch = (
  url: string,
  fetchOptions = {},
  retries = 3,
  retryDelay = 1000,
  timeout = 0
): Promise<ServerVersions> => {
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  return new Promise((resolve, reject) => {
    if (timeout) {
      setTimeout(
        () => reject("Error: Timed out trying to fetch from server."),
        timeout
      );
    }

    const wrapper = (n: number) => {
      const urlProtocol = url.startsWith("http:") ? http : https;
      const req = urlProtocol.request(url, fetchOptions, (res) => {
        const statusCode = res.statusCode;
        const statusMessage = res.statusMessage;

        if (statusCode && statusCode >= 200 && statusCode < 300) {
          res.on("data", (chunk: Buffer) => {
            const version = chunk.toString();
            if (version.startsWith("v7")) {
              resolve(ServerVersions.V7);
            } else {
              resolve(ServerVersions.V8);
            }
          });
        } else {
          reject(
            new Error(
              `Failed to get server version. Fetch request on ${url} failed with ${
                statusCode || "Unknown status code"
              } ${statusMessage || "Unknown status message"}`
            )
          );
        }
      });

      req.on("error", async (err) => {
        if (n > 0) {
          await delay(retryDelay);
          wrapper(--n);
        } else {
          reject(err);
        }
      });

      req.end();
    };

    wrapper(retries);
  });
};

/**
 * Retrieves the c3 server version.
 *
 * @param url A c3 server url
 * @param authToken A c3 authentication token
 * @returns the c3 server version
 */
async function getMajorServerVersion(
  url: string,
  authToken: string
): Promise<ServerVersions> {
  const versionUrl = new URL(url);
  // eslint-disable-next-line scanjs-rules/assign_to_pathname
  versionUrl.pathname =
    (versionUrl.pathname || "").replace(/\/+$/, "") + "/version";
  const method = "GET";
  const sslCertificate = findSSLCertificate();
  const headers = {
    Authorization: authToken,
    Accept: "text/html",
    "Accept-Encoding": "gzip",
  };
  const options = { method, headers, ca: sslCertificate };
  try {
    const response = await retryFetch(versionUrl.toString(), options);
    return response;
  } catch (error) {
    throw new Error(
      `Couldn't contact server to get server version: ${JSON.stringify(error)}`
    );
  }
}

type Pair<F, S> = {
  fst: F;
  snd: S;
};

type HttpHeaders = {
  location: string;
};

type HttpResponse = {
  statusCode: number;
  responseText: string;
  headers: HttpHeaders;
  header: (location: string) => string;
};

/**
 * Enum-like map to keep track of supported major versions
 *
 * @enum {string}
 * @returns {string} The supported major versions
 */
export enum ServerVersions {
  V7 = "7",
  V8 = "8",
}

export interface Locale {
  id: string;
  language: string;
  region: string;
}

export interface Translation {
  id: string;
  key: string;
  value: string;
  locale: Locale;
}

export type UiSdlRoute = {
  name: string;
  urlPath: string;
  targetModuleName: string;
  targetPageName: string;
  role?: string;
};

export type ContentValue = {
  type: string;
  contentLength: number;
  content: string;
};

export type GeneratedComponent = {
  content: string;
};

export type JsRuntime = {
  libraries: string[];
  name: string;
  packageLock?: { [key: string]: string };
};

export type App = {
  id: string;
  name: string;
  serverVersion: string;
};

export default class CliClient {
  static typeName = "UiBundlerCli";

  static defaultNpmRegistryUrl = "https://registry.npmjs.org/";

  static serverVersionForNpmConfig = "8.3.1";

  url: string;

  token: string;

  tenant: string;

  tag: string;

  version: string | null;

  typeSystem: unknown;

  constructor(url: string, token: string, tenant: string, tag: string) {
    this.url = url;
    this.token = token;
    this.tenant = tenant;
    this.tag = tag;
    this.version = null;
    this.typeSystem = null;
  }

  setToken(token: string): void {
    this.token = token;
    if (this.typeSystem) {
      (this.typeSystem as AsyncThinTypeSystemV8).connection().$authz = token;
    }
  }

  async initializeConnection(): Promise<void> {
    if (this.version == null) {
      this.version = await getMajorServerVersion(this.url, this.token);
    }
    if (this.typeSystem == null) {
      this.typeSystem = await this.getTypeSystem();
    }
  }

  async getTypeSystem(): Promise<unknown> {
    let conn;
    let ServerConnectionV7;
    let ts;
    let connectSpec;

    // Different code is needed for v7 and v8, that will be taken care of as an abstraction of the type system.
    switch (this.version) {
      case ServerVersions.V7:
        ServerConnectionV7 = (await import("c3-thin")).ServerConnection;
        conn = new ServerConnectionV7(
          this.url,
          this.token,
          this.tenant,
          this.tag
        );

        return conn.asyncThinTypeSys();

      case ServerVersions.V8:
        await import("@c3/remote");
        connectSpec = {
          numRetries: 3,
          async: true,
          redirectLoginHandler: async (response: HttpResponse) => {
            if (response.statusCode === 302) {
              const oldToken = this.token;
              const redirectUrl =
                response?.headers?.location ?? response?.header?.("location");
              if (!redirectUrl) {
                throw new Error(
                  "Login Redirect URL is invalid, authentication has failed."
                );
              }
              const startTime = Date.now();
              process.send?.({ type: "REFRESH_AUTH_TOKEN", url: redirectUrl });
              return new Promise((resolve, reject) => {
                const intervalId = setInterval(() => {
                  logger.info("Polling for new auth token");
                  if (oldToken !== this.token) {
                    clearInterval(intervalId);
                    resolve(this.token);
                  } else if (
                    Date.now() - startTime >=
                    POLLING_AUTH_TOKEN_TIMEOUT
                  ) {
                    clearInterval(intervalId);
                    reject(
                      new Error(
                        "The auth token was not updated after 2 minutes, authentication has failed."
                      )
                    );
                  }
                }, POLLING_AUTH_TOKEN_INTERVAL);
              });
            } else {
              throw new Error(
                `There was an invalid response from the redirectLoginHandler ${response.responseText} with status code: " ${response.statusCode}`
              );
            }
          },
        };
        // eslint-disable-next-line @typescript-eslint/unbound-method
        conn = await C3.connectAsync(
          this.url,
          this.token,
          undefined,
          connectSpec
        );
        ts = conn.asyncThinTypeSystem();

        return ts;

      default:
        throw new Error("Unsupported server version");
    }
  }

  async sendTypeRequest(
    typeName: string,
    action: string,
    actionArguments?: { [key: string]: unknown }
  ): Promise<unknown> {
    await this.initializeConnection();
    try {
      if (this.version === ServerVersions.V7) {
        const type = await (this.typeSystem as AsyncThinTypeSystemV7).get(
          typeName
        );
        return type.call(action, actionArguments);
      } else if (this.version === ServerVersions.V8) {
        /*
         * TODO: V8 we need to update this to use the real async thin type system, for now
         * we are using the full sync type system.
         */
        const type = await (this.typeSystem as AsyncThinTypeSystemV8).type(
          typeName
        );
        return Promise.resolve(await type.callByName(action, actionArguments));
      } else {
        throw new Error("Unknown server version");
      }
    } catch (e) {
      const msg = `Error from server: ${
        e instanceof Error ? e.stack || "Unknown Error" : JSON.stringify(e)
      }`;
      logger.error(msg);
      throw new Error(msg);
    }
  }

  async sendRequest(
    action: string,
    actionArguments?: { [key: string]: unknown }
  ): Promise<unknown> {
    return this.sendTypeRequest(CliClient.typeName, action, actionArguments);
  }

  /**
   * Checks if the root package depends on uiBundler
   *
   * @returns true if the root package depends on uiBundler
   */
  async rootPackageDependsOnUiBundler(): Promise<boolean> {
    let dependencies;
    switch (this.version) {
      case ServerVersions.V7: {
        const rootPackage = await this.sendTypeRequest(
          "TagMetadataStore",
          "rootPackage"
        );
        const allDependencies = (await this.sendTypeRequest(
          "MetadataPackage",
          "allDependencies",
          { this: rootPackage }
        )) as Package[];
        dependencies = allDependencies.map((dependency) => dependency.name);
        break;
      }
      case ServerVersions.V8: {
        dependencies = (await this.sendTypeRequest(
          "Pkg",
          "dependencyNames"
        )) as string[];
        break;
      }
      default:
        return false;
    }
    return (
      dependencies?.includes("uiBundler") ||
      dependencies?.includes("uiBundlerFrozen")
    );
  }

  /**
   * Validates the URL that this CliClient is using.
   *
   * @param isTestMode NOT USED.
   * @returns A value that indicates which validation failed
   */
  async validate(isTestMode?: boolean): Promise<void> {
    const validDependency = await this.rootPackageDependsOnUiBundler();
    if (!validDependency) {
      throw new Error(
        "Cannot bundle your app! You need to add uiComponentLibraryReact as a dependency"
      );
    }
    const validationError = (await this.sendRequest("validate", {
      isTestMode,
    })) as string;
    if (validationError) {
      throw new Error(validationError);
    }
  }

  async produceUiFiles(
    uiNamespace: string
  ): Promise<{ [key: string]: string }> {
    return this.sendRequest("produceUiFiles", {
      uiNamespace: uiNamespace,
    }) as Promise<{ [key: string]: string }>;
  }

  async getActionRuntime(): Promise<{ [key: string]: string }> {
    return this.sendRequest("getActionRuntime") as Promise<{
      [key: string]: string;
    }>;
  }

  async getAppActionRuntime(
    uiNamespace: string
  ): Promise<{ [key: string]: string }> {
    return this.sendRequest("getAppActionRuntime", {
      uiNamespace,
    }) as Promise<{ [key: string]: string }>;
  }

  async getMergedRuntime(): Promise<JsRuntime> {
    return this.sendRequest("getMergedRuntime") as Promise<JsRuntime>;
  }

  async getMergedRuntimeLibraries(
    runtime: JsRuntime
  ): Promise<{ [key: string]: string }> {
    return this.sendRequest("getMergedRuntimeLibraries", {
      runtime,
    }) as Promise<{ [key: string]: string }>;
  }

  async getTranslations(locale?: string): Promise<Translation[]> {
    return this.sendRequest("getTranslations", {
      locale,
    }) as Promise<Translation[]>;
  }

  /**
   * Gets the translations for a particular locale, including the passed locale's parent locales if any.
   *
   * @param {string} locale - The locale as a string, e.g. "en_US"
   * @returns A json string with the translation keys as strings, and the translation values (what is displayed
   *   on the page) as values
   */
  async getTranslationsIncludingParentLocales(locale: string): Promise<string> {
    return this.sendRequest("getTranslationsIncludingParentLocales", {
      locale,
    }) as Promise<string>;
  }

  async upsertTranslations(
    allLocalTranslations: unknown[]
  ): Promise<Translation[]> {
    return this.sendRequest("upsertTranslations", {
      allLocalTranslations: allLocalTranslations,
    }) as Promise<Translation[]>;
  }

  async addImportsAndExportsBatch(inputs: unknown[]): Promise<unknown[]> {
    return this.sendRequest("addImportsAndExportsBatch", {
      inputs,
    }) as Promise<unknown[]>;
  }

  async generateUiSdlComponentSourceCodeBatch(
    inputs: Pair<string, unknown>[]
  ): Promise<GeneratedComponent[]> {
    return this.sendRequest("generateUiSdlComponentSourceCodeBatch", {
      inputs,
    }) as Promise<GeneratedComponent[]>;
  }

  async addImportsAndExports(
    code: string,
    componentType: string
  ): Promise<string> {
    return this.sendRequest("addImportsAndExports", {
      code,
      componentType,
    }) as Promise<string>;
  }

  async getUiRoutes(): Promise<UiSdlRoute[]> {
    return this.sendRequest("getUiRoutes") as Promise<UiSdlRoute[]>;
  }

  async getDependencies(): Promise<string[]> {
    return this.sendRequest("getDependencies") as Promise<string[]>;
  }

  /**
   * @deprecated Use generateUiSdlComponentSourceCodeBatch
   * @param componentId the component's id
   * @param componentMetadata the component's metadata
   * @returns the source code for a single component
   */
  async generateUiSdlComponentSourceCode(
    componentId: string,
    componentMetadata: unknown
  ): Promise<string> {
    return this.sendRequest("generateUiSdlComponentSourceCode", {
      componentId,
      componentMetadata,
    }) as Promise<string>;
  }

  async uploadFiles(metadtaPathToContent: {
    [path: string]: ContentValue;
  }): Promise<unknown> {
    return this.sendRequest("uploadFiles", {
      metadtaPathToContent,
    });
  }

  async upsertBatchRoutes(routes: unknown[]): Promise<UiSdlRoute[]> {
    return this.sendRequest("upsertBatchRoutes", {
      routes: routes,
    }) as Promise<UiSdlRoute[]>;
  }

  async getRootPackageName(): Promise<string> {
    if (this.version === ServerVersions.V8) {
      const packageName = (await this.sendTypeRequest("Pkg", "name")) as string;
      return packageName;
    }
    return this.tenant;
  }

  async typeIsRemixing(typeName: string): Promise<string | boolean | null> {
    return this.sendRequest("typeIsRemixing", {
      typeName,
    }) as Promise<string | boolean | null>;
  }

  async npmRegistryUrl(): Promise<string> {
    try {
      // Older server versions that don't have `UiBundlerCli.getNpmRegistryUrl` method will error here
      return (await this.sendRequest("npmRegistryUrl")) as Promise<string>;
    } catch (e) {
      if (
        e instanceof Error &&
        (e.message.includes("Missing UiBundlerCli#method[npmRegistryUrl].") ||
          e.message.includes(
            "Error invoking JavaScript method UiBundlerCli#npmRegistryUrl"
          ))
      ) {
        // Promise here is required to make compiler happy and be able to await this function
        return Promise.resolve(CliClient.defaultNpmRegistryUrl);
      } else {
        throw e;
      }
    }
  }
}
