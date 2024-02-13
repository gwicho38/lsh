const c3Post = require("../api");

async function postToRootPkg() {
  try {
    const typeName = 'Pkg'; // Replace with your type name
    const method = 'inst'; // Replace with your method name
    const data = {}; // Your data object

    const responseBody = await c3Post(typeName, method, data);
    // const responseString = JSON.stringify(responseBody); // Optionally convert the response body to a string
    console.log("response: ", responseBody); // Use the response string as needed
    return responseBody;
  } catch (error) {
    console.error('Error making POST request:', error);
    return "";
  }
}

module.exports = { postToRootPkg };
