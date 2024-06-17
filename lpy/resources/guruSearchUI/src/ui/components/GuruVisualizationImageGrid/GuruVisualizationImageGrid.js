/*
 * Copyright 2009-2024 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

function generateUiComponent() {
  return {
    /**
     * Since the component is rendered by a UiSdlDynamicComponentRenderer an id is required BUT it must be different
     * in order for another query to be visualized.
     */
    id: Uuid.create(),
    type: 'UiSdlConnected<GuruUiSearchResultImageGrid>',
    component: GuruUiSearchResultImageGrid.make(
      Object.assign(
        {
          imageSpec: {
            urlText: 'Link',
            size: 'MEDIUM',
            horizontalAlign: 'CENTER',
            verticalAlign: 'MIDDLE',
            altText: 'thumbnail',
            wrapWithMetadataId: true,
          },
        },
        this.getBaseComponentConfiguration(),
      ),
      true,
    ),
  };
}
