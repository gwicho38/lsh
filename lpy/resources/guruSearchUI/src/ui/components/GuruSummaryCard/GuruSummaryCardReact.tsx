/*
 * Copyright 2009-2024 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

import React, { useEffect, ReactElement, useContext } from 'react';
import classNames from 'classnames';
import _last from 'lodash/last';
import { useTranslate } from '@c3/sdl-react/hooks/useTranslate';
import { useConfig } from '@c3/ui/UiSdlUseConfig';
import NestedComponent from '@c3/ui/UiSdlNestedComponentReact';
import SDLButton from '@c3/sdl-react/reactComponents/SDLButton';
import SDLSourceBar from '@c3/sdl-react/reactComponents/SDLSourceBar';
import SDLErrorHeader from '@c3/sdl-react/reactComponents/SDLErrorHeader';
import UiSdlFancyMarkdownRenderer from '@c3/ui/UiSdlFancyMarkdownRendererReact';
import { Placeholder, Popup } from 'semantic-ui-react';
import { GuruSummaryCard as GuruSummaryCardProps } from '@c3/types';
import UiSdlStylePropertiesContext from '@c3/ui/UiSdlStylePropertiesContext';
import { THEME_CATEGORY } from '@c3/ui/UiThemeActions';
import UiSdlQueryInterimStatusDropdown from '@c3/ui/UiSdlQueryInterimStatusDropdownReact';
import UiSdlDynamicComponentRenderer from '@c3/ui/UiSdlDynamicComponentRendererReact';
import { searchResultShouldRender } from '@c3/ui/UiSdlEnterpriseSearchComponentUtils';
import { apiSourceShouldRender } from '@c3/ui/GuruSearchComponentUtils';
import { getReportToolSources, ReportQueryProps } from '@c3/ui/ReportToolSources';

import '@c3/ui/UiSdlFeedback.scss';
import '@c3/ui/GuruSummaryCard.scss';

interface SubContentProps {
  id: string;
}

const SubContent = ({ id }: SubContentProps): ReactElement => {
  return (
    <div className="sub-content">
      <NestedComponent componentId={id} />
    </div>
  );
};

// eslint-disable-next-line
///////////////////////////////////////////////////////////////////////////////
// START CHANGE 1
///////////////////////////////////////////////////////////////////////////////

// TODO: [COR-388 | Move to own file/type](https://c3energy.atlassian.net/browse/COR-388)
interface LocationQueryProps {
  engineLog: any;
  answer: any;
}

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

// TODO: [CORNEA-ENG | Migrate Distance Calc Evidence Package to Generalized Source Logic](https://c3energy.atlassian.net/browse/COR-388)
function constructGeoCoordinateMessage(engineLog: any, answer?: string): string[] {
  if (!engineLog) {
    return answer ? [`<li>${answer}</li>`] : [];
  }
  if (checkForGeoCoordinates(engineLog)) {
    const parsedLog: EngineLog[] = JSON.parse(engineLog);
    const BASE_URL = 'http://nominatim.openstreetmap.org/reverse?';
    let messages: string[] = [];

    // Updated section
    parsedLog.forEach((logItem, index) => {
      logItem.locations.forEach((location, locIndex) => {
        // Assuming each location corresponds to the same index geoCoordinate
        if (logItem.geoCoordinates && logItem.geoCoordinates[locIndex]) {
          const geoPoint = logItem.geoCoordinates[locIndex];
          const locationUrl = BASE_URL + `lat=${geoPoint[1][0]}&lon=${geoPoint[1][1]}`;
          messages.push(`<li><a href="${locationUrl}">${location}</a></li>`);
        }
      });
    });

    if (answer) {
      messages.push(`<li>${answer}</li>`);
    }
    return messages;
  } else {
    return answer ? [`<li>${answer}</li>`] : [];
  }
}

// TODO: [CORNEA-ENG | Migrate Distance Calc Evidence Package to Generalized Source Logic](https://c3energy.atlassian.net/browse/COR-388)
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

// TODO: [CORNEA-ENG | Migrate Distance Calc Evidence Package to Generalized Source Logic](https://c3energy.atlassian.net/browse/COR-388)
const ReportSources = ({ engineLog }: ReportQueryProps): ReactElement => {
  const reportSources = getReportToolSources(engineLog);
  return reportSources ? (
    <>
      <div className="separator" />
      <div>Sources:</div>
      <div className="sdl-source-bar">
        {reportSources.map((source, index) => {
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
  ) : null;
};

interface ToolQueryProps {
  engineLog: any;
}

const TrackSources = ({ engineLog }: ToolQueryProps): ReactElement => {
  // Sometimes getToolRequestParams or getToolRequestURI can fail due to unpredictable LLM responses
  try {
    /*
     * TODO: COR-970 https://c3energy.atlassian.net/browse/COR-970 Uniform uri encoding is necessary given application network dependency
     * For context see comments to https://c3energy.atlassian.net/browse/COR-917
     */
    const sourceUrl = JSON.parse(engineLog)[0].source;
    const encodedUrl = JSON.stringify(sourceUrl.replace(/\+/g, '%2B'));
    const sourceContent = (
      <>
        <span className="sdl-source-text">Navigate to the API</span>
      </>
    );
    return sourceUrl ? (
      <>
        <div className="separator" />
        <div className="sdl-source-bar">
          <>
            Sources:{' '}
            <Popup
              trigger={
                <div className="source-with-passage-container" title={encodedUrl}>
                  <a className="sdl-single-source" href={encodedUrl} target="_blank" rel="noreferrer">
                    {sourceContent}
                  </a>
                </div>
              }
              disabled
              inverted
              className="sdl-passage-popup"
            ></Popup>
          </>
        </div>
      </>
    ) : null;
  } catch (e) {
    console.error(e);
    return null;
  }
};

// eslint-disable-next-line multiline-comment-style
// /////////////////////////////////////////////////////////////////////////////
// END CHANGE 1
// /////////////////////////////////////////////////////////////////////////////
const Header = ({
  id,
  hideCardTitle,
  hideRightActionGroup,
  contentHeader: propsContentHeader,
  contentBody,
  generativeAiResultId,
  failed,
  sources,
  numDisplayed,
  interimStatuses,
  clickFeedbackButtonAction,
  visualizationDynamicComponent,
  uiSettings,
  engineLog, // Added to present tool structured tool output
}: GuruSummaryCardProps): ReactElement => {
  const [thumbsUp, setThumbsUp] = React.useState<boolean>(false);
  const [thumbsDown, setThumbsDown] = React.useState<boolean>(false);
  const { lazyLoadResults = false } = uiSettings || {};

  useEffect(() => {
    setThumbsDown(false);
    setThumbsUp(false);
  }, [generativeAiResultId]);

  const clickPositiveButton = (): void => {
    clickFeedbackButtonAction.call(id, true, generativeAiResultId);
    setThumbsUp(true);
    setThumbsDown(false);
  };

  const clickNegativeButton = (): void => {
    clickFeedbackButtonAction.call(id, false, generativeAiResultId);
    setThumbsUp(false);
    setThumbsDown(true);
  };

  const translate = useTranslate();
  const NO_ANSWER = "I don't know.";
  const TITLE_TEXT = translate({ spec: 'AI Summary' });

  const contentHeader = translate({ spec: propsContentHeader });

  const errorHeader = failed ? <SDLErrorHeader /> : null;

  const LARGE_RESPONSE_NUM_CHARS = 90;

  const themeCategory = useContext(UiSdlStylePropertiesContext).themeCategory;

  const rationaleVisibility = useConfig('GenAiUiConfig', 'rationaleVisibility');

  const isDistanceCalculation = checkForGeoCoordinates(engineLog);

  return (
    <>
      {!(hideCardTitle && hideRightActionGroup) && (
        <div className="card-header">
          {!hideCardTitle && (
            <div className="card-header-summary">
              <div className="card-title-text">{TITLE_TEXT}</div>
              {!failed && <UiSdlQueryInterimStatusDropdown interimStatuses={interimStatuses} />}
            </div>
          )}
          {searchResultShouldRender(contentHeader, interimStatuses, lazyLoadResults) && (
            <div className="card-header-feedback">
              <SDLButton
                usage="icon"
                className={`c3-button-thumbs-up ${thumbsUp ? 'selected-positive' : ''}`}
                tooltip="Helpful"
                size="small"
                onClick={clickPositiveButton}
              />
              <SDLButton
                usage="icon"
                className={`c3-button-thumbs-down ${thumbsDown ? 'selected-negative' : ''}`}
                tooltip="Not Helpful"
                size="small"
                onClick={clickNegativeButton}
              />
            </div>
          )}
        </div>
      )}
      <div className="main-content">
        {!searchResultShouldRender(contentHeader || errorHeader, interimStatuses, lazyLoadResults) ? (
          <Placeholder
            className="summary-card-loader-placeholder"
            fluid
            inverted={themeCategory === THEME_CATEGORY.DARK}
          >
            <Placeholder.Paragraph>
              <Placeholder.Line length="full" />
              <Placeholder.Line length="full" />
              <Placeholder.Line length="short" />
            </Placeholder.Paragraph>
          </Placeholder>
        ) : errorHeader ? (
          <div>
            {errorHeader}
            <div className="content-error-header">{contentHeader}</div>
          </div>
        ) : (
          contentHeader && (
            <div className="content-header">
              <UiSdlFancyMarkdownRenderer
                markdown={contentHeader}
                className={classNames(
                  'sdl-summary-card-markdown',
                  contentHeader.length > LARGE_RESPONSE_NUM_CHARS ? 'long-summary' : 'short-summary',
                )}
              />
            </div>
          )
        )}
        {searchResultShouldRender(
          contentBody && !failed && propsContentHeader !== NO_ANSWER && rationaleVisibility !== 'hidden',
          interimStatuses,
          lazyLoadResults,
        ) && (
          <details className="content-body">
            <summary>
              {translate({
                spec: 'EnterpriseSearch.SummaryCard.Rationale.seeMore',
              })}
            </summary>
            <p>{translate({ spec: contentBody })}</p>
          </details>
        )}
        {/*
          //////////////////////////////////////////////////////////////////////
          // START CHANGE 2
          // TODO: [COR-679 | Update Design](https://c3energy.atlassian.net/browse/COR-679)
          // TODO: [COR-680 | Test](https://c3energy.atlassian.net/browse/COR-680)
          //////////////////////////////////////////////////////////////////////
        */}
        {isDistanceCalculation ? (
          <>
            <details className="content-body">
              <summary>
                {translate({
                  spec: 'EnterpriseSearch.SummaryCard.Rationale.seeMore',
                })}
              </summary>
              <ul>
                {constructGeoCoordinateMessage(engineLog).map((message, index) => (
                  <li key={index} dangerouslySetInnerHTML={{ __html: message }}></li>
                ))}
              </ul>
            </details>
          </>
        ) : null}
        {/*
          //////////////////////////////////////////////////////////////////////
          // END CHANGE 2
          //////////////////////////////////////////////////////////////////////
        */}
        {searchResultShouldRender(visualizationDynamicComponent, interimStatuses, lazyLoadResults) && (
          <div className="dynamic-visualization">
            <UiSdlDynamicComponentRenderer {...visualizationDynamicComponent} />
          </div>
        )}
        {searchResultShouldRender(
          sources && !failed && propsContentHeader !== NO_ANSWER,
          interimStatuses,
          lazyLoadResults,
        ) ? (
          <>
            <div className="separator"></div>
            <div>Sources:</div>
            <SDLSourceBar sources={sources} numDisplayed={numDisplayed} hasNumbers />
          </>
        ) : null}
        {/*
          //////////////////////////////////////////////////////////////////////
          // START CHANGE 3
          //////////////////////////////////////////////////////////////////////
        */}
        {searchResultShouldRender(
          engineLog && !failed && propsContentHeader !== NO_ANSWER,
          interimStatuses,
          lazyLoadResults,
        ) ? (
          <>
            <div>
              <ReportSources engineLog={engineLog} />
            </div>
          </>
        ) : null}
        {apiSourceShouldRender(
          engineLog && !failed && propsContentHeader !== NO_ANSWER,
          engineLog,
          interimStatuses,
          lazyLoadResults,
        ) ? (
          <>
            <div>
              <TrackSources engineLog={engineLog} />
            </div>
          </>
        ) : null}
        {/*
          //////////////////////////////////////////////////////////////////////
          // END CHANGE 3
          //////////////////////////////////////////////////////////////////////
        */}
      </div>
    </>
  );
};

/**
 * Renders a GuruSummaryCard with React.
 * @param props A GuruSummaryCard configuration
 */
const GuruSummaryCard: React.FC<GuruSummaryCardProps> = (props) => {
  return (
    <>
      <div
        className={classNames('summary-card', {
          'summary-card-error': props.failed,
          loading: props.isDataLoading,
        })}
      >
        <Header {...props} />
        {props.subContent && <SubContent id={props.subContent?.props.id} />}
      </div>
    </>
  );
};
export default GuruSummaryCard;
