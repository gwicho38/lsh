/*
 * Copyright 2009-2023 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

// CHANGE: added engineLog to return
function chatIncludeString() {
  return '[this, user.email, engineLog, {responseAiResult: [answer, failed, visualization, { statusHistory: [status, statusParent] }, meta.created,\
    { passages: [\
      { sourceFile: [originalFile.url, displayUrl] }\
    ] },\
    { rationaleSources: [\
      { sourceFile: [originalFile.url, displayUrl, name, metadata] },\
      { passage: [content, contentStr, pageNumber, metadata ]},\
    ] }\
  ]}]';
}

// CHANGE: added engineLog to return
function queryIncludeString() {
  return '[answer, cached, rationale, engineLog, failed, visualization, meta.created, {statusHistory: [status, statusParent]}, \
  { searchQuery: [standaloneQuery] }, \
  { passages: [\
    scaledScore, { sourceFile: [originalFile.url, displayUrl, name] }\
  ] }, \
  { rationaleSources: [\
    passageUiDisplayIndex,\
    { passage: [content, contentStr, pageNumber] },\
    { sourceFile: [originalFile.url, displayUrl, name, metadata] }\
  ] }]';
}
