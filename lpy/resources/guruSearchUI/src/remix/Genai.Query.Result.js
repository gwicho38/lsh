/*
 * Copyright 2009-2024 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

// CHANGE: Added engineLog to get request
function getForUi() {
  /*
   * When we return the cached result we want to include the "Fetching Cached Result" interim status
   * and since statusHistory is already included in the Genai.Query.Result getMissing does not fetch
   * the updated status from database.
   */
  var result = this.get('statusHistory.status, engineLog, steps');

  return result.getMissing({
    include: Genai.ChatBot.queryIncludeString(),
  });
}
