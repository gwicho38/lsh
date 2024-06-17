/*
 * Copyright 2009-2024 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

import * as React from "react";
import { fromJS } from "immutable";
import { createStore } from "redux";
import { Provider as ReactReduxProvider } from "react-redux";
import { IntlProvider } from "react-intl";
import EnzymeAdapter from "enzyme-adapter-react-16";
import jasmineEnzyme from "jasmine-enzyme";
import { configure as enzymeConfigure, mount, ReactWrapper } from "enzyme";
import UiSdlLocaleContext from "@c3/ui/UiSdlLocaleContext";
import { UiSdlGraphVisualization as UiSdlGraphVisualizationProps } from "@c3/types";
import UiSdlGraphVisualization from "@c3/ui/UiSdlGraphVisualizationReact";
import UiSdlGraphVisualizationPresentationalComponent from "@c3/ui/UiSdlGraphVisualizationPresentationalComponentReact";

import { importType } from "@c3/ui/UiSdlUseType";
