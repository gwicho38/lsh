// Import axios with ES Module syntax
import axios from 'axios';
// Import CONFIG with ES Module syntax, assuming config.js has been updated to export a CONFIG object
import { CONFIG } from './../config.js'; // Adjust the relative path as necessary

/**
 * Makes a POST request to a specified endpoint using Axios.
 * 
 * @param {string} typeName The type name for the request.
 * @param {string} method The method name for the request.
 * @param {Object} data The payload for the POST request.
 * @returns {Promise} The promise object representing the result of the HTTP request.
 */
export async function c3Post(typeName, method, data) {
  const url = `${CONFIG.APPURL}/api/8/${typeName}/${method}`;

  try {
    const response = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: CONFIG.AUTH_TOKEN,
      },
    });

    // Return the response data. Adjust according to your needs, for example, you might want to return `response.data` directly.
    return response;
  } catch (error) {
    // Handle errors as per your existing logic
    if (error.response) {
      console.log(error.response.data);
      console.log(error.response.status);
      console.log(error.response.headers);
      throw error.response;
    } else if (error.request) {
      console.log(error.request);
      throw error.request;
    } else {
      console.log('Error', error.message);
      throw error.message;
    }
  }
}
