/*
 * Copyright 2009-2022 C3 (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

const chokidar = require('chokidar');
const path = require('path');

const CONFIG = require('./../config');
const handleEvent = require('./handleEvent');
const { getPkgId } = require('./shared');
const c3Post = require('./api');

const WATCHDIRS = CONFIG.PACKAGES_TO_SYNC.map(package => path.join(CONFIG.PATH_TO_PACKAGE_REPO, package));

console.log(getPkgId());

// Usage
const rootPkg = (async () => {
  try {
    const typeName = 'Pkg'; // Replace with your type name
    const method = 'inst'; // Replace with your method name
    const data = {}; // Your data object

    const responseBody = await c3Post(typeName, method, data);
    // const responseString = JSON.stringify(responseBody); // Convert the response body to a string
    console.log("response: ", responseBody); // Use the response string as needed

  } catch (error) {
    console.error('Error making POST request:', error);
  }
})();

console.log(rootPkg);

chokidar.watch(WATCHDIRS, {
  ignoreInitial: true,
  ignored: (filePath) => {
    return filePath.includes('gen/cache')
      || filePath.includes('.c3doc')
      || filePath.includes('.jpg')
      || filePath.includes('.png');
  },
}).on('all', handleEvent);
//
// console.log('View live Type updates by navigating to ' + CONFIG.APPURL + '/static/console');
// console.log('Listening to file updates at: \n' + WATCHDIRS.join('\n'));
