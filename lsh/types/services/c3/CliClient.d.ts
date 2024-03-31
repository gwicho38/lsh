declare module 'c3-thin';
declare module '@c3/c3-remote';
type Pair<F, S> = {
    fst: F;
    snd: S;
};
/**
 * Enum-like map to keep track of supported major versions
 *
 * @enum {string}
 * @returns {string} The supported major versions
 */
export declare enum ServerVersions {
    V7 = "7",
    V8 = "8"
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
    packageLock?: {
        [key: string]: string;
    };
};
export type App = {
    id: string;
    name: string;
    serverVersion: string;
};
export declare class CliClient {
    static typeName: string;
    static defaultNpmRegistryUrl: string;
    static serverVersionForNpmConfig: string;
    url: string;
    token: string;
    tenant: string;
    tag: string;
    version: string | null;
    typeSystem: unknown;
    constructor(url: string, token: string, tenant: string, tag: string);
    setToken(token: string): void;
    initializeConnection(): Promise<void>;
    getTypeSystem(): Promise<unknown>;
    sendTypeRequest(typeName: string, action: string, actionArguments?: {
        [key: string]: unknown;
    }): Promise<unknown>;
    sendRequest(action: string, actionArguments?: {
        [key: string]: unknown;
    }): Promise<unknown>;
    /**
     * Checks if the root package depends on uiBundler
     *
     * @returns true if the root package depends on uiBundler
     */
    rootPackageDependsOnUiBundler(): Promise<boolean>;
    /**
     * Validates the URL that this CliClient is using.
     *
     * @param isTestMode NOT USED.
     * @returns A value that indicates which validation failed
     */
    validate(isTestMode?: boolean): Promise<void>;
    produceUiFiles(uiNamespace: string): Promise<{
        [key: string]: string;
    }>;
    getActionRuntime(): Promise<{
        [key: string]: string;
    }>;
    getAppActionRuntime(uiNamespace: string): Promise<{
        [key: string]: string;
    }>;
    getMergedRuntime(): Promise<JsRuntime>;
    getMergedRuntimeLibraries(runtime: JsRuntime): Promise<{
        [key: string]: string;
    }>;
    getTranslations(locale?: string): Promise<Translation[]>;
    /**
     * Gets the translations for a particular locale, including the passed locale's parent locales if any.
     *
     * @param {string} locale - The locale as a string, e.g. "en_US"
     * @returns A json string with the translation keys as strings, and the translation values (what is displayed
     *   on the page) as values
     */
    getTranslationsIncludingParentLocales(locale: string): Promise<string>;
    upsertTranslations(allLocalTranslations: unknown[]): Promise<Translation[]>;
    addImportsAndExportsBatch(inputs: unknown[]): Promise<unknown[]>;
    generateUiSdlComponentSourceCodeBatch(inputs: Pair<string, unknown>[]): Promise<GeneratedComponent[]>;
    addImportsAndExports(code: string, componentType: string): Promise<string>;
    getUiRoutes(): Promise<UiSdlRoute[]>;
    getDependencies(): Promise<string[]>;
    /**
     * @deprecated Use generateUiSdlComponentSourceCodeBatch
     * @param componentId the component's id
     * @param componentMetadata the component's metadata
     * @returns the source code for a single component
     */
    generateUiSdlComponentSourceCode(componentId: string, componentMetadata: unknown): Promise<string>;
    uploadFiles(metadtaPathToContent: {
        [path: string]: ContentValue;
    }): Promise<unknown>;
    upsertBatchRoutes(routes: unknown[]): Promise<UiSdlRoute[]>;
    getRootPackageName(): Promise<string>;
    typeIsRemixing(typeName: string): Promise<string | boolean | null>;
    npmRegistryUrl(): Promise<string>;
}
export {};
