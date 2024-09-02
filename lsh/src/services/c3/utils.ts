/*
 * Copyright 2009-2024 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

import dayjs from "dayjs";

import { setLocalStorageValue } from "./LocalStorage";

/**
 * Function to update the theme across the application
 *
 * @param {string} theme
 * Accepts the theme in string format
 */
export function updateTheme(theme: "light" | "dark") {
  // Update the theme in local storage
  setLocalStorageValue("theme", theme);

  // Update the theme in the body tag with the new theme
  document
    .getElementsByTagName("body")[0]
    ?.setAttribute("class", `${theme} densed`);
}

export function isIterable(obj: any) {
  return obj != null && typeof obj[Symbol.iterator] === "function";
}

type GetBodyComputedStyles = {
  getComputedStyleValue: Function;
};

/**
 * Updates the height of the given element to fit the remaining space in the window.
 * @param element
 * @param withBottomPadding
 */
export function handleResize(
  element,
  withBottomPadding = false,
  handleOverflow = true
) {
  if (element) {
    const { y } = element.getBoundingClientRect();
    const padding = withBottomPadding ? 16 : 0;
    element.style.height = `${window.innerHeight - y - padding}px`;
    if (handleOverflow) element.style.overflowY = "auto";
  }
}

export function getBodyComputedStyles({
  body,
}: Document): GetBodyComputedStyles {
  // Gets the key/value pairs for all the css variables.
  const computedStyle = getComputedStyle(body);

  /**
   * Gets the computed value for a css property. The value is returned with an extra space at the beginning that
   * must be trimmed off.
   * @param propName The name of the css property whose value we want to retrieve.
   * @returns The computed style value, for example, '#121B3A' or 'rgba(127, 127, 127, 0.5)' or '12px'
   */
  return {
    getComputedStyleValue: (propName: string) =>
      computedStyle.getPropertyValue(propName).replace(/^\s/, ""),
  };
}

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
export function getAPIEndpoint(typeName: string, actionName: string): string {
  if (!typeName || !actionName)
    throw new Error(
      `Missing required arguments (Type: ${typeName}, Action: ${actionName}`
    );
  return `api/8/${typeName}/${actionName}`;
}

export const formatDateForC3Filter = (date: string) =>
  date && dayjs(date).format("YYYY-MM-DD");

export const formatDateTime = (date: string, format?: string) =>
  date && dayjs(date).format(format || "MM/DD/YYYY HH:mm:ss");

export const formatHumanReadableDurationInMinutes = (minutes: number) => {
  const isNegative = minutes < 0;
  if (isNegative) minutes = Math.abs(minutes);

  const days = Math.floor(minutes / (24 * 60));
  const remainingHours = Math.floor((minutes % (24 * 60)) / 60);
  const remainingMinutes = minutes % 60;

  const result: string[] = [];

  if (days > 0) {
    result.push(`${days} day${days > 1 ? "s" : ""}`);
  }

  if (remainingHours > 0) {
    result.push(`${remainingHours} hr${remainingHours > 1 ? "s" : ""}`);
  }

  if (remainingMinutes > 0 || (days === 0 && remainingHours === 0)) {
    result.push(`${remainingMinutes} min`);
  }

  if (isNegative) {
    result.push("ago");
  }

  return result.join(" ");
};

export const removeEmptyValues = (obj) =>
  Object.entries(obj).reduce(
    (res, [k, v]) => (v ? { ...res, [k]: v } : res),
    {}
  );

export function generateCSV(csvFileContent: string, filename: string) {
  const fileContent: string = csvFileContent;
  const url = URL.createObjectURL(
    new Blob([fileContent], { type: "text/csv" })
  );
  const link = document.createElement("a");
  link.href = url;
  link.innerText = filename || "export";
  link.download = `${link.innerText}.csv`;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/*
 * Convert base64 from C3 File.read()  to blob before downloading
 * From https://stackoverflow.com/questions/16245767/creating-a-blob-from-a-base64-string-in-javascript
 */
export function b64toBlob(b64Data, contentType = "", sliceSize = 512) {
  const byteCharacters = atob(b64Data);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);

    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  const blob = new Blob(byteArrays, { type: contentType });
  return blob;
}

export function downloadC3File(filename: string, csvFileContent: string) {
  const url = URL.createObjectURL(
    new Blob([csvFileContent], { type: "text/csv" })
  );
  const link = document.createElement("a");
  link.href = url;
  link.innerText = filename || "export";
  link.download = `${link.innerText}.csv`;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Moves an element from one index to another in a list
 * @param list list of elements
 * @param oldIndex old index of the element
 * @param newIndex new index of the element
 * @returns new list with the element moved to the new index
 */
export function moveElement(list: any[], oldIndex: number, newIndex: number) {
  // Create a duplicate copy of the current list
  const newList = [...list];

  // Remove the field from the list based on its index
  const elementToMove = newList.splice(oldIndex, 1)[0];

  // Add the field to the list to the new index based on its hover position
  newList.splice(newIndex, 0, elementToMove);

  // Return the modified list
  return newList;
}

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
export function getHourDiff(
  date1: Date | string,
  date2: Date | string
): number {
  const diff = dayjs(date2).diff(dayjs(date1), "hour");
  return diff;
}

export function getPercentageChange(
  previousValue: number,
  currentValue: number
): string {
  // If previous value is 0, return 100%
  const diff = currentValue - previousValue;
  const percentage = Math.abs((diff / previousValue) * 100);
  return `${
    percentage === 100 || percentage === 0
      ? percentage.toFixed(0)
      : percentage.toFixed(1)
  }%`;
}

/**
 * Retrieves URL parameter value if provided
 * @param name
 * Name of the URL parameter for which to retrieve the value
 * @param location
 * The location object representing a URL
 * @returns {string}
 * The value of the URL parameter at the given location
 */
export function getUrlParam(location, name) {
  const searchParams = new URLSearchParams(location.search);
  return searchParams.get(name);
}

/**
 * Retrieves UTC Offset Integer from a given military time zone name
 * @param milTimeZoneId
 * Name of the military time zone
 * @returns {number}
 * UTC Offset Integer
 */
export function getOffsetFromMilTimeZone(milTimeZoneId) {
  const timeZoneToOffsetMap = new Map();
  timeZoneToOffsetMap.set("Alpha Time Zone", 1);
  timeZoneToOffsetMap.set("Bravo Time Zone", 2);
  timeZoneToOffsetMap.set("Charlie Time Zone", 3);
  timeZoneToOffsetMap.set("Delta Time Zone", 4);
  timeZoneToOffsetMap.set("Echo Time Zone", 5);
  timeZoneToOffsetMap.set("Foxtrot Time Zone", 6);
  timeZoneToOffsetMap.set("Golf Time Zone", 7);
  timeZoneToOffsetMap.set("Hotel Time Zone", 8);
  timeZoneToOffsetMap.set("India Time Zone", 9);
  timeZoneToOffsetMap.set("Kilo Time Zone", 10);
  timeZoneToOffsetMap.set("Lima Time Zone", 11);
  timeZoneToOffsetMap.set("Mike Time Zone", 12);
  timeZoneToOffsetMap.set("November Time Zone", -1);
  timeZoneToOffsetMap.set("Oscar Time Zone", -2);
  timeZoneToOffsetMap.set("Papa Time Zone", -3);
  timeZoneToOffsetMap.set("Quebec Time Zone", -4);
  timeZoneToOffsetMap.set("Romeo Time Zone", -5);
  timeZoneToOffsetMap.set("Sierra Time Zone", -6);
  timeZoneToOffsetMap.set("Tango Time Zone", -7);
  timeZoneToOffsetMap.set("Uniform Time Zone", -8);
  timeZoneToOffsetMap.set("Victor Time Zone", -9);
  timeZoneToOffsetMap.set("Whiskey Time Zone", -10);
  timeZoneToOffsetMap.set("X-ray Time Zone", -11);
  timeZoneToOffsetMap.set("Yankee Time Zone", -12);
  timeZoneToOffsetMap.set("Zulu Time Zone", 0);

  return timeZoneToOffsetMap.get(milTimeZoneId);
}

/**
 * Retrieves MilTimeZone object from a given utc offset integer
 * @param utcOffset
 * UTC Offset Integer
 * @returns {Object}
 * MilTimeZone object
 */
export function getMilTimeZoneFromOffset(utcOffset) {
  const utcOffsetToMilTimeZoneMap = new Map();
  utcOffsetToMilTimeZoneMap.set("1", { id: "Alpha Time Zone" });
  utcOffsetToMilTimeZoneMap.set("2", { id: "Bravo Time Zone" });
  utcOffsetToMilTimeZoneMap.set("3", { id: "Charlie Time Zone" });
  utcOffsetToMilTimeZoneMap.set("4", { id: "Delta Time Zone" });
  utcOffsetToMilTimeZoneMap.set("5", { id: "Echo Time Zone" });
  utcOffsetToMilTimeZoneMap.set("6", { id: "Foxtrot Time Zone" });
  utcOffsetToMilTimeZoneMap.set("7", { id: "Golf Time Zone" });
  utcOffsetToMilTimeZoneMap.set("8", { id: "Hotel Time Zone" });
  utcOffsetToMilTimeZoneMap.set("9", { id: "India Time Zone" });
  utcOffsetToMilTimeZoneMap.set("10", { id: "Kilo Time Zone" });
  utcOffsetToMilTimeZoneMap.set("11", { id: "Lima Time Zone" });
  utcOffsetToMilTimeZoneMap.set("12", { id: "Mike Time Zone" });
  utcOffsetToMilTimeZoneMap.set("-1", { id: "November Time Zone" });
  utcOffsetToMilTimeZoneMap.set("-2", { id: "Oscar Time Zone" });
  utcOffsetToMilTimeZoneMap.set("-3", { id: "Papa Time Zone" });
  utcOffsetToMilTimeZoneMap.set("-4", { id: "Quebec Time Zone" });
  utcOffsetToMilTimeZoneMap.set("-5", { id: "Romeo Time Zone" });
  utcOffsetToMilTimeZoneMap.set("-6", { id: "Sierra Time Zone" });
  utcOffsetToMilTimeZoneMap.set("-7", { id: "Tango Time Zone" });
  utcOffsetToMilTimeZoneMap.set("-8", { id: "Uniform Time Zone" });
  utcOffsetToMilTimeZoneMap.set("-9", { id: "Victor Time Zone" });
  utcOffsetToMilTimeZoneMap.set("-10", { id: "Whiskey Time Zone" });
  utcOffsetToMilTimeZoneMap.set("-11", { id: "X-ray Time Zone" });
  utcOffsetToMilTimeZoneMap.set("-12", { id: "Yankee Time Zone" });
  utcOffsetToMilTimeZoneMap.set("0", { id: "Zulu Time Zone" });
  return utcOffsetToMilTimeZoneMap.get(utcOffset);
}
