/*
 * Copyright 2009-2024 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

import React, { useState } from 'react';
import _map from 'lodash/map';
import _mapValues from 'lodash/mapValues';
import { GuruUiSearchResultImageGrid as GuruUiSearchResultImageGridProps } from '@c3/types';
import GuruUiImageGrid from '@c3/ui/GuruUiImageGridReact';
import { useTranslate } from '@c3/sdl-react/hooks/useTranslate';
import GenAiUiVisualizationContainer from '@c3/ui/GenAiUiVisualizationContainerReact';
import {
  useGenerateGenAiVisualizationSpec,
  VisualizationSpec,
} from '@c3/ui/EnterpriseSearchUseGenerateGenAiVisualizationSpec';

const GuruUiSearchResultImageGrid: React.FunctionComponent<GuruUiSearchResultImageGridProps> = (props) => {
  const translate = useTranslate();
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [hasVizError, setHasVizError] = useState(false);
  const [data, columnNames, evalMetricsSpec, evalSpec, sourceType] = [
    props.data,
    props.columnNames,
    props.evalMetricsSpec,
    props.evalSpec,
    props.sourceType,
  ];
  const [gridSpec, cancelGeneration]: VisualizationSpec = useGenerateGenAiVisualizationSpec({
    initialVizSpec: {
      data,
      columnNames,
      evalMetricsSpec,
      evalSpec,
      sourceType,
    },
    setIsDataLoading,
    setHasVizError,
  });

  const { data: gridData, columnNames: gridColumnNames } = gridSpec || {};

  const imageGridVisualization: GuruUiImageGrid = (
    <div>
      <GuruUiImageGrid imageSpec={props.imageSpec} data={props.data} />
    </div>
  );

  return (
    <GenAiUiVisualizationContainer
      data={gridData}
      columnNames={gridColumnNames}
      isDataLoading={isDataLoading}
      hasVizError={hasVizError}
      cancelGeneration={cancelGeneration}
      title={
        props.title ||
        translate({
          spec: 'EnterpriseSearch.DynamicVisualization.Grid.defaultFallbackTitle',
        })
      }
      showGridSwitch={false}
      defaultVisualization={imageGridVisualization}
    />
  );
};

export default GuruUiSearchResultImageGrid;
