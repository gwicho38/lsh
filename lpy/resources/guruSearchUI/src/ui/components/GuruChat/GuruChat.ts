/*
 * Copyright 2009-2024 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

import _reject from 'lodash/reject';
import {
  ImmutableReduxState,
  getConfigFromState,
  setConfigInState,
  getPageParamsFromState,
} from '@c3/ui/UiSdlConnected';
import { UiSdlChatMessagesSetAction, UiSdlQuerySubmitAction, Genai } from '@c3/types';
import DateTime from '@c3/ui/UiSdlDateTime';

export const CHAT_LOADING_MESSAGE_TEXT = '<C3_LOADING>';

export function setChatMessagesAction(id: string, messages: [Genai.Query.ChatMessage], ownProps: any) {
  return {
    type: id + '.CHAT_MESSAGES_SET',
    payload: {
      componentId: id,
      messages,
    },
    meta: ownProps,
  };
}

export function submitQueryAction(id: string, query: string, ownProps: unknown) {
  const now = DateTime.now().toString();
  return {
    type: id + '.QUERY_SUBMIT',
    payload: {
      componentId: id,
      message: {
        message: query,
        sentTime: now,
        parentAiResult: 'FakeResult',
        responseAiResult: {
          searchQuery: {
            baseQuery: query,
            standaloneQuery: query,
          },

          // Key used to render the placeholder loader in the chat bubble.
          answer: CHAT_LOADING_MESSAGE_TEXT,
          meta: {
            // Same here.
            created: now,
          },
        },
      },
    },
    meta: ownProps,
  };
}

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

export function submitSearchAction(id: string, searchQuery: string, ownProps: any) {
  return {
    type: id + '.SEARCH_SUBMIT',
    payload: {
      componentId: id,
      query: searchQuery,
    },
    meta: ownProps,
  };
}

export function setExpandedModeAction(id: string, expanded: boolean, ownProps: any) {
  return {
    type: id + '.EXPANDED_MODE_SET',
    payload: {
      componentId: id,
      expanded: expanded,
    },
    meta: ownProps,
  };
}

export function chatMessagesSetEffect(
  state: ImmutableReduxState,
  action: UiSdlChatMessagesSetAction,
): ImmutableReduxState {
  const { componentId, messages } = action.payload;
  return setConfigInState(componentId, state, ['messages'], messages);
}

export function querySubmitEffect(state: ImmutableReduxState, action: UiSdlQuerySubmitAction): ImmutableReduxState {
  // Get user here and put into message.
  const { componentId, message } = action.payload;
  const prevMessages = getConfigFromState(componentId, state, ['messages'])?.toJS() || [];
  const user = getConfigFromState('SDL.DefaultSite', state, ['user']);
  message.user = user;
  prevMessages.push(message);
  return setConfigInState(componentId, state, ['messages'], prevMessages);
}

export function chatUpdateEffect(state: ImmutableReduxState, action: UiSdlQuerySubmitAction): ImmutableReduxState {
  const newMessage = action.payload.data;
  const componentId = action.payload.componentId;
  const prevMessages = getConfigFromState(componentId, state, ['messages'])?.toJS() || [];
  const disabledInitialRequest = getConfigFromState(componentId, state, [
    'dataSpec',
    'disableDataRequestOnFirstRender',
  ]);
  const currQueryString = getPageParamsFromState(state)?.query;
  const currSearchPageQuery = newMessage?.parentAiResult?.searchQuery;

  // Check if the current chat query is for the current page's query
  if ((currSearchPageQuery?.nonTranslatedQuery || currSearchPageQuery?.standaloneQuery) !== currQueryString) {
    return setConfigInState(componentId, state, ['isLoading'], false);
  }

  /*
   * Remove the previous message that came from the querySubmitEffect
   * (shouldn't remove it if it came from original network request though)
   */
  if (!(prevMessages.length == 1 && !disabledInitialRequest)) {
    prevMessages.pop();
  }

  const messageIndex = prevMessages.findIndex(
    (message: Genai.Query.ChatMessage) => message?.responseAiResult?.id === newMessage.responseAiResult?.id,
  );

  const isNewMessage = messageIndex === -1;

  if (isNewMessage) {
    prevMessages.push(newMessage);
  } else {
    prevMessages[messageIndex].responseAiResult = newMessage.responseAiResult;
  }

  state = setConfigInState(componentId, state, ['messages'], prevMessages);
  return setConfigInState(componentId, state, ['isLoading'], false);
}

export function expandedModeSetEffect(state: ImmutableReduxState, action: UiSdlQuerySubmitAction): ImmutableReduxState {
  const { componentId, expanded } = action.payload;
  return setConfigInState(componentId, state, ['expanded'], expanded);
}
