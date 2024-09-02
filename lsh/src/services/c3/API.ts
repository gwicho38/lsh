/*
 * Copyright 2009-2024 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

import axios from "axios";
import AsyncLock from "async-lock";

const semaphore = new AsyncLock();

import { getAPIEndpoint } from "./utils";

interface AxiosResponse {
  data: any;
}

const URL = "";
// const URL = 'https://gkev8c3apps.c3-e.com/cor1556/c3';
const AUTH_TOKEN =
  "REDACTED";

// the proxy host settings for the devServer implies that api endpoints should only
// be given by /api/.../. Webpack will resolve the hostname.
export const c3FunctionCall = async (
  typeName: any,
  method: any,
  data?: any,
  onSuccess?: (arg0: any) => void
) => {
  const url = `/api/8/${typeName}/${method}`;
  try {
    // Prevent parallel writes/deletions
    return semaphore.acquire("request", async (done) => {
      try {
        const response = await axios.post(url, data);
        onSuccess?.(response.data);
        return response?.data;
      } catch (error) {
        console.error(error);
      } finally {
        done();
      }
    });
  } catch (e: any) {
    console.error(`Error running function ${typeName}.${method}`);
    return null;
  }
};

export async function getCountryByLatLng(feature: any) {
  try {
    const lat = feature?.geometry?.coordinates?.[0] || -122.40337362894088;
    const long = feature?.geometry?.coordinates?.[1] || 37.80134482900675;
    const url: string = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lat},${long}.json`;
    const params = new URLSearchParams([
      [
        "access_token",
        "REDACTED",
      ],
    ]);

    const response: AxiosResponse = await axios.get(url, { params });
    const countryFeature = response?.data?.features?.find((res) =>
      res.id.includes("country")
    );

    return countryFeature?.text;
  } catch (err) {
    console.error("Error getting location");
    return null;
  }
}
