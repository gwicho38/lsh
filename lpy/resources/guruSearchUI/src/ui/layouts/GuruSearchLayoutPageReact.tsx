/*
 * Copyright 2009-2024 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

/* eslint-disable react/display-name */
/*
 * Copyright 2009-2024 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

import React, { useEffect, useState, useContext } from 'react';
import classNames from 'classnames';
import { GuruSearchLayoutPage as GuruSearchLayoutPageProps } from '@c3/types';
import { useScrollClass } from '@c3/sdl-react/hooks/useScrollClass';
import { useConfig } from '@c3/ui/UiSdlUseConfig';
import UiSdlNestedComponent from '@c3/ui/UiSdlNestedComponentReact';
import UiSdlEnterpriseSearchContextualBanner from '@c3/ui/UiSdlEnterpriseSearchContextualBannerReact';
import EnterpriseSearchUserUnauthenticatedModal from '@c3/ui/EnterpriseSearchUserUnauthenticatedModalReact';
import SDLSpinnerDemo from '@c3/sdl-react/reactComponents/SDLSpinnerDemo';
import { useSelector } from 'react-redux';
import { getConfigFromState, ImmutableReduxState } from '@c3/ui/UiSdlConnected';
import { getConfigFromApplicationState } from '@c3/ui/UiSdlApplicationState';
import { useTranslate } from '@c3/sdl-react/hooks/useTranslate';
import EnterpriseSearchPendo from '@c3/ui/EnterpriseSearchPendo';
import { useCondition as useIsDocumentAdmin } from '@c3/ui/EnterpriseSearchConditionalRendererIsDocAdmin';
import { useCondition as useIsAdmin } from '@c3/ui/EnterpriseSearchConditionalRendererIsAdmin';
import { getCurrentPathFromState } from '@c3/ui/UiSdlSite';
import SiteContext from '@c3/ui/UiSdlSiteContext';

import '@c3/ui/EnterpriseSearchAppStyling.scss';
import '@c3/ui/SecurityBanner.scss';
import '@c3/ui/GuruStyling.scss';

const GOV_DEFAULT_CLASS = 'NO SECURITY LEVEL SET';
const GOV_DEFAULT_BACKGROUND = '#502b85';
const NO_LEVEL_SET_BACKGROUND =
  'repeating-linear-gradient(45deg, transparent, transparent 10px, #ccc 10px, #ccc 20px), linear-gradient( to bottom, #eee, #f00)';

const getCurrentUser = (userDisplayField: string) => {
  var currentUser = '';

  // Temp for testing
  var error = false;
  try {
    /*
     * Next line causes error to be thrown causing the app to never finish rendering
     * fix in RSO-2673
     */
    const siteId = useContext(SiteContext);
    currentUser = useSelector((state: ImmutableReduxState) => {
      return getConfigFromState(siteId, state, ['user', userDisplayField]);
    });
  } catch (e) {
    // Do nothing
    error = true;
  }

  return currentUser;
};

const GuruSearchLayoutPage: React.FunctionComponent<GuruSearchLayoutPageProps> = ({
  applicationName,
  children,
  className,
  content,
  documentTitle,
  navigation,
  pageBreadcrumbs,
  pageTitle,
  fontColorConfig,
  bannerColorConfig,
}: GuruSearchLayoutPageProps) => {
  document.title = documentTitle;
  const handleScroll = useScrollClass();
  const pendoApiKey = useConfig('Genai.Pendo.Config', 'apiKey');
  const translate = useTranslate();
  const isAdmin = useIsAdmin();
  const isDocAdmin = useIsDocumentAdmin();
  const isBasicUser = !isAdmin && !isDocAdmin;

  const classification = useConfig('UiSdlGovSecurityConfig', 'classification') ?? GOV_DEFAULT_CLASS;

  const disseminationControls = useConfig('UiSdlGovSecurityConfig', 'disseminationControls') ?? [];
  const colorOverrideBanner = useConfig('UiSdlGovSecurityConfig', 'colorOverrideBanner');
  const colorOverrideFont = useConfig('UiSdlGovSecurityConfig', 'colorOverrideFont');

  // TODO: Extract this logic to SecureData type for Grid Cell / row-level badge markings
  const delimiter = '//';
  const bannerColor = colorOverrideBanner ?? bannerColorConfig[classification] ?? GOV_DEFAULT_BACKGROUND;
  const fontColor = colorOverrideFont ?? fontColorConfig[classification] ?? '#ffffff';
  var bannerText;
  if (disseminationControls && disseminationControls.length > 0) {
    bannerText = [classification, disseminationControls.join(delimiter)].join(delimiter);
  } else {
    bannerText = classification;
  }

  // Const fontWeight = bannerColor === NO_LEVEL_SET_BACKGROUND ? 900 : 400; // bold if using the candy cane background
  const fontWeight = 400;

  const leftText =
    useConfig('UiSdlGovSecurityConfig', 'orgName') +
    ' | ' +
    getCurrentUser(useConfig('UiSdlGovSecurityConfig', 'userDisplayField'));
  const rightText = '';

  const applicationStateId = 'EnterpriseSearch.UiSdlApplicationStateEnterpriseSearch';

  const isAppLoading = useSelector((state) => {
    return getConfigFromApplicationState(applicationStateId, state, ['isAppLoading']);
  });

  const userSettings = useSelector((state) => {
    return getConfigFromApplicationState(applicationStateId, state, ['userSettings'])?.toJS();
  });

  const subscriptionPlan = useSelector((state) => {
    return getConfigFromApplicationState(applicationStateId, state, ['subscriptionPlan'])?.toJS();
  });

  const currentPath = useSelector((state) => {
    return getCurrentPathFromState(applicationStateId, state);
  });

  const isUsingTutorial = userSettings?.project?.isTutorial;
  const isUsingReadOnlyProject = userSettings?.project?.readOnly;
  const noActiveProject = !userSettings?.project?.id;

  useEffect(() => {
    if (pendoApiKey && !window.pendo) {
      EnterpriseSearchPendo.init(pendoApiKey);
    }
  }, [pendoApiKey]);

  return (
    <GuruSearchLayoutPage.Wrapper
      currentPath={currentPath}
      isInOnboardingMode={isUsingTutorial}
      isInFreeTrial={subscriptionPlan?.isFreeTrial}
      isAppLoading={isAppLoading}
    >
      <EnterpriseSearchUserUnauthenticatedModal />
      {/* Workaround not using flex-container */}
      <div>
        <div
          className="security-banner security-banner-top"
          style={{ background: bannerColor, color: fontColor, fontWeight }}
        >
          <div className="leftText">{leftText}</div>
          <div className="centerText">{bannerText}</div>
          <div className="rightText">{rightText}</div>
        </div>
      </div>
      <div
        className={classNames('flex', applicationName, className, {
          /*
           * IMPORTANT: If using CSS to hide elements, make sure to also modify permissions or add API logic to prevent
           * tech-savvy users from enabling the elements via the browser's developer tools and making API calls.
           */
          'is-genai-admin': isAdmin,
          'is-genai-document-admin': isDocAdmin,
          'is-genai-basic-user': isBasicUser,
          'is-genai-project-readonly': !noActiveProject && isUsingReadOnlyProject,
        })}
      >
        <UiSdlNestedComponent componentId="EnterpriseSearch.MessageContainer" />

        {navigation && (
          <div id="nav" key="nav" className="nav">
            {navigation}
          </div>
        )}

        <UiSdlNestedComponent componentId="EnterpriseSearch.OnboardingModal" />

        {content && (
          <div id="content" key="content" className="content" onScroll={handleScroll}>
            {pageTitle}
            {pageBreadcrumbs}
            {content}
          </div>
        )}
        {children}
      </div>
      <div
        className="security-banner security-banner-bottom"
        style={{ background: bannerColor, color: fontColor, fontWeight }}
      >
        <div className="leftText">{leftText}</div>
        <div className="centerText">{bannerText}</div>
        <div className="centerText">{rightText}</div>
      </div>
    </GuruSearchLayoutPage.Wrapper>
  );
};

interface WrapperProps {
  isInOnboardingMode: boolean;
  isInFreeTrial: boolean;
  isAppLoading: boolean;
  children: React.ReactNode;
  currentPath: string;
}



GuruSearchLayoutPage.Wrapper = ({
  isInOnboardingMode,
  isInFreeTrial,
  isAppLoading,
  children,
  currentPath,
}: WrapperProps): React.ReactNode => {
  const translate = useTranslate();

  const isInWelcomePage = currentPath === '/welcome';
  const banners =
    !isInWelcomePage && (isInOnboardingMode || isInFreeTrial)
      ? [
        <UiSdlNestedComponent
          key="EnterpriseSearch.SelfServiceBanner"
          componentId="EnterpriseSearch.SelfServiceBanner"
        />,
      ]
      : [];

  return (
    <SDLSpinnerDemo
      isDataLoading={isAppLoading}
      loadingText={translate({
        spec: 'EnterpriseSearch.AppLoadingSpinner.label',
      })}
    >
      <UiSdlEnterpriseSearchContextualBanner banners={banners}>{children}</UiSdlEnterpriseSearchContextualBanner>
    </SDLSpinnerDemo>
  );
};

export default GuruSearchLayoutPage;
