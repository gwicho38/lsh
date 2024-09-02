/**
 * Function to update the theme across the application
 *
 * @param {string} theme
 * Accepts the theme in string format
 */
export declare function updateTheme(theme: "light" | "dark"): void;
export declare function isIterable(obj: any): boolean;
type GetBodyComputedStyles = {
    getComputedStyleValue: Function;
};
/**
 * Updates the height of the given element to fit the remaining space in the window.
 * @param element
 * @param withBottomPadding
 */
export declare function handleResize(element: any, withBottomPadding?: boolean, handleOverflow?: boolean): void;
export declare function getBodyComputedStyles({ body, }: Document): GetBodyComputedStyles;
/**
 *
 * @param {string} typeName
 * Accepts the backend type name as a string
 *
 * @param {string} actionName
 * Accepts the action defined on the given type as a string
 *
 * @returns {string}
 * A string that formulates the v8 api to hit the given function on the given type
 */
export declare function getAPIEndpoint(typeName: string, actionName: string): string;
export declare const formatDateForC3Filter: (date: string) => string;
export declare const formatDateTime: (date: string, format?: string) => string;
export declare const formatHumanReadableDurationInMinutes: (minutes: number) => string;
export declare const removeEmptyValues: (obj: any) => {};
export declare function generateCSV(csvFileContent: string, filename: string): void;
export declare function b64toBlob(b64Data: any, contentType?: string, sliceSize?: number): Blob;
export declare function downloadC3File(filename: string, csvFileContent: string): void;
/**
 * Moves an element from one index to another in a list
 * @param list list of elements
 * @param oldIndex old index of the element
 * @param newIndex new index of the element
 * @returns new list with the element moved to the new index
 */
export declare function moveElement(list: any[], oldIndex: number, newIndex: number): any[];
/**
 * Helper function to get the difference between two dates in hours
 *
 * @param {Date | string} date1
 * The date to compare against
 * @param {Date | string} date2
 * The date to compare with
 *
 * @returns {number}
 * The difference between the two dates in hours
 */
export declare function getHourDiff(date1: Date | string, date2: Date | string): number;
export declare function getPercentageChange(previousValue: number, currentValue: number): string;
/**
 * Retrieves URL parameter value if provided
 * @param name
 * Name of the URL parameter for which to retrieve the value
 * @param location
 * The location object representing a URL
 * @returns {string}
 * The value of the URL parameter at the given location
 */
export declare function getUrlParam(location: any, name: any): string;
/**
 * Retrieves UTC Offset Integer from a given military time zone name
 * @param milTimeZoneId
 * Name of the military time zone
 * @returns {number}
 * UTC Offset Integer
 */
export declare function getOffsetFromMilTimeZone(milTimeZoneId: any): any;
/**
 * Retrieves MilTimeZone object from a given utc offset integer
 * @param utcOffset
 * UTC Offset Integer
 * @returns {Object}
 * MilTimeZone object
 */
export declare function getMilTimeZoneFromOffset(utcOffset: any): any;
export {};
