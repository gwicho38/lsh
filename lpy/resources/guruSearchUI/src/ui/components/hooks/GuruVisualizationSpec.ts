/*
 * Copyright 2009-2024 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

import { useState, useEffect } from 'react';
import _each from 'lodash/each';
import _every from 'lodash/every';
import _map from 'lodash/map';
import _values from 'lodash/values';
import { ajax } from '@c3/ui/UiSdlDataRedux';
import { GuruUiSearchResultMap } from '@c3/types';

type GenAiVisualizationTypeProps = GuruUiSearchResultMap;

export interface VisualizationSpec {
  data?: any[];
  mapData?: any[];
  columnNames?: string[];
  spec?: any;
}

export const useGenerateGuruVisualizationSpec = ({
  initialVizSpec,
  setIsDataLoading,
  setHasVizError,
}: {
  initialVizSpec: VisualizationSpec;
  setIsDataLoading: (isLoading: boolean) => void;
  setHasVizError: (hasError: boolean) => void;
}): [VisualizationSpec, Function] => {
  // Viz Spec used for rendering the chart
  const [vizSpec, setVizSpec] = useState({});

  // Viz spec generated when the eval metrics spec changes, which becomes the viz spec unless the generation is canceled
  const [generatedVizSpec, setGeneratedVizSpec] = useState({});

  // Flag to indicate if the user clicked on "Cancel Generation" and the Viz spec should not be updated
  const [cancelGeneratedVizSpec, setCancelGeneratedVizSpec] = useState(false);

  const { spec } = initialVizSpec;
  let isSubscribed = true;

  const updateVizSpec = (nextVizSpec: VisualizationSpec): void => {
    setGeneratedVizSpec(nextVizSpec);
    setIsDataLoading(false);
  };

  const handleError = (): void => {
    setHasVizError(true);
    setIsDataLoading(false);
  };

  useEffect(() => {
    setHasVizError(false);
    setIsDataLoading(true);
    setCancelGeneratedVizSpec(false);

    generateVizSpec({
      isSubscribed,
      initialVizSpec,
      setVizSpec: updateVizSpec,
      handleError,
    });

    return (): void => {
      isSubscribed = false;
    };
  }, [spec]);

  /*
   * When the viz spec has finished generating, we update it in the state if the user did not cancel its generation
   * Otherwise, we set back the original viz spec
   */
  useEffect(() => {
    // If the eval metrics spec has changed, we want to show the loader until the new viz spec is generated
    if (spec && generatedVizSpec.spec !== spec) {
      setIsDataLoading(true);
    } else if (cancelGeneratedVizSpec) {
      setVizSpec(vizSpec);
    } else {
      setVizSpec(generatedVizSpec);
    }
  }, [generatedVizSpec]);

  const cancelGeneration = (): void => {
    setCancelGeneratedVizSpec(true);
    setGeneratedVizSpec(vizSpec);
    setIsDataLoading(false);
  };

  return [vizSpec, cancelGeneration];
};

export const generateVizSpec = ({
  isSubscribed,
  initialVizSpec,
  setVizSpec,
  handleError,
}: {
  isSubscribed: boolean;
  initialVizSpec: VisualizationSpec;
  setVizSpec: (vizSpec: VisualizationSpec) => void;
  handleError: () => void;
}): void => {
  const { data } = initialVizSpec;

  ajax('GuruVisualizationMap', 'getGraph', {
    fileUrl: data[0]['trackFile'],
  }).subscribe(
    (xhr) => {
      if (isSubscribed) {
        const { data, columnNames, mapData } = xhr.response;

        setVizSpec(createVizSpec(data, columnNames, mapData));
      }
    },
    () => {
      handleError();
    },
  );
};

export const createVizSpec = (
  data: any[] = [],
  columnNames: string[] = [],
  mapData: any[] = [],
): GenAiVisualizationTypeProps => {
  return {
    data,
    columnNames,
    mapData,
  };
};
