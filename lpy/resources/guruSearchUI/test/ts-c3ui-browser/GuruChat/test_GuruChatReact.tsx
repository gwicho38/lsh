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
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { configure as enzymeConfigure, ReactWrapper } from 'enzyme';
import UiSdlChat from '@c3/ui/UiSdlChatReact';
import SpecHelper from '@c3/ui/UiSdlSpecHelper';
import DateTime from '@c3/ui/UiSdlDateTime';
import SDLChatMessage from '@c3/sdl-react/reactComponents/SDLChatMessage';
import SDLInput from '@c3/sdl-react/reactComponents/SDLInput';
import { IntlProvider } from 'react-intl';
import { UiSdlChat as UiSdlChatProps } from '@c3/types';
import { CHAT_LOADING_MESSAGE_TEXT } from '@c3/ui/UiSdlChat';

// TODO: https://c3energy.atlassian.net/browse/COR-1247
