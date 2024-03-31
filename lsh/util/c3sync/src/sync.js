/*
 * Copyright 2009-2022 C3 (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

import { watch } from 'chokidar';
import { join } from 'path';

import { PACKAGES_TO_SYNC, PATH_TO_PACKAGE_REPO, APPURL } from '../config';
import handleEvent from './handleEvent';

const WATCHDIRS = PACKAGES_TO_SYNC.map(pkg => join(PATH_TO_PACKAGE_REPO, pkg));

const watcher = watch(WATCHDIRS, {
  ignoreInitial: true,
  ignored: (filePath) => {
    return filePath.includes('gen/cache')
      || filePath.includes('.c3doc')
      || filePath.includes('.jpg')
      || filePath.includes('.png');
  },
})
watcher.on('all', handleEvent);

console.log('View live Type updates by navigating to ' + APPURL + '/static/console');
console.log('Listening to file updates at: \n' + WATCHDIRS.join('\n'));
