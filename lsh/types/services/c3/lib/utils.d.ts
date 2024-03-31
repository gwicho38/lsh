export declare const bundleUpdateTitle = "Bundle Status Update";
/**
 * Describes shape payload passed between Tab and C3Application to load a C3Application
 */
export type PageInfo = {
    tabId: string;
    url: string;
    isTest: boolean;
    authToken: string;
    firstLoadInTab: boolean;
    tenant?: string;
    tag?: string;
};
/**
 * Describes shape of FetchResult
 */
export interface FetchResult<T> {
    objs: T[];
    count?: number;
}
export interface DefaultHeaderInfo {
    headers: {
        "x-c3-tenant": string;
        "x-c3-tag": string;
    };
}
/**
 * Default tenant and tag for a c3 server URL
 */
export interface DefaultTenantTagInfo {
    defaultTenant: string;
    defaultTag: string;
}
/**
 * Describes shape of MetadataFile fetched from c3server
 */
export interface MetadataFile {
    url: string;
    repository: string;
    package: string;
    category: string;
    isTest: boolean;
    encodedSubPath: string;
    hasMetadata: boolean;
    contentLength: number;
    contentType: string;
    lastModified: Date;
    contentMD5: string;
}
/**
 * Describes shape of VanityUrls fetched from server
 */
export interface VanityUrl {
    defaultContent?: string;
    name: string;
    tag: string;
    tenant: string;
}
/**
 * Used to store VanityUrl along with other relevant info for an app
 */
export interface RemoteApplication {
    uiNamespace: string;
    rootPackageName: string;
    tenant: string;
    tag: string;
    url: string;
    authToken: string;
    isHybrid: boolean;
    testMetadataExists: boolean;
}
/**
 * Url and title for internal ui-ide pages
 */
export interface InternalPageInfo {
    url: string;
    title?: string;
}
/**
 * Subprocess updates that are sent to loading page
 */
export interface SubprocessUpdate {
    message: string;
    progressIndicator: string;
}
/**
 * Value returned from UiBundlerConfig configValue API
 */
export interface UiBundlerConfigValue {
    type: string;
    value: boolean;
}
/**
 * Subprocess updates for different subprocesses
 */
export declare const subprocessUpdates: Array<SubprocessUpdate>;
/**
 * A helper type that allows for defining a string literal type based on the required keys of another type.
 * Example:
 * type MyType = {
 *  a: string;
 *  b: string;
 *  c?: string;
 * }
 *
 * type MyTypeAllowedValues = RequiredKeys<MyType>; // => "a" | "b"
 *
 * const somestring: MyTypeAllowedValues = "a"; ✅
 * const somestring: MyTypeAllowedValues = "z"; ❌
 */
export type RequiredKeys<T> = {
    [K in keyof T]-?: Record<string, unknown> extends Pick<T, K> ? never : K;
}[keyof T];
