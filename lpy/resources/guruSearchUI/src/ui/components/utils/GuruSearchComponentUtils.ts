/*
 * Copyright 2009-2024 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

import _last from 'lodash/last';
import { Genai } from '@c3/types';
import { GEN_AI_RESULT_FINAL_STATUS } from '@c3/ui/UiSdlQueryInterimStatusDropdownReact';

export function apiSourceShouldRender(
  isSpecificContentReady: boolean,
  engineLog: any,
  interimStatuses: Genai.Query.Result.InterimStatusHistory[],
  lazyLoadResults: boolean,
): boolean {
  const lastStatus = _last(interimStatuses);
  const isResultCompleted = lastStatus?.status === GEN_AI_RESULT_FINAL_STATUS;
  let isApiSource = false;
  if (engineLog) {
    const parsedLog: any = JSON.parse(engineLog);
    isApiSource = parsedLog[0] ? parsedLog[0]['showApiSource'] : false;
  }
  return lazyLoadResults
    ? isSpecificContentReady && isApiSource
    : isSpecificContentReady && isResultCompleted && isApiSource;
}
