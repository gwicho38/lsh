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
import { GuruUiSearchResultMap as GuruUiSearchResultMapProps } from '@c3/types';
import { useTranslate } from '@c3/sdl-react/hooks/useTranslate';
import FedGraphVisualization from '@c3/ui/FedGraphVisualizationReact';
import GenAiUiVisualizationContainer from '@c3/ui/GenAiUiVisualizationContainerReact';
import { DOWNLOAD_OPTIONS_FOR_VIZ } from '@c3/ui/GenAiUiVisualizationUtils';
import { VisualizationSpec, useGenerateGuruVisualizationSpec } from '@c3/ui/GuruVisualizationSpec';

const GuruUiSearchResultMap: React.FunctionComponent<GuruUiSearchResultMapProps> = (props) => {
  const translate = useTranslate();
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [hasVizError, setHasVizError] = useState(false);
  const [data, columnNames] = [props.data, props.columnNames];
  const [gridSpec, cancelGeneration]: VisualizationSpec = useGenerateGuruVisualizationSpec({
    initialVizSpec: {
      data,
      columnNames,
    },
    setIsDataLoading,
    setHasVizError,
  });

  const { data: gridData, columnNames: gridColumnNames, mapData: mapData } = gridSpec || {};

  const engineJson = JSON.parse(props.data[1]['engineLog'])[0];

  const mapVisualization: FedGraphVisualization = (
    <div>
      <FedGraphVisualization
        {...props}
        {...props.mapSpec}
        data={mapData}
        boundingBox={{
          lat1: engineJson.lat1,
          lat2: engineJson.lat2,
          lon1: engineJson.lon1,
          lon2: engineJson.lon2,
        }}
      />
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
          spec: 'EnterpriseSearch.DynamicVisualization.Map.defaultFallbackTitle',
        })
      }
      showGridSwitch
      downloadOptions={DOWNLOAD_OPTIONS_FOR_VIZ.MAP}
      defaultVisualization={mapVisualization}
      defaultVisualizationLabel={translate({
        spec: 'EnterpriseSearch.DynamicVisualization.Map.label',
      })}
    />
  );
};

export default GuruUiSearchResultMap;
