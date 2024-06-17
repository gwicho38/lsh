/*
 * Copyright 2009-2024 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

import React, { useEffect, useState } from 'react';
import classNames from 'classnames';
import _forEach from 'lodash/forEach';
import _last from 'lodash/last';
import { ErrorBoundary } from 'react-error-boundary';
import DateTime from '@c3/ui/UiSdlDateTime';
import { GuruChat as Props } from '@c3/types';
import { useTranslate } from '@c3/sdl-react/hooks/useTranslate';
import { useScrollClass } from '@c3/sdl-react/hooks/useScrollClass';
import { containsPressedKey } from '@c3/ui/UiSdlHelpers';
import GenAiErrorComponent from '@c3/ui/GenAiErrorComponent';
import Translate from '@c3/sdl-react/reactComponents/Translate';
import SDLInput from '@c3/sdl-react/reactComponents/SDLInput';
import SDLButton from '@c3/sdl-react/reactComponents/SDLButton';
import SDLChatMessage from '@c3/sdl-react/reactComponents/SDLChatMessage';
import { GEN_AI_RESULT_FINAL_STATUS } from '@c3/ui/UiSdlQueryInterimStatusDropdownReact';
import { getReportToolSources } from '@c3/ui/ReportToolSources';

import '@c3/ui/UiSdlChat.scss';
import '@c3/ui/GuruChat.scss';

/* eslint-disable multiline-comment-style */
// /////////////////////////////////////////////////////////////////////////////
// START CHANGE
// /////////////////////////////////////////////////////////////////////////////
/* eslint-enable multiline-comment-style */

// TODO: [COR-388 | Move to own file/type](https://c3energy.atlassian.net/browse/COR-388)
// eslint-disable-next-line import/exports-last
export interface GeoCoordinates {
  [index: string]: [number, number];
}

// TODO: [COR-388 | Move to own file/type](https://c3energy.atlassian.net/browse/COR-388)
// eslint-disable-next-line import/exports-last
export interface EngineLog {
  locations: string[];
  geoCoordinates: GeoCoordinates[];
  distances: [string, string, number][];
  information: string;
}

// TODO: [COR-388 | Move to own file/type](https://c3energy.atlassian.net/browse/COR-388)
function checkForGeoCoordinates(engineLog: any): boolean {
  if (!engineLog) {
    return false;
  }
  try {
    // Parse the 'engineLog' string into an array of EngineLog objects
    const parsedLog: EngineLog[] = JSON.parse(engineLog);
    if (parsedLog.length > 0 && 'geoCoordinates' in parsedLog[0]) {
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to parse engineLog:', error);
    return false;
  }
}

// TODO: [COR-388 | Move to own file/type](https://c3energy.atlassian.net/browse/COR-388)
function constructGeoCoordinateMessage(engineLog: any, answer: string): string {
  if (checkForGeoCoordinates(engineLog)) {
    // Parse the 'engineLog' string into an array of EngineLog objects
    const parsedLog: EngineLog[] = JSON.parse(engineLog);
    const BASE_URL = 'http://nominatim.openstreetmap.org/reverse?';
    let messages: string[] = [answer];

    /*
     * Check the first element in the array for the 'geoCoordinates' key
     * You can also loop through all logs to check each one if needed
     */

    parsedLog.forEach((logItem) => {
      logItem.geoCoordinates.forEach((geoPoint) => {
        messages.push(BASE_URL + `lat=${geoPoint[1][0]}&lon=${geoPoint[1][1]}`);
      });
    });

    return String(messages.join('\n\n'));
  } else {
    return answer;
  }
}

// eslint-disable-next-line multiline-comment-style
// /////////////////////////////////////////////////////////////////////////////
// END CHANGE
// /////////////////////////////////////////////////////////////////////////////

function UiSdlChat(props: Props): React.ReactNode {
  const [initialMessageTime, setInitialMessageTime] = useState(DateTime.now().toString());
  const translate = useTranslate();
  const {
    id,
    headerText,
    serverMessageHeader,
    userMessageHeader,
    expandable,
    searchableMessages,
    generativeAiResult, // Prop added to render link generation evidence summary ard
    allowFeedback,
    dateFormat,
    messages,
    expanded,
    submitQueryAction,
    submitSearchAction,
    clickFeedbackButtonAction,
    setExpandedModeAction,
    uiSettings,
    showBanner, // Equivalent to !disableFilterApply in application state
  } = props;

  const handleScroll = useScrollClass();

  const [chatInput, setChatInput] = useState<string>('');
  const [isDataLoading, setIsDataLoading] = useState<boolean>(false);

  // True when the user manually closes the info banner with the close button
  const [isBannerClosed, setIsBannerClosed] = useState<boolean>(false);

  useEffect(() => {
    setIsBannerClosed(false);
  }, [showBanner]);

  const handleChatInputChange = (event): void => {
    setChatInput(event?.target?.value);
  };

  const submitChatQuery = (): void => {
    setIsDataLoading(true);
    submitQueryAction.call(id, chatInput);
    setChatInput('');
  };

  const handleChatInputKeyDown = (event): void => {
    if (containsPressedKey(['Enter'], event) && chatInput && !isDataLoading) {
      submitChatQuery();
    }
  };

  const handleChatButtonClick = (): void => {
    if (chatInput) {
      submitChatQuery();
    }
  };

  const handleChatExpandButtonClick = (): void => {
    setExpandedModeAction.call(id, !expanded);
  };

  const messagesEndRef = React.createRef();
  const bottomDiv = <div ref={messagesEndRef} />;
  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'start',
    });
  };

  // Listen to the state of the last message to hide spinner when result has been generated or has failed
  const lastMessage = _last(messages);
  const errorLastMessage = lastMessage?.responseAiResult?.failed;
  const statusLastMessage = _last(lastMessage?.responseAiResult?.statusHistory);
  useEffect(() => {
    if (errorLastMessage || statusLastMessage?.status === GEN_AI_RESULT_FINAL_STATUS) {
      setIsDataLoading(false);
    }
  }, [statusLastMessage, errorLastMessage]);

  /*
   * UseEffect will only do shallow comparisons for lists (reference). Cannot just depend on
   * `messages` because then this will run every time any state changes in the component.
   */
  useEffect(() => {
    scrollToBottom();
  }, [JSON.stringify(messages)]);

  let chatBoxClass = 'sdl-chat-box';
  let messagesContainerClass = 'sdl-messages-container';
  let chatInputClass = 'sdl-chat-input';
  let expandButtonText = 'Expand';
  let expandButtonIcon = 'c3-button-expand';
  if (expanded) {
    chatBoxClass = 'sdl-chat-box-expanded-guru';
    messagesContainerClass = 'sdl-messages-container-expanded';
    chatInputClass = 'sdl-chat-input-expanded';
    expandButtonText = 'Exit Full Screen';
    expandButtonIcon = 'c3-button-compress';
  }

  const headerContent = (
    <div className="c3-card-title-chat-container">
      <h4>
        <Translate spec={headerText || 'C3 Generative AI Chat'} />
      </h4>
      {expandable && (
        <SDLButton
          className="chat-header-action-button"
          usage="icon-with-text"
          size="small"
          content={expandButtonText}
          iconClass={expandButtonIcon}
          onClick={handleChatExpandButtonClick}
        />
      )}
    </div>
  );

  useEffect(() => {
    if (messages && messages.length === 0) {
      setInitialMessageTime(DateTime.now().toString());
    }
  }, [messages?.length]);

  const welcomeMessage = {
    key: 'initial-message-unique-key',
    message: translate({
      spec: 'What can I help you with? Feel free to ask a follow-up question.',
    }),
    sentTime: initialMessageTime,
    isWelcomeMsg: true,
    isFromClient: false,
  };

  const sdlMessages = [welcomeMessage];

  // Hide spinner if the only message is the welcome message.
  useEffect(() => {
    if (_last(sdlMessages)?.isWelcomeMsg) {
      setIsDataLoading(false);
    }
  }, [JSON.stringify(sdlMessages)]);

  _forEach(messages, (message) => {
    sdlMessages.push({
      key: message.id,
      entityId: message.id,
      message: message.message,
      sentTime: message.sentTime,
      isFromClient: true,
      user: message.user,
    });

    sdlMessages.push({
      key: message.responseAiResult.id,
      entityId: message.responseAiResult.id,
      message: message.responseAiResult.answer,
      sentTime: message.responseAiResult.meta.created,
      isFromClient: false,
      failed: message.responseAiResult.failed,
      sources: message.responseAiResult.rationaleSources,
      reportSources: getReportToolSources(message.responseAiResult.engineLog),
      interimStatuses: message.responseAiResult.statusHistory,
      visualization: message.responseAiResult.visualization,
    });
  });

  const appendedIcon = isDataLoading ? (
    <button className="c3-sdl-chat-loading-button">
      <i
        role="presentation"
        className={classNames('c3-icon', 'c3-icon-circle-notch', 'c3-sdl-chat-loading')}
        aria-hidden={true}
      />
    </button>
  ) : (
    <button onClick={handleChatButtonClick} className="c3-button-paper-plane">
      <i role="presentation" className={classNames('c3-icon')} aria-hidden={true} />
    </button>
  );

  // eslint-disable-next-line multiline-comment-style
  // ///////////////////////////////////////////////////////////////////////////
  // START CHANGE
  // ///////////////////////////////////////////////////////////////////////////

  const locationQuery = checkForGeoCoordinates(generativeAiResult?.engineLog);

  if (locationQuery) {
    sdlMessages.push({
      key: generativeAiResult.id,
      message: constructGeoCoordinateMessage(generativeAiResult.engineLog, generativeAiResult.answer),
      sentTime: generativeAiResult.meta.created,
      isFromClient: false,
      failed: generativeAiResult?.failed,
      sources: generativeAiResult?.rationaleSources,
      interimStatuses: generativeAiResult?.statusHistory,
      visualization: generativeAiResult?.visualization,
    });
  }

  // eslint-disable-next-line multiline-comment-style
  // ///////////////////////////////////////////////////////////////////////////
  // END CHANGE
  // ///////////////////////////////////////////////////////////////////////////

  const content = (
    <ErrorBoundary FallbackComponent={GenAiErrorComponent}>
      <div className={chatBoxClass}>
        {headerContent}
        <div className={messagesContainerClass} onScroll={handleScroll}>
          {sdlMessages &&
            sdlMessages.map((msg) => (
              <SDLChatMessage
                key={msg.key}
                parentComponentId={id}
                submitSearchAction={submitSearchAction}
                feedbackAction={clickFeedbackButtonAction}
                sources={msg?.sources}
                serverMessageHeader={serverMessageHeader}
                userMessageHeader={userMessageHeader}
                isSearchable={searchableMessages}
                allowFeedback={allowFeedback}
                dateFormat={dateFormat}
                interimStatuses={msg?.interimStatuses}
                visualization={msg?.visualization}
                uiSettings={uiSettings}
                {...msg}
              />
            ))}
          {bottomDiv}
        </div>
        <div>
          {!isBannerClosed && showBanner && (
            <div className="chat-banner">
              <div>
                <Translate spec={'EnterpriseSearch.ChatBox.bannerText'} />
              </div>
              <button className="close-banner-button" onClick={() => setIsBannerClosed(true)}>
                <i
                  role="presentation"
                  className={classNames('c3-icon', 'c3-icon-inverse', 'c3-icon-times')}
                  aria-hidden
                />
              </button>
            </div>
          )}
          <div className={chatInputClass}>
            <SDLInput
              value={chatInput}
              onChange={handleChatInputChange}
              onKeyDown={handleChatInputKeyDown}
              placeholder="EnterpriseSearch.ChatBox.messagePlaceholder"
              appendedIconButton={appendedIcon}
            />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );

  return content;
}

export default UiSdlChat;
