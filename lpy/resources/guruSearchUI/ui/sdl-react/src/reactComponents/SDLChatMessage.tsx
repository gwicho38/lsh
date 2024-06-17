/*
 * Copyright 2009-2024 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

/* eslint-disable react/display-name */
/*
 * Copyright 2009-2023 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

/* eslint-disable no-unused-vars */
import React, { ReactElement, useState, useContext } from 'react';
import classNames from 'classnames';
import { useTranslate } from '@c3/sdl-react/hooks/useTranslate';
import { typeNameAliases } from '@c3/sdl-react/globals/index';
import SDLButton from '@c3/sdl-react/reactComponents/SDLButton';
import SDLSourceBar from '@c3/sdl-react/reactComponents/SDLSourceBar';
import SDLErrorHeader from '@c3/sdl-react/reactComponents/SDLErrorHeader';
import Translate from '@c3/sdl-react/reactComponents/Translate';
import UiSdlFancyMarkdownRenderer from '@c3/ui/UiSdlFancyMarkdownRendererReact';
import '@c3/ui/UiSdlFeedback.scss';
import { Placeholder, Popup } from 'semantic-ui-react';
import UiSdlStylePropertiesContext from '@c3/ui/UiSdlStylePropertiesContext';
import { THEME_CATEGORY } from '@c3/ui/UiThemeActions';
import UiSdlQueryInterimStatusDropdown, {
  GEN_AI_RESULT_FINAL_STATUS,
} from '@c3/ui/UiSdlQueryInterimStatusDropdownReact';
import { transform as transformVisualizationConfig } from '@c3/ui/UiSdlTransformGenAiVisualizationBaseToUiSdlDynamicComponentMetadata';
import UiSdlDynamicComponentRenderer from '@c3/ui/UiSdlDynamicComponentRendererReact';
import { searchResultShouldRender } from '@c3/ui/UiSdlEnterpriseSearchComponentUtils';
import { Genai } from '@c3/types';
import { CHAT_LOADING_MESSAGE_TEXT } from '@c3/ui/UiSdlChat';

type GenaiSourceType = Genai.Query.ResultToSourceFileRelation;

const SDLChatMessage = (props) => {
  const {
    user,
    sources,
    reportSources,
    entityId,
    message,
    sentTime,
    isWelcomeMsg,
    isFromClient,
    parentComponentId,
    submitSearchAction,
    feedbackAction,
    serverMessageHeader,
    userMessageHeader,
    isSearchable,
    allowFeedback,
    dateFormat,
    failed,
    interimStatuses,
    visualization,
    uiSettings,
  } = props;

  const { lazyLoadResults = false } = uiSettings || {};

  const handleSearchClick = (event) => {
    submitSearchAction.call(parentComponentId, message, event);
  };

  const visualizationDynamicComponent = transformVisualizationConfig(visualization);

  const date = <SDLChatMessage.FormattedDate sentTime={sentTime} dateFormat={dateFormat} />;

  return isFromClient ? (
    <SDLChatMessage.ClientMessage
      isSearchable={isSearchable}
      handleSearchClick={handleSearchClick}
      userName={user[userMessageHeader]}
      date={date}
      message={message}
    />
  ) : (
    <SDLChatMessage.ServerMessage
      serverMessageHeader={serverMessageHeader}
      message={message}
      interimStatuses={interimStatuses}
      lazyLoadResults={lazyLoadResults}
      sources={sources}
      reportSources={reportSources}
      date={date}
      visualizationDynamicComponent={visualizationDynamicComponent}
      isWelcomeMsg={isWelcomeMsg}
      failed={failed}
      allowFeedback={allowFeedback}
      parentComponentId={parentComponentId}
      feedbackAction={feedbackAction}
      entityId={entityId}
    />
  );
};

interface ClientMessageProps {
  isSearchable: boolean;
  handleSearchClick: (e: Event) => void;
  userName: string;
  date: ReactElement;
  message: string;
}

SDLChatMessage.ClientMessage = ({
  isSearchable,
  handleSearchClick,
  userName,
  date,
  message,
}: ClientMessageProps): ReactElement => {
  return (
    <div className="sdl-chat-client-image-message-container">
      <div className="sdl-client-message">
        <div className="sdl-chat-message-header">
          <div className="sdl-client-message-header">
            <h4>
              {userName}
              {date}
            </h4>
            {isSearchable && (
              <div className="sdl-client-message-header-right">
                <SDLButton
                  usage="icon"
                  size="small"
                  tooltip="Search for this..."
                  iconClass="c3-button-search"
                  onClick={handleSearchClick}
                />
              </div>
            )}
          </div>
        </div>
        {message && <p>{message}</p>}
      </div>
    </div>
  );
};

interface ServerMassageProps {
  serverMessageHeader: string;
  date: ReactElement;
  message: string;
  failed: boolean;
  isWelcomeMsg: boolean;
  allowFeedback: boolean;
  interimStatuses: Genai.Query.Result.InterimStatusHistory[];
  lazyLoadResults: boolean;
  visualizationDynamicComponent: object;
  sources: GenaiSourceType[];
  reportSources: ReportToolEngineLog[];
  parentComponentId: string;
  entityId: string;
  feedbackAction: () => void;
}

SDLChatMessage.ServerMessage = ({
  failed,
  date,
  serverMessageHeader,
  isWelcomeMsg,
  allowFeedback,
  interimStatuses,
  message,
  lazyLoadResults,
  visualizationDynamicComponent,
  sources,
  reportSources,
  parentComponentId,
  entityId,
  feedbackAction,
}: ServerMassageProps): ReactElement => {
  const [thumbsUp, setThumbsUp] = useState(false);
  const [thumbsDown, setThumbsDown] = useState(false);

  const handlePositiveFeedbackClick = (event: Event): void => {
    feedbackAction.call(parentComponentId, true, entityId, event);
    setThumbsUp(true);
    setThumbsDown(false);
  };

  const handleNegativeFeedbackClick = (event: Event): void => {
    feedbackAction.call(parentComponentId, false, entityId, event);
    setThumbsUp(false);
    setThumbsDown(true);
  };

  const serverResponseReady = searchResultShouldRender(
    message && message !== CHAT_LOADING_MESSAGE_TEXT,
    interimStatuses,
    lazyLoadResults,
  );

  const themeCategory = useContext(UiSdlStylePropertiesContext).themeCategory;

  return (
    <div className="sdl-chat-server-image-message-container">
      <SDLChatMessage.GenAiLogo />
      <div
        className={classNames('sdl-server-message', {
          'sdl-error-message': failed,
        })}
      >
        <div className="sdl-chat-message-header">
          <div className="sdl-server-message-header">
            <h4 className="sdl-server-message-header-left">
              <div className="server-date-message-container">
                <Translate spec={serverMessageHeader || 'C3 AI'} />
                {date}
              </div>
              {!isWelcomeMsg && !failed && <UiSdlQueryInterimStatusDropdown interimStatuses={interimStatuses} />}
            </h4>
            {!isWelcomeMsg && allowFeedback && (
              <div className="sdl-server-message-header-right">
                <SDLButton
                  usage="icon"
                  size="small"
                  tooltip="Helpful"
                  className={classNames('c3-button-thumbs-up', {
                    'selected-positive': thumbsUp,
                  })}
                  disabled={!serverResponseReady}
                  onClick={handlePositiveFeedbackClick}
                />
                <SDLButton
                  usage="icon"
                  size="small"
                  tooltip="Not Helpful"
                  className={classNames('c3-button-thumbs-down', {
                    'selected-negative': thumbsDown,
                  })}
                  disabled={!serverResponseReady}
                  onClick={handleNegativeFeedbackClick}
                />
              </div>
            )}
          </div>
        </div>
        {failed && <SDLErrorHeader />}
        {isWelcomeMsg || serverResponseReady ? (
          <UiSdlFancyMarkdownRenderer className="sdl-chat-markdown" markdown={message} />
        ) : (
          <SDLChatMessage.LoadingPlaceholder themeCategory={themeCategory} />
        )}
        {searchResultShouldRender(!!visualizationDynamicComponent, interimStatuses, lazyLoadResults) && (
          <div className="dynamic-visualization-chat">
            <UiSdlDynamicComponentRenderer {...visualizationDynamicComponent} />
          </div>
        )}
        {searchResultShouldRender(sources, interimStatuses, lazyLoadResults) && (
          <SDLChatMessage.SourceBar sources={sources} />
        )}
        {searchResultShouldRender(reportSources, interimStatuses, lazyLoadResults) && (
          <SDLChatMessage.ReportSourceBar reportSources={reportSources} />
        )}
      </div>
    </div>
  );
};

SDLChatMessage.GenAiLogo = (): ReactElement => (
  <svg id="genAiLogo" width="40" height="40" viewBox="0 0 40 40" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M0 0H35.415H39.8419V4.42804V17.7122V22.1402V35.4244V39.8524H35.415H0V35.4244H35.415V22.1402H8.85375V17.7122H35.415V4.42804H0V0ZM4.42688 8.85609H30.9881V13.2841H4.42688V26.5683H30.9881V30.9963H4.42688H0V26.5683V13.2841V8.85609H4.42688Z"
    />
  </svg>
);

interface ChatMessageFormattedDateProps {
  dateFormat: string;
  sentTime: string;
}

SDLChatMessage.FormattedDate = ({ sentTime, dateFormat }: ChatMessageFormattedDateProps): ReactElement => {
  const translate = useTranslate();

  const formattedDate = translate({
    spec: {
      type: 'UiSdlDynamicValueSpec',
      dynamicValue: {
        type: typeNameAliases.UiSdlDefinedValueParam,
        value: sentTime,
        format: dateFormat,
      },
    },
  });

  return <span className="sdl-message-date">{formattedDate}</span>;
};

interface ChatMessageLoadingPlaceholderProps {
  themeCategory: string;
}

SDLChatMessage.LoadingPlaceholder = ({ themeCategory }: ChatMessageLoadingPlaceholderProps): ReactElement => (
  <Placeholder className="message-loader-placeholder" fluid inverted={themeCategory === THEME_CATEGORY.DARK}>
    <Placeholder.Line length="full" />
    <Placeholder.Line length="full" />
    <Placeholder.Line length="short" />
  </Placeholder>
);

interface ChatMessageSourceBarProps {
  sources: GenaiSourceType[];
}

SDLChatMessage.SourceBar = ({ sources }: ChatMessageSourceBarProps): ReactElement => {
  return (
    <div className="chat-sources-container">
      <div className="chat-separator" />
      <div>Sources:</div>
      <SDLSourceBar sources={sources} numDisplayed={2} hasNumbers></SDLSourceBar>
    </div>
  );
};

// Report Tool Engine Log
interface ReportToolEngineLog {
  reporttitle: string;
  docid: string;
  classification: string;
  url: string;
  score: number;
}

interface ChatMessageReportSourceBarProps {
  reportSources: ReportToolEngineLog[];
}

SDLChatMessage.ReportSourceBar = ({ reportSources }: ChatMessageReportSourceBarProps): ReactElement => {
  return (
    <>
      <div>Sources:</div>
      <div className="sdl-source-bar">
        {reportSources.slice(0, 2).map((source, index) => {
          const reportTitle = source['reporttitle'];
          const url = source['url'];

          const sourceContent = (
            <>
              {true && <span className="sdl-source-number">{index + 1}.</span>}
              <span className="sdl-source-text">{reportTitle}</span>
            </>
          );

          return (
            <Popup
              trigger={
                <div className="source-with-passage-container" title={reportTitle}>
                  <a className="sdl-single-source" href={url} target="_blank" rel="noreferrer">
                    {sourceContent}
                  </a>
                </div>
              }
              disabled
              inverted
              className="sdl-passage-popup"
            ></Popup>
          );
        })}
      </div>
    </>
  );
};

export default SDLChatMessage;
