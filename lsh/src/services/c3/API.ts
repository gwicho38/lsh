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
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzUxMiJ9.eyJhcHAiOiJna2V2OGMzYXBwcy1jb3IxNTU2LWMzIiwiaXNzIjoiYzMuYWkiLCJncm91cHMiOlsiQzMuRW52QWRtaW4iXSwic2lkIjoxLCJhdWQiOiJjMy5haSIsImlkcCI6IiIsImMzZ3JvdXBzIjpbIkMzLkVudkFkbWluIl0sImlkcGdyb3VwcyI6IntcIk9pZGNJZHBDb25maWc6OmdrZXY4YzNhcHBzLmMzLWUuY29tXCI6W1wiZ2tldjhjM2FwcHMuYzMtZS5jb20vQzMuU3R1ZGlvVXNlclwiXX0iLCJzc2lkeCI6IiIsIm5hbWUiOiIzMWNmNGZlZThjYWExYTZlMzAxYmQ3OTNkNTUzODUzYmM2NzYxM2RkY2Q5MjJiNWNkNTg1NzIwZDMyN2U2ZjEzIiwiYWN0aW9uaWQiOiI3Mjg1Ljc5MzI3MSIsImlkIjoiMzFjZjRmZWU4Y2FhMWE2ZTMwMWJkNzkzZDU1Mzg1M2JjNjc2MTNkZGNkOTIyYjVjZDU4NTcyMGQzMjdlNmYxMyIsImV4cCI6MTcxOTYwNjA5NDAwMCwiZW1haWwiOiJsdWlzLmZlcm5hbmRlei1kZS1sYS12YXJhQGMzLmFpIn0.LsLD08MoEA6Tk2MFgfu_A_ZM6WB4CsFLlPl96z0qGiIobYXuthWerWXOWXM6qziny9EVNUAU_ehl6Sm1DQGSvJVmWKud5mYvYNG6FJcO64knLBrf22OE9a-hhuGVrywMvozEY-WrNbF5iBvdvJnqjuZJJeEZwcBqJi99XxDwkJIB5iA583-rGOWpPRNGArqQW29qgEST3SZv4TrGVdh9TMuREOb8pv0S9zJZpTAIWq5rtn-TrwCU3DyP4UIMYAMGaUO8sssSrYQS4XwZ8H8-2vonddxZKIBGKxKfVk8WKp770PvmnvR8kOCFyps-gGHn0nhlKW_NuX9U_M7kYtGLTw";

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
        "pk.eyJ1IjoiYzMtdG9ueSIsImEiOiJjbG5mcDQxcGQwbjJlMmtwa251amttbWw2In0.B6S7yOY4GCb4koTVoUt1kQ",
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
