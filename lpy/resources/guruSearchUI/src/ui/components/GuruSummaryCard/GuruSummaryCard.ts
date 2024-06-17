/*
 * Copyright 2009-2024 C3.ai, Inc. (formerly C3IoT)  (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret
 * and proprietary information of C3.ai and its licensors. Reproduction, use and/or distribution
 * of this material in any form is strictly prohibited except as set forth in a written
 * license agreement with C3.ai and/or its authorized distributors.
 * This product may be covered by one or more U.S. patents or pending patent applications.
 */

export function clickFeedbackButtonAction(id: string, helpful: boolean, generativeAiResultId: string, ownProps: any) {
  return {
    type: `${id}.${helpful ? 'FEEDBACK_POSITIVE' : 'FEEDBACK_NEGATIVE'}`,
    payload: {
      componentId: id,
      helpful,
      generativeAiResultId,
    },
    meta: ownProps,
  };
}
