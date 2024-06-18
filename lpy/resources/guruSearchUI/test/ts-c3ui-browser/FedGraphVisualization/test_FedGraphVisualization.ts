/*
 * Copyright 2009-2024 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

import FileSaver from 'file-saver';
import GenAiUiVisualizationUtils, {
  DOWNLOAD_OPTION,
  DEFAULT_MISSING_DATA_PLACEHOLDER,
  createDownloadActionButton,
  createDownloadActionButtons,
  downloadCsv,
  downloadImage,
  roundData,
  beautifyNumber,
} from '@c3/ui/GenAiUiVisualizationUtils';
import SpecHelper from '@c3/ui/UiSdlSpecHelper';

const filename = 'test_FedGraphVisualization.ts';

xdescribe(filename, function () {
    // TODO: https://c3energy.atlassian.net/browse/COR-1241 
    // TODO: https://c3energy.atlassian.net/browse/COR-1246
});