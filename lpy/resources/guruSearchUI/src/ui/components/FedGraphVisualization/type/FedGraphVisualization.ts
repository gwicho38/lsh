/*
 * Copyright 2009-2024 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

import { AnyAction } from 'redux';
import { Epic } from 'redux-observable';
import { concat, of } from 'rxjs';
import { mergeMap, map } from 'rxjs/operators';
import { Map } from 'immutable';
import {
  getConfigFromState,
  ImmutableReduxState,
  setConfigInState,
  getInitialConfigFromState,
} from '@c3/ui/UiSdlConnected';
import {
  openCloseModalAction,
  setUiSdlGraphVisualizationComponentIdAction,
} from '@c3/ui/UiSdlGraphVisualizationGraphWarningModal';
import {
  UiSdlAction,
  UiSdlActionsObservable,
  UiSdlStatesObservable,
  UiSdlReduxAction,
  UiSdlComponentActionPayload,
  UiSdlWarningModalOpenAction,
  UiSdlWarningModalCloseAction,
  UiSdlGraphVisualizationBaseGlyphConfig,
  UiSdlGraphVisualizationClickContextMenuItemActionPayload,
  UiSdlGraphVisualizationClickEdgeActionPayload,
  UiSdlGraphVisualizationClickEdgeGlyphActionPayload,
  UiSdlGraphVisualizationClickNodeActionPayload,
  UiSdlGraphVisualizationClickNodeGlyphActionPayload,
  UiSdlGraphVisualizationClickRegionActionPayload,
  UiSdlGraphVisualizationDoubleClickNodeActionPayload,
  UiSdlGraphVisualizationInitializeCanvasItemsActionPayload,
  UiSdlGraphVisualizationForceInitializeCanvasItemsActionPayload,
  UiSdlGraphVisualizationHoverOnEdgeActionPayload,
  UiSdlGraphVisualizationHoverOnMergedEdgeActionPayload,
  UiSdlGraphVisualizationHoverOnNodeActionPayload,
  UiSdlGraphVisualizationLayout,
  UiSdlGraphVisualizationAnimation,
  UiSdlGraphVisualizationSetCacheKeyActionPayload,
  UiSdlGraphVisualizationSetClearingCanvasItemsActionPayload,
  UiSdlGraphVisualizationSetDataLoadingActionPayload,
  UiSdlGraphVisualizationSetLayoutActionPayload,
  UiSdlGraphVisualizationSetMergedEdgeMappingActionPayload,
  UiSdlGraphVisualizationSetSelectedItemsActionPayload,
  UiSdlGraphVisualizationSetTimeBarInRangeItemsActionPayload,
  UiSdSetAnimationGraphVisualizationAction,
} from '@c3/types';
import cloneDeep from 'lodash/cloneDeep';
import isEmpty from 'lodash/isEmpty';
import merge from 'lodash/merge';

const DEFAULT_HOVER_HALO_RADIUS = 28;
const DEFAULT_HOVER_HALO_WIDTH = 4;
const DEFAULT_HOVER_HALO_COLOR = '#c5cadb';
const DEFAULT_NODE_BORDER_WIDTH = 4;

/**
 * Helper function to update the fade for highlighted items in canvasItems.
 * @param {Map} canvasItems - The graph canvas items.
 * @param {Record<string, boolean>} highlightedItems - A map of items to highlight.
 * @returns An updated canvasItems Map with the fade property set to true for all canvasItems other than the
 *   highlightedItems.
 */
function addCanvasItemsHighlight(canvasItems: Map, highlightedItems: Record<string, boolean>): Map {
  return canvasItems.map((value: Map, key: string): Map => value.set('fade', !highlightedItems[key]));
}

/**
 * Helper function to remove the fade for all items in canvasItems.
 * @param canvasItems {Map} - The graph canvas items.
 * @returns An updated canvasItems with the fade property set to false for all canvasItems.
 */
function removeNodesAndEdgesHighlight(canvasItems: Map): Map {
  return canvasItems.map((value: Map): Map => value.set('fade', false));
}

/**
 * Helper function to highlight a hovered item's 1st degree neighbors in canvasItems. The hovered item's
 * neighbors are only highlighted if the highlightNeighborsOnHover is true and no items are currently selected.
 * To emulate a hover off action, pass in an empty item.
 * @param state {ImmutableReduxState} - The current graph Redux state.
 * @param action {UiSdlReduxAction} - The Redux action that triggered the reducer.
 * @param canvasItems {Map} - The graph canvas items.
 * @param item {Map} - The hovered item.
 * @returns An updated Redux state with the highlightedItemIds and canvasItems property set.
 */
function setHoveredItemHighlight(
  state: ImmutableReduxState,
  action: UiSdlReduxAction,
  canvasItems: Map,
  item: Map,
): ImmutableReduxState {
  const componentId = action.payload.componentId;
  const hoveredItemId = action.payload.hoveredNodeId || action.payload.hoveredEdgeId;

  const highlightNeighborsOnHover =
    getConfigFromState(componentId, state, ['hoverConfig', 'highlightNeighborsOnHover']) ?? true;
  const selectedItems = getConfigFromState(componentId, state, ['selectedItems']);

  if (highlightNeighborsOnHover && (!selectedItems || selectedItems.isEmpty())) {
    if (item && !item.isEmpty()) {
      const neighbors = {
        [hoveredItemId]: true,
      };
      item.get('neighbors').forEach(function (neighborId) {
        neighbors[neighborId] = true;
      });
      canvasItems = addCanvasItemsHighlight(canvasItems, neighbors);
      state = setConfigInState(componentId, state, ['highlightedItemIds'], Object.keys(neighbors));
    } else {
      canvasItems = removeNodesAndEdgesHighlight(canvasItems);
      state = setConfigInState(componentId, state, ['highlightedItemIds'], []);
    }
  }

  return setConfigInState(componentId, state, ['canvasItems'], canvasItems);
}

/**
 * Helper function to get the activeTooltip data.
 * @param x {number} - The x location of the pointer in view coordinates.
 * @param y {number} - The y location of the pointer in view coordinates.
 * @param data {Map} - The hovered item data to retreive the tooltip properties from.
 * @param zoomValue {number} - The zoom value.
 * @returns An object to represent a tooltip in the structure of UiSdlGraphVisualizationTooltipData with fields
 *   populated based on the item data object and tooltip configuration.
 */
function getActiveTooltip(x: number, y: number, data: Map, zoomValue?: number): Record<string, string | number> {
  if (!data || data.isEmpty()) {
    return {};
  }

  return {
    x,
    y,
    tooltipTitle: data.get('tooltipTitle'),
    tooltipSubtitle: data.get('tooltipSubtitle'),
    tooltipBody: data.get('tooltipBody'),
    zoomValue,
  };
}

export function openWarningModalAction(id: string, warningModalId: string): UiSdlWarningModalOpenAction {
  return {
    type: id + '.WARNING_MODAL_OPEN',
    payload: {
      componentId: id,
      warningModalId,
    },
  };
}

export function closeWarningModalAction(id: string, warningModalId: string): UiSdlWarningModalCloseAction {
  return {
    type: id + '.WARNING_MODAL_CLOSE',
    payload: {
      componentId: id,
      warningModalId,
    },
  };
}

export function clickEdgeAction(
  id: string,
  edgeId: string,
): UiSdlReduxAction<UiSdlGraphVisualizationClickEdgeActionPayload> {
  return {
    type: `${id}.EDGE_CLICK`,
    payload: {
      componentId: id,
      edgeId,
    },
  };
}

export function clickEdgeGlyphAction(
  id: string,
  edgeId: string,
  glyph: UiSdlGraphVisualizationBaseGlyphConfig,
): UiSdlReduxAction<UiSdlGraphVisualizationClickEdgeGlyphActionPayload> {
  return {
    type: `${id}.EDGE_GLYPH_CLICK`,
    payload: {
      componentId: id,
      edgeId,
      glyph,
    },
  };
}

export function clickGraphAction(id: string, lat: number, lng: number): UiSdlReduxAction<UiSdlComponentActionPayload> {
  const type = `${id}.GRAPH_CLICK`;

  // Only return coordinates object if the Graph is in map mode
  if (lat && lng) {
    return {
      type,
      payload: {
        componentId: id,
        coordinates: {
          lat,
          lng,
        },
      },
    };
  }
  return {
    type,
    payload: { componentId: id },
  };
}

export function clickNodeAction(
  id: string,
  nodeId: string,
): UiSdlReduxAction<UiSdlGraphVisualizationClickNodeActionPayload> {
  return {
    type: `${id}.NODE_CLICK`,
    payload: {
      componentId: id,
      nodeId,
    },
  };
}

export function clickRegionAction(
  id: string,
  regionId: string,
): UiSdlReduxAction<UiSdlGraphVisualizationClickRegionActionPayload> {
  return {
    type: `${id}.REGION_CLICK`,
    payload: {
      componentId: id,
      regionId,
    },
  };
}

export function clickNodeGlyphAction(
  id: string,
  nodeId: string,
  glyph: UiSdlGraphVisualizationBaseGlyphConfig,
): UiSdlReduxAction<UiSdlGraphVisualizationClickNodeGlyphActionPayload> {
  return {
    type: `${id}.NODE_GLYPH_CLICK`,
    payload: {
      componentId: id,
      nodeId,
      glyph,
    },
  };
}

export function initializeCanvasItemsAction(
  id: string,
  items: object,
): UiSdlReduxAction<UiSdlGraphVisualizationInitializeCanvasItemsActionPayload> {
  return {
    type: `${id}.CANVAS_ITEMS_INITIALIZE`,
    payload: {
      componentId: id,
      items,
    },
  };
}

export function resetGraphAction(id: string): UiSdlReduxAction<UiSdlComponentActionPayload> {
  return {
    type: `${id}.RESET_GRAPH_TO_INITIAL_STATE`,
    payload: {
      componentId: id,
    },
  };
}

export function setForceCanvasItemsInitializationAction(
  id: string,
  shouldForceInitialization: boolean,
): UiSdlReduxAction<UiSdlGraphVisualizationForceInitializeCanvasItemsActionPayload> {
  return {
    type: `${id}.FORCE_CANVAS_ITEMS_INITIALIZATION_SET`,
    payload: {
      componentId: id,
      shouldForceInitialization,
    },
  };
}

export function setSelectedItemsAction(
  id: string,
  selectedItemIds: string[],
): UiSdlReduxAction<UiSdlGraphVisualizationSetSelectedItemsActionPayload> {
  return {
    type: `${id}.SELECTED_ITEMS_SET`,
    payload: {
      componentId: id,
      selectedItemIds,
    },
  };
}

export function setMergedEdgeMappingAction(
  id: string,
  mergedEdgeMapping: Record<string, string>,
): UiSdlReduxAction<UiSdlGraphVisualizationSetMergedEdgeMappingActionPayload> {
  return {
    type: `${id}.MERGED_EDGE_MAPPING_SET`,
    payload: {
      componentId: id,
      mergedEdgeMapping,
    },
  };
}

export function doubleClickNodeAction(
  id: string,
  nodeId: string,
): UiSdlReduxAction<UiSdlGraphVisualizationDoubleClickNodeActionPayload> {
  return {
    type: `${id}.NODE_DOUBLE_CLICK`,
    payload: {
      componentId: id,
      nodeId,
    },
  };
}

export function clickClearGraphAction(id: string): UiSdlReduxAction<UiSdlComponentActionPayload> {
  return {
    type: `${id}.CLEAR_GRAPH_CLICK`,
    payload: {
      componentId: id,
    },
  };
}

export function setClearingCanvasItemsAction(
  id: string,
  isClearingCanvasItems: boolean,
): UiSdlReduxAction<UiSdlGraphVisualizationSetClearingCanvasItemsActionPayload> {
  return {
    type: `${id}.CLEARING_CANVAS_ITEMS_SET`,
    payload: {
      componentId: id,
      isClearingCanvasItems,
    },
  };
}

export function setCacheKeyAction(
  id: string,
  cacheKey: string,
): UiSdlReduxAction<UiSdlGraphVisualizationSetCacheKeyActionPayload> {
  return {
    type: `${id}.CACHE_KEY_SET`,
    payload: {
      componentId: id,
      cacheKey,
    },
  };
}

export function setDataLoadingAction(
  id: string,
  isDataLoading: boolean,
): UiSdlReduxAction<UiSdlGraphVisualizationSetDataLoadingActionPayload> {
  return {
    type: `${id}.DATA_LOADING_SET`,
    payload: {
      componentId: id,
      isDataLoading,
    },
  };
}

export function setTimeBarInRangeItemsAction(
  id: string,
  timeBarInRangeItems: string[],
): UiSdlReduxAction<UiSdlGraphVisualizationSetTimeBarInRangeItemsActionPayload> {
  return {
    type: `${id}.TIME_BAR_RANGE_SET`,
    payload: {
      componentId: id,
      timeBarInRangeItems,
    },
  };
}

export function hoverOnNodeAction(
  id: string,
  hoveredNodeId: string,
  x: number,
  y: number,
  zoomValue: number,
): UiSdlReduxAction<UiSdlGraphVisualizationHoverOnNodeActionPayload> {
  return {
    type: `${id}.NODE_HOVER_ON`,
    payload: {
      componentId: id,
      hoveredNodeId,
      x,
      y,
      zoomValue,
    },
  };
}

export function hoverOnEdgeAction(
  id: string,
  hoveredEdgeId: string,
  x: number,
  y: number,
): UiSdlReduxAction<UiSdlGraphVisualizationHoverOnEdgeActionPayload> {
  return {
    type: `${id}.EDGE_HOVER_ON`,
    payload: {
      componentId: id,
      hoveredEdgeId,
      x,
      y,
    },
  };
}

export function hoverOnMergedEdgeAction(
  id: string,
  hoveredEdgeIds: string[],
): UiSdlReduxAction<UiSdlGraphVisualizationHoverOnMergedEdgeActionPayload> {
  return {
    type: `${id}.MERGED_EDGE_HOVER_ON`,
    payload: {
      componentId: id,
      hoveredEdgeIds,
    },
  };
}

export function hoverOffNodeAction(id: string): UiSdlReduxAction<UiSdlComponentActionPayload> {
  return {
    type: `${id}.NODE_HOVER_OFF`,
    payload: {
      componentId: id,
    },
  };
}

export function hoverOffEdgeAction(id: string): UiSdlReduxAction<UiSdlComponentActionPayload> {
  return {
    type: `${id}.EDGE_HOVER_OFF`,
    payload: {
      componentId: id,
    },
  };
}

export function pingItemsAction(id: string, pingItemIds: string[]): UiSdlReduxAction {
  return {
    type: `${id}.ITEMS_PING`,
    payload: {
      componentId: id,
      pingItemIds,
    },
  };
}

export function hoverOffMergedEdgeAction(id: string): UiSdlReduxAction {
  return {
    type: `${id}.MERGED_EDGE_HOVER_OFF`,
    payload: {
      componentId: id,
    },
  };
}

export function setLayoutAction(
  id: string,
  layout: UiSdlGraphVisualizationLayout,
): UiSdlReduxAction<UiSdlGraphVisualizationSetLayoutActionPayload> {
  return {
    type: `${id}.LAYOUT_SET`,
    payload: {
      componentId: id,
      layout,
    },
  };
}

export function setAnimationAction(
  id: string,
  animation: UiSdlGraphVisualizationAnimation,
): UiSdSetAnimationGraphVisualizationAction {
  return {
    type: `${id}.ANIMATION_SET`,
    payload: {
      componentId: id,
      animation,
    },
  };
}

export function clickContextMenuItemAction(
  id: string,
  itemId: string,
  actionToDispatch: UiSdlAction,
): UiSdlReduxAction<UiSdlGraphVisualizationClickContextMenuItemActionPayload> {
  return {
    type: `${id}.CONTEXT_MENU_ITEM_CLICK`,
    payload: {
      componentId: id,
      itemId,
      actionToDispatch,
    },
  };
}

export function regionClickReducer(state: ImmutableReduxState, action: UiSdlReduxAction): ImmutableReduxState {
  const {
    payload: { componentId, regionId },
  } = action;

  return setConfigInState(componentId, state, ['selectedRegion'], regionId);
}

export function resetGraphReducer(state: ImmutableReduxState, action: UiSdlReduxAction): ImmutableReduxState {
  const {
    payload: { componentId },
  } = action;
  const initialState = cloneDeep(getInitialConfigFromState(componentId, state).toJS());
  return setConfigInState(componentId, state, [], initialState);
}

export function cacheKeySetReducer(state: ImmutableReduxState, action: UiSdlReduxAction): ImmutableReduxState {
  const {
    payload: { cacheKey, componentId },
  } = action;

  return setConfigInState(componentId, state, ['cacheKey'], cacheKey);
}

export function canvasItemsInitializeReducer(
  state: ImmutableReduxState,
  action: UiSdlReduxAction,
): ImmutableReduxState {
  return setConfigInState(action.payload.componentId, state, ['canvasItems'], action.payload.items);
}

export function forceCanvasItemsInitializationSetReducer(
  state: ImmutableReduxState,
  action: UiSdlReduxAction,
): ImmutableReduxState {
  const {
    payload: { componentId, shouldForceInitialization },
  } = action;

  return setConfigInState(componentId, state, ['forceCanvasItemsInitialization'], shouldForceInitialization);
}

export function mergedEdgeMappingSetReducer(state: ImmutableReduxState, action: UiSdlReduxAction): ImmutableReduxState {
  const {
    payload: { componentId, mergedEdgeMapping },
  } = action;

  return setConfigInState(componentId, state, ['mergedEdgeMapping'], mergedEdgeMapping);
}

export function selectedItemsSetReducer(state: ImmutableReduxState, action: UiSdlReduxAction): ImmutableReduxState {
  const {
    payload: { componentId, selectedItemIds },
  } = action;

  let canvasItems: Map = getConfigFromState(componentId, state, ['canvasItems']);

  // Utility function to check if the provided id corresponds to an edge in canvasItems.
  const isEdge = (id: string): boolean => canvasItems.get(id).has('id1') && canvasItems.get(id).has('id2');

  /**
   * When an edge is programmatically selected, the id provided might be of the unmerged edge. Before applying
   * selection styling, check if the disableMergedEdges prop was set to true and use the mergedEdgeMapping to
   * get the id of the merged edge from the original edge id.
   */
  const isMergedEdge = !getConfigFromState(componentId, state, ['disableMergedEdges']);
  const mergedEdgeMapping = isMergedEdge
    ? getConfigFromState(componentId, state, ['mergedEdgeMapping']) || new Map()
    : new Map();

  const selectedItems: Record<string, boolean> = {};
  selectedItemIds?.forEach((id: string) => {
    if (!isMergedEdge || !mergedEdgeMapping.has(id)) {
      selectedItems[id] = true;
    } else {
      selectedItems[mergedEdgeMapping.get(id)] = true;
    }
  });

  // Maps to store the selected nodes and edges separately in the component's state.
  const selectedNodeIds: Record<string, boolean> = {};
  const selectedEdgeIds: Record<string, boolean> = {};

  // The set of 1st degree neighbors to highlight if highlightNeighborsOnSelect is true.
  const highlightedItems: Record<string, boolean> = {};
  const neighboringNodesCount: Record<string, number> = {};
  const neighboringEdgesList: Map[] = [];

  // Selection configurations.
  const highlightNeighborsOnSelect =
    getConfigFromState(componentId, state, ['selectionConfig', 'highlightNeighborsOnSelect']) ?? true;
  const multiSelectionBehavior =
    getConfigFromState(componentId, state, ['selectionConfig', 'multiSelectionBehavior']) ?? 'union';

  // Loop through each of the selected item ids and update the highlighted items maps.
  const ids = Object.keys(selectedItems);
  ids.forEach((id: string) => {
    const item = canvasItems.get(id);
    if (isEdge(id)) {
      selectedEdgeIds[id] = true;
    } else {
      selectedNodeIds[id] = true;
    }

    // Always highlight the selected item.
    highlightedItems[id] = true;

    item.get('neighbors').forEach(function (neighborId) {
      highlightedItems[neighborId] = true;
      if (isEdge(neighborId)) {
        neighboringEdgesList.push(canvasItems.get(neighborId));
      } else if (neighborId in neighboringNodesCount) {
        neighboringNodesCount[neighborId] += 1;
      } else {
        neighboringNodesCount[neighborId] = 1;
      }
    });
  });

  if (highlightNeighborsOnSelect) {
    if (isEmpty(selectedItems)) {
      /**
       * If setSelectedItemsAction is called on a empty map, remove highlight from all the previous highlighted
       * nodes and edges.
       */
      canvasItems = removeNodesAndEdgesHighlight(canvasItems);
      state = setConfigInState(componentId, state, ['highlightedItemIds'], []);
    } else if (multiSelectionBehavior === 'intersection') {
      /**
       * If multi-selection behavior is 'intersection', find all the nodes that are appear as a neighbor
       * for each of the selected item, and then edges that connects them. A node is a common neighbors if
       * it appears as a neighbors `ids.length` times.
       */
      const commonNeighbors: Record<string, boolean> = {};
      ids.forEach(function (id) {
        commonNeighbors[id] = true;
      });

      // Add all nodes that appeared as neighbors `ids.length` times to the commonNeighbors map.
      Object.keys(neighboringNodesCount).forEach(function (nodeId) {
        if (neighboringNodesCount[nodeId] === ids.length) {
          commonNeighbors[nodeId] = true;
        }
      });

      // Add edges that have both adjacent nodes in the commonNeighbors map to the commonNeighbors map.
      neighboringEdgesList.forEach((edge) => {
        if (commonNeighbors[edge.get('id1')] && commonNeighbors[edge.get('id2')]) {
          commonNeighbors[edge.get('id')] = true;
        }
      });

      canvasItems = addCanvasItemsHighlight(canvasItems, commonNeighbors);
      state = setConfigInState(componentId, state, ['highlightedItemIds'], Object.keys(commonNeighbors));
    } else if (multiSelectionBehavior === 'union') {
      /**
       * If multi-selection behavior is 'union', add highlight all the items in the `highlightedItems` variable.
       */
      canvasItems = addCanvasItemsHighlight(canvasItems, highlightedItems);
      state = setConfigInState(componentId, state, ['highlightedItemIds'], Object.keys(highlightedItems));
    }
  } else {
    canvasItems = removeNodesAndEdgesHighlight(canvasItems);

    // If there's nothing selected do not highlight an empty map
    if (ids?.length > 0) {
      canvasItems = addCanvasItemsHighlight(canvasItems, selectedItems);
    }
    state = setConfigInState(componentId, state, ['highlightedItemIds'], ids?.length > 0 ? ids : []);
  }

  state = setConfigInState(componentId, state, ['canvasItems'], canvasItems);
  state = setConfigInState(componentId, state, ['selectedNodeIds'], Object.keys(selectedNodeIds));
  state = setConfigInState(componentId, state, ['selectedEdgeIds'], Object.keys(selectedEdgeIds));
  return setConfigInState(componentId, state, ['selectedItems'], selectedItems);
}

export function clearGraphClickReducer(state: ImmutableReduxState, action: UiSdlReduxAction): ImmutableReduxState {
  const {
    payload: { componentId },
  } = action;
  state = setConfigInState(componentId, state, ['highlightedItemIds'], []);
  state = setConfigInState(componentId, state, ['selectedItems'], {});
  state = setConfigInState(componentId, state, ['selectedEdgeIds'], []);
  state = setConfigInState(componentId, state, ['selectedNodeIds'], []);
  state = setConfigInState(componentId, state, ['selectedRegion'], null);
  state = setConfigInState(componentId, state, ['hoveredEdgeId'], null);
  state = setConfigInState(componentId, state, ['hoveredNodeId'], null);
  state = setConfigInState(componentId, state, ['activeTooltip'], {});
  state = setConfigInState(componentId, state, ['timeBarInRangeItems'], []);
  state = setConfigInState(componentId, state, ['hiddenNodes'], []);
  return setConfigInState(componentId, state, ['canvasItems'], {});
}

export function clearingCanvasItemsSetReducer(
  state: ImmutableReduxState,
  action: UiSdlReduxAction,
): ImmutableReduxState {
  const {
    payload: { componentId, isClearingCanvasItems },
  } = action;
  return setConfigInState(componentId, state, ['isClearingCanvasItems'], isClearingCanvasItems);
}

export function dataLoadingSetReducer(state: ImmutableReduxState, action: UiSdlReduxAction): ImmutableReduxState {
  const {
    payload: { componentId, isDataLoading },
  } = action;
  return setConfigInState(componentId, state, ['isDataLoading'], isDataLoading);
}

export function itemsPingReducer(state: ImmutableReduxState, action: UiSdlReduxAction): ImmutableReduxState {
  const {
    payload: { componentId, pingItemIds },
  } = action;
  return setConfigInState(componentId, state, ['pingItems'], pingItemIds);
}

export function timeBarInRangeItemsSetReducer(
  state: ImmutableReduxState,
  action: UiSdlReduxAction,
): ImmutableReduxState {
  const {
    payload: { componentId, timeBarInRangeItems },
  } = action;
  const mergeEdges = !getConfigFromState(componentId, state, ['disableMergedEdges']);
  const mergedEdgeMapping: Map = getConfigFromState(componentId, state, ['mergedEdgeMapping']) || new Map();
  const showCountGlyphOnMergedEdges: boolean = getConfigFromState(componentId, state, [
    'mergedEdgeConfig',
    'showCountGlyphOnMergedEdges',
  ]);
  const timeBarConfig = getConfigFromState(componentId, state, ['timeBarConfig'])?.toJS();

  // Default to filtering by edge
  const filteringByEdge = Object.keys(timeBarConfig || {}).some((key) =>
    ['edgeTimestampProperty', 'edgeTimestampsProperty', 'edgeIntervalProperty', 'edgeIntervalsProperty'].includes(key),
  );

  const showNonTemporalData = getConfigFromState(componentId, state, ['timeBarConfig', 'showNonTemporalData']);
  const isDimmingMode = getConfigFromState(componentId, state, ['timeBarConfig', 'mode']) === 'dim';
  const showDisconnectedNodes = getConfigFromState(componentId, state, ['timeBarConfig', 'showDisconnectedNodes']);
  let canvasItems: Map = getConfigFromState(componentId, state, ['canvasItems']);
  const isEdge = (id: string): boolean => canvasItems.get(id).has('id1') && canvasItems.get(id).has('id2');
  const hasTemporalData = (id: string): boolean => canvasItems.getIn([id, 'times'])?.size;

  /**
   * Check the timeBarInRangeItems to see if a merged edge's constituent edge is in the time bar range.
   * @param id The id of the merged edge.
   * @returns Whether or not the merged edge should be hidden.
   */
  const shouldFadeOrHideMergedEdge = (id: string): boolean => {
    let shouldFadeOrHide = true;
    timeBarInRangeItems.forEach((edgeId) => {
      if (mergedEdgeMapping.get(edgeId) === id) {
        shouldFadeOrHide = false;
        return;
      }
    });

    return shouldFadeOrHide;
  };

  /**
   * Check the node's edges to determine if any of them are in range and has temporal data.
   * A node should be displayed if at least one of its edges is in the timebar range or if it has a non-tempral
   * edge and show non-temporal data is set to true.
   *
   * @param node The node to check
   * @returns Whether or not to display the node.
   */
  const shouldDisplayNode = (node: Map): boolean => {
    let shouldDisplay = false;
    node.get('neighbors').forEach(function (id) {
      if (
        isEdge(id) &&
        (mergeEdges ? !shouldFadeOrHideMergedEdge(id) : timeBarInRangeItems.includes(id)) &&
        (hasTemporalData(id) || showNonTemporalData)
      ) {
        shouldDisplay = true;
        return;
      }
    });

    return shouldDisplay;
  };

  /**
   * Sets the display of edges and nodes based on dimming mode.
   * @param item The item to set display.
   * @param shouldFadeOrHide Whether the item should be shown or hidden. If dimming mode, hidden actually means
   * faded. If not dimming mode, hidden means omitting from being passed into the Chart component.
   */
  const setEdgeAndNodesDisplay = (item: Map, shouldFadeOrHide: boolean): Map => {
    let connectedNode1 = canvasItems.get(item.get('id1'));
    let connectedNode2 = canvasItems.get(item.get('id2'));
    const displayConnectedNode1 = shouldDisplayNode(connectedNode1);
    const displayConnectedNode2 = shouldDisplayNode(connectedNode2);

    if (isDimmingMode) {
      /**
       * In dimming mode, fade out the edge if shouldFadeOrHide is true. Only fade out the edge's connected nodes
       * if they do not have any other temporal edges in range.
       */
      item = item.set('fade', shouldFadeOrHide);
      connectedNode1 = connectedNode1.set('fade', !displayConnectedNode1 && shouldFadeOrHide);
      connectedNode2 = connectedNode2.set('fade', !displayConnectedNode2 && shouldFadeOrHide);
    } else if (shouldFadeOrHide) {
      /**
       * In filter mode and shouldFadeOrHide is true, set the outOfTimebarRange property to be true. The presentational
       * component will omit these items from being rendered in the graph.
       */
      item = item.set('outOfTimebarRange', true);
      if (!displayConnectedNode1 && !showDisconnectedNodes) {
        connectedNode1 = connectedNode1.set('outOfTimebarRange', true);
      }
      if (!displayConnectedNode2 && !showDisconnectedNodes) {
        connectedNode2 = connectedNode2.set('outOfTimebarRange', true);
      }
    } else {
      /**
       * In filter mode and shouldFadeOrHide is false, set i
       * the outOfTimebarRange property to be false.
       * Revert the item colors to their defaultColor value.
       */
      item = item.set('outOfTimebarRange', false);
      connectedNode1 = connectedNode1.set('outOfTimebarRange', false);
      connectedNode2 = connectedNode2.set('outOfTimebarRange', false);
    }

    canvasItems = canvasItems.set(item.get('id'), item);
    canvasItems = canvasItems.set(connectedNode1.get('id'), connectedNode1);
    canvasItems = canvasItems.set(connectedNode2.get('id'), connectedNode2);
  };

  canvasItems.forEach((item: Map, id: string) => {
    if (filteringByEdge) {
      if (isEdge(id)) {
        if (mergeEdges) {
          const glyphCountByEdgeId = {};
          const timeBarInRangeMergedEdges = [];
          let mergedEdgeInRange = false;

          // Get number of constituent edges in the current timeRange
          timeBarInRangeItems.forEach((edgeId: string) => {
            const mergedEdgeId = mergedEdgeMapping.get(edgeId);
            if (!(mergedEdgeId in glyphCountByEdgeId)) {
              glyphCountByEdgeId[mergedEdgeId] = 0;
              timeBarInRangeMergedEdges.push(mergedEdgeId);
            }
            glyphCountByEdgeId[mergedEdgeId] += 1;

            if (mergedEdgeId === id) {
              mergedEdgeInRange = true;
            }
          });

          /*
           * Update glyph counts on the merged edges if showCountGlyphOnMergedEdges is set to true.
           * If merged edge has >= 1 edges in the time range, glyph shows number of constituent edges in time range.
           * If merged edge has 0 edges in the time range, glyph shows total number of constituent edges in the
           * merged edge.
           */
          if (showCountGlyphOnMergedEdges) {
            const newGlyphs = [];
            (item.get('glyphs') || []).forEach((glyph: Map) => {
              /**
               * Check for immutable object; Newer versions of Immutable have an `isImmutable` function.
               * We need to keep the glyphs in plain old JS because the Chart
               * component doesn't understand Immutable.
               *
               * We have to clone the glyph, because if the label text is
               * updated, the Chart component doesn't recognize the change
               * and thus won't re-render the glyph with the new value.  This is a shallow object with a few properties
               * so the performance hit is negligible.
               */
              glyph = cloneDeep(glyph.toJS?.()) || cloneDeep(glyph);

              if (glyph.isEdgeCount) {
                if (id in glyphCountByEdgeId) {
                  glyph.label.text = glyphCountByEdgeId[id];
                } else {
                  glyph.label.text = item.get('size');
                }
              }

              newGlyphs.push(glyph);
            });

            item = item.set('glyphs', newGlyphs);
            canvasItems = canvasItems.set(id, item);
          }

          setEdgeAndNodesDisplay(item, hasTemporalData(id) ? !mergedEdgeInRange : !showNonTemporalData);
        } else {
          setEdgeAndNodesDisplay(item, hasTemporalData(id) ? !timeBarInRangeItems.includes(id) : !showNonTemporalData);
        }
      }
    } else {
      if (isEdge(id)) {
        /**
         * You can always show the edges if filtering by nodes
         * Unless dimming, then you need to see if both nodes are in time range.
         */
        if (isDimmingMode) {
          item = item.set(
            'fade',
            !(timeBarInRangeItems.includes(item.get('id1')) && timeBarInRangeItems.includes(item.get('id2'))),
          );
        }
        item = item.set('outOfTimebarRange', false);
      } else if (!hasTemporalData(item.get('id'))) {
        if (!showNonTemporalData) {
          item = item.set('outOfTimebarRange', true);
        } else if (!showDisconnectedNodes) {
          item = item.set('outOfTimebarRange', !item.get('neighbors').some((id) => timeBarInRangeItems.includes(id)));
        } else {
          item = item.set('outOfTimebarRange', false);
        }
      } else if (timeBarInRangeItems.includes(item.get('id'))) {
        if (!showDisconnectedNodes) {
          item = item.set('outOfTimebarRange', !item.get('neighbors').some((id) => timeBarInRangeItems.includes(id)));
        } else {
          item = item.set('outOfTimebarRange', false);
        }
      } else {
        item = item.set('outOfTimebarRange', true);
      }

      if (item.get('outOfTimebarRange') && isDimmingMode) {
        item.set('fade', true);
      } else {
        item.set('fade', false);
      }

      canvasItems = canvasItems.set(id, item);
    }
  });

  state = setConfigInState(componentId, state, ['timeBarInRangeItems'], timeBarInRangeItems);
  return setConfigInState(componentId, state, ['canvasItems'], canvasItems);
}

export function layoutSetReducer(state: ImmutableReduxState, action: UiSdlReduxAction): ImmutableReduxState {
  return setConfigInState(action.payload.componentId, state, ['layout'], action.payload.layout);
}

export function setAnimationReducer(
  state: ImmutableReduxState,
  action: UiSdSetAnimationGraphVisualizationAction,
): ImmutableReduxState {
  const { componentId, animation } = action.payload;
  const currentAnimation = getConfigFromState(componentId, state, ['animation'])?.toJS();
  return setConfigInState(componentId, state, ['animation'], {
    ...currentAnimation,
    ...animation,
  });
}

export function openWarningModalEpic(
  actionStream: UiSdlActionsObservable,
  _stateStream: UiSdlStatesObservable,
): Epic<AnyAction, AnyAction, ImmutableReduxState> {
  return actionStream.pipe(
    mergeMap(function (action: UiSdlReduxAction) {
      const { componentId, warningModalId } = action.payload;
      return concat(
        of(setUiSdlGraphVisualizationComponentIdAction(warningModalId, componentId)),
        of(openCloseModalAction(warningModalId, true)),
      );
    }),
  );
}

export function closeWarningModalEpic(
  actionStream: UiSdlActionsObservable,
  _stateStream: UiSdlStatesObservable,
): Epic<AnyAction, AnyAction, ImmutableReduxState> {
  return actionStream.pipe(
    mergeMap(function (action: UiSdlReduxAction) {
      const warningModalId = action.payload.warningModalId;
      return of(openCloseModalAction(warningModalId, false));
    }),
  );
}

export function clickContextMenuItemEpic(
  actionStream: UiSdlActionsObservable,
  _stateStream: UiSdlStatesObservable,
): Epic<AnyAction, AnyAction, ImmutableReduxState> {
  return actionStream.pipe(
    map(function (action: UiSdlReduxAction) {
      const componentId = action.payload.componentId;
      return {
        type: `${componentId}.${action.payload.actionToDispatch.actionSuffix}`,
        payload: merge(action.payload.actionToDispatch.args, {
          itemId: action.payload.itemId,
        }),
      };
    }),
  );
}
