/*
 * Copyright 2009-2024 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

function getDataImportDirectory() {
  const fs = FileSystem.inst();
  return fs.urlFromMount("/") + "import/";
}

function getDataExportDirectory() {
  const fs = FileSystem.inst();
  return fs.urlFromMount("/") + "export/";
}

function getMapImportDirectory() {
  const fs = FileSystem.inst();
  return fs.urlFromMount("/") + "mapImports/";
}

function getMapExportDirectory() {
  const fs = FileSystem.inst();
  return fs.urlFromMount("/") + "mapExports/";
}

function getOperationDirectory(operationId) {
  const fs = FileSystem.inst();
  // TODO re-organize filesystem directory structure to be organized by operation.
  // return fs.urlFromMount("/") + "operations/" + operationId + "/";
  return fs.urlFromMount("/");
}

function getDownloadPath(fileUrl) {
  return C3.app().endpoint() + "file/" + fileUrl;
}
