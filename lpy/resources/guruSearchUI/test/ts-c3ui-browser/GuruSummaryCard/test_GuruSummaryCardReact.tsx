/*
 * Copyright 2009-2024 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

import * as React from 'react';
import EnzymeAdapter from 'enzyme-adapter-react-16';
import jasmineEnzyme from 'jasmine-enzyme';
import _forEach from 'lodash/forEach';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { configure as enzymeConfigure, mount } from 'enzyme';
import SpecHelper from '@c3/ui/UiSdlSpecHelper';

// TODO: https://c3energy.atlassian.net/browse/COR-1253