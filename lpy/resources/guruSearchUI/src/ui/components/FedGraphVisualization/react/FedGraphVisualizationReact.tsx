/*
 * Copyright 2009-2024 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

import React, { useContext, useMemo, useState } from 'react';
import FedGraphVisualizationPresentationalComponent, {
  isNode,
} from '@c3/ui/FedGraphVisualizationPresentationalComponentReact';
import {
  UiSdlColorableFieldBasedDataSpecSetting,
  FedGraphVisualization as Props,
  UiSdlGraphVisualizationBaseGlyphConfig,
  UiSdlGraphVisualizationNodeGlyphConfig,
  UiSdlGraphVisualizationDataNode,
  UiSdlGraphVisualizationEdgeDirectionConfig,
  UiSdlGraphVisualizationEdgeGlyphConfig,
  UiSdlGraphVisualizationEdgeStyleConfig,
  UiSdlGraphVisualizationFillColorByPropertyStrategyGradient,
  UiSdlGraphVisualizationFillColorByPropertyStrategyStepped,
  UiSdlGraphVisualizationGeoJsonStyleConfig,
  UiSdlGraphVisualizationMergedEdgeConfig,
  UiSdlGraphVisualizationNodeCoordinatesConfig,
  UiSdlGraphVisualizationNodeDonutConfig,
  UiSdlGraphVisualizationNodeStyleConfig,
  UiSdlGraphVisualizationDataEdge,
  UiSdlGraphVisualizationTimeBarConfig,
  UiSdlGraphVisualizationTooltipConfig,
} from '@c3/types';
import useConfig from '@c3/sdl-react/hooks/useConfig';
import { useTranslate } from '@c3/sdl-react/hooks/useTranslate';
import Color from '@c3/sdl-react/helpers/Color';
import gradstop from 'gradstop';
import isNil from 'lodash/isNil';
import map from 'lodash/map';
import merge from 'lodash/merge';
import mapValues from 'lodash/mapValues';
import { getDescendantPropIfPathDefined } from '@c3/ui/UiSdlHelpers';
import * as Leaflet from 'leaflet/dist/leaflet';
import Supercluster from 'supercluster';
import { GeoJSON } from '@types/geojson';
import { PathOptions } from '@types/leaflet';
import UiSdlStylePropertiesContext from '@c3/ui/UiSdlStylePropertiesContext';
import '@c3/css-library/components/_graphVisualization.scss';
import '@c3/ui/FedGraphVisualization.scss';

// Error messages.
const GRADIENT_COLOR_VALUES_REQUIRED_MESSAGE =
  'When fillColorByPropertyOption is gradient for style.fillColorByProperty, fillColorGradientMinColor and fillColorGradientMaxColor have to be defined!';
const GRADIENT_VALUES_REQUIRED_MESSAGE =
  'When fillColorByPropertyOption is gradient for style.fillColorByProperty, either fillColorSteps or fillColorGradientMin and fillColorGradientMax have to be defined!';
const STEPPED_VALUES_REQUIRED_MESSAGE =
  'When fillColorByPropertyOption is stepped for style.fillColorByProperty, fillColorSteppedValues and fillColorSteppedColors have to be defined!';
const UNKNOWN_DONUT_TYPE_MESSAGE = 'Unknown donut type';
const UNKNOWN_EDGE_DIRECTIONALITY_TYPE_MESSAGE = 'Unknown edge directionality type';
const ILLEGAL_FILL_COLOR_MESSAGE =
  'is not a legal color value. Please use a color from UiSdlGraphVisualizationFillColorOption!';

// Value for node glyph position.
const TOP_RIGHT_GLYPH_POSITION = 'ne';

// Value for closed combine node glyph size.
const CLOSED_COMBINE_NODE_GLYPH_SIZE = 1.1;

// Value for not set cache key.
const CACHE_KEY_NOT_SET = 'NOT_SET';

// Values for donut widths.
const DONUT_WIDTH_OPTION_THIN = 'thin';
const THIN_DONUT_WIDTH = 7;
const THICK_DONUT_WIDTH = 12;
const THIN_DONUT_BORDER_WIDTH = 2;
const THICK_DONUT_BORDER_WIDTH = 4;

// Value for node color opacity
const NODE_COLOR_OPACITY = 1.0;

// Default values for ping configuration.
const DEFAULT_PING_COLOR = '#ff6d66';
const DEFAULT_PING_HALO_RADIUS = 80;
const DEFAULT_PING_HALO_WIDTH = 40;
const DEFAULT_PING_LINK_WIDTH = 40;
const DEFAULT_PING_REPEAT = 1;
const DEFAULT_PING_TIME = 800;

// Default values for selection configuration.
const DEFAULT_SELECTION_COLOR = '#8a90ab';
const DEFAULT_SELECTION_HIGHLIGHT_NEIGHBORS_ON_SELECT = true;
const DEFAULT_SELECTION_LABEL_COLOR = '#fff';
const DEFAULT_SELECTION_MULTI_SELECTION_BEHAVIOR = 'union';

// Default values for standard node
const DEFAULT_NODE_COLOR = '#808080';

// Coloring strategy type names.
const FILL_COLOR_BY_PROPERTY_STRATEGY_CATEGORICAL = 'UiSdlGraphVisualizationFillColorByPropertyStrategyCategorical';
const FILL_COLOR_BY_PROPERTY_STRATEGY_STEPPED = 'UiSdlGraphVisualizationFillColorByPropertyStrategyStepped';
const FILL_COLOR_BY_PROPERTY_STRATEGY_GRADIENT = 'UiSdlGraphVisualizationFillColorByPropertyStrategyGradient';

// Relative path to graph icons
const THEMED_ICON_PATH = 'assets/images/';

// Gets the key/value pairs for all the css variables.
const computedStyle = getComputedStyle(document.body);

// Donut type options.
enum DonutTypeOption {
  SEGMENT = 'segment',
  PERCENTAGE = 'percentage',
}

// Edge directionality options.
enum EdgeDirectionality {
  UNIDIRECTIONAL = 'unidirectional',
  BIDIRECTIONAL = 'bidirectional',
  REVERSE = 'reverse',
}

// Edge line style options.
enum EdgeLineStyleOption {
  DASHED = 'dashed',
  DOTTED = 'dotted',
  SOLID = 'solid',
}

// Glyph type options.
enum GlyphTypeOption {
  ICON = 'icon',
  IMAGE = 'image',
  TEXT = 'text',
}

// Halo type.
type Halo = {
  color: string;
  radius: number;
  width: number;
};

// Node border line style options.
enum NodeLineStyleOption {
  DASHED = 'dashed',
  SOLID = 'solid',
}

// Donut type.
type Donut = {
  border: DonutBorder;
  width: number;
  segments: DonutSegment[];
};

// DonutBorder type.
type DonutBorder = {
  color: string;
  width: number;
  color: string;
};

// DonutSegment type.
type DonutSegment = {
  color: string;
  size: number;
};

// LinkEnd type.
type LinkEnd = {
  arrow?: boolean;
  backOff?: number;
  color?: string;
  glyphs?: Glyph[];
  label?: {
    backgroundColor: string;
    bold: boolean;
    color: string;
    fontFamily: string;
    fontSize: number;
    text: string;
  };
};

// Node type.
type Node = {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  border?: {
    color?: string;
    lineStyle?: 'solid' | 'dashed';
    width?: number;
  };
  coordinates?: {
    lat: number;
    lng: number;
  };
  cutout?: boolean;
  donut?: Donut;
  fontIcon?: {
    color: string;
    fontFamily: string;
    text: string | number;
  };
  halos?: Halo[];
  image?: string;
  label?: {
    backgroundColor?: string;
    bold?: boolean;
    center?: boolean;
    color?: string;
    fontFamily?: string;
    fontSize?: number;
    text?: string;
  };
  shape?: 'box' | 'circle';
  size?: number;
  glyphs?: Array<Glyph>;
  tooltipTitle?: string;
  tooltipSubtitle?: string;
  tooltipBody?: string;
  color?: string;
  neighbors?: Record<string, boolean>;
  clusterDonutProperty?: string;
  donutPropertyArray?: Array<number | string | boolean>;
  latestNode?: boolean;
  callSign?: string;
  trackId?: string;
};

// NodeColorGroup type.
type NodeColorGroup = {
  id: string;
  label: string;
  color: string;
  nodeIds: Array<string>;
};

// TimeRange type.
type TimeRange = {
  time: {
    start: number;
    end: number;
  };
};

// Timestamp type.
type Timestamp = {
  time: number;
};

/**
 * Constructs the graph icon path from the icon name and app theme.
 * @param icon The name of the icon.
 * @param theme The shade of the icon. Can be 'dark' or 'light'
 * @returns The constructed path.
 */
const getThemedIconPath = (icon: string, theme: string) => `${THEMED_ICON_PATH}${icon}-${theme}.svg`;

/**
 * Gets the computed value for a css property. The value is returned with an extra space at the beginning that
 * must be trimmed off.
 * @param propName The name of the css property whose value we want to retrieve.
 * @returns The computed style value, for example, '#121B3A' or 'rgba(127, 127, 127, 0.5)' or '12px'
 */
const getComputedStyleValue = (propName) => computedStyle.getPropertyValue(propName).replace(/^\s/, '');

/**
 * Sets an arrow on an edge at the appropriate endpoint based on its directionality.
 * @param {Link} edge - Edge to set the arrow on.
 * @param directionality {EdgeDirectionality} - The directionality of the edge.
 * @returns {Link} An updated edge with the arrows set based on the edge's directionality.
 */
const setEdgeDirectionality = (edge: Link, directionality: EdgeDirectionality): Link => {
  if (isNil(directionality)) {
    return edge;
  }

  switch (directionality) {
    case EdgeDirectionality.BIDIRECTIONAL:
      edge.end1 = { arrow: true };
      edge.end2 = { arrow: true };
      break;
    case EdgeDirectionality.UNIDIRECTIONAL:
      edge.end2 = { arrow: true };
      break;
    case EdgeDirectionality.REVERSE:
      edge.end1 = { arrow: true };
      break;
    default:
      throw new Error(`${UNKNOWN_EDGE_DIRECTIONALITY_TYPE_MESSAGE}: ${directionality}`);
  }
  return edge;
};

/**
 * Adds a new timestamp to the array containing the temporal data for an edge.
 * @param timestamp {string} - The timestamp to be added.
 * @param times {Timestamp[]} - The array containing the temporal data for an edge.
 */
const pushTimestampToTimes = (timestamp: string, times: Timestamp[]): void => {
  const date = new Date(timestamp);
  times.push({ time: date.getTime() });
};

/**
 * Adds a new time interval to the array containing the temporal data for an edge.
 * @param timeInterval {Record<string, string>} - The timestamp to be added.
 * @param times {TimeRange[]} - The array containing the temporal data for an edge.
 */
const pushTimeIntervalToTimes = (timeInterval: Record<string, string>, times: TimeRange[]): void => {
  const startTime = new Date(timeInterval.start);
  const endTime = new Date(timeInterval.end);
  times.push({ time: { start: startTime.getTime(), end: endTime.getTime() } });
};

/**
 * Adds the temporal data to an edge, if such data exists.
 * @param edge {Record<string, any>} - The edge in which the temporal data is to be added.
 * @param timeBarConfig {UiSdlGraphVisualizationTimeBarConfig} - The configuration for the time bar.
 * @returns {(Timestamp | TimeRange)[]} - The array containing the temporal data for an edge.
 */
const getEdgeTimes = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>,
  timeBarConfig: UiSdlGraphVisualizationTimeBarConfig,
): (Timestamp | TimeRange)[] => {
  const times = [];
  if (timeBarConfig.edgeTimestampProperty) {
    const timestamp: string = getDescendantPropIfPathDefined(data, timeBarConfig.edgeTimestampProperty.fieldName);
    if (timestamp) {
      pushTimestampToTimes(timestamp, times);
    }
  }
  if (timeBarConfig.edgeTimestampsProperty) {
    const timestamps: string[] = getDescendantPropIfPathDefined(data, timeBarConfig.edgeTimestampsProperty.fieldName);
    if (timestamps) {
      timestamps.forEach((timestamp) => {
        pushTimestampToTimes(timestamp, times);
      });
    }
  }
  if (timeBarConfig.edgeTimeIntervalProperty) {
    const timeInterval: Record<string, string> = getDescendantPropIfPathDefined(
      data,
      timeBarConfig.edgeTimeIntervalProperty.fieldName,
    );
    if (timeInterval) {
      pushTimeIntervalToTimes(timeInterval, times);
    }
  }
  if (timeBarConfig.edgeTimeIntervalsProperty) {
    const timeIntervals: Record<string, string>[] = getDescendantPropIfPathDefined(
      data,
      timeBarConfig.edgeTimeIntervalsProperty.fieldName,
    );
    if (timeIntervals) {
      timeIntervals.forEach((timeInterval) => {
        pushTimeIntervalToTimes(timeInterval, times);
      });
    }
  }
  return times;
};

/**
 * Adds the temporal data to a node, if such data exists.
 * @param node {Record<string, any>} - The node in which the temporal data is to be added.
 * @param timeBarConfig {UiSdlGraphVisualizationTimeBarConfig} - The configuration for the time bar.
 * @returns {(Timestamp | TimeRange)[]} - The array containing the temporal data for an edge.
 */
const getNodeTimes = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>,
  timeBarConfig: UiSdlGraphVisualizationTimeBarConfig,
): (Timestamp | TimeRange)[] => {
  const times = [];
  if (timeBarConfig.nodeTimestampProperty) {
    const timestamp: string = getDescendantPropIfPathDefined(data, timeBarConfig.nodeTimestampProperty.fieldName);
    if (timestamp) {
      pushTimestampToTimes(timestamp, times);
    }
  }
  if (timeBarConfig.nodeTimestampsProperty) {
    const timestamps: string[] = getDescendantPropIfPathDefined(data, timeBarConfig.nodeTimestampsProperty.fieldName);
    if (timestamps) {
      timestamps.forEach((timestamp) => {
        pushTimestampToTimes(timestamp, times);
      });
    }
  }
  if (timeBarConfig.nodeTimeIntervalProperty) {
    const timeInterval: Record<string, string> = getDescendantPropIfPathDefined(
      data,
      timeBarConfig.nodeTimeIntervalProperty.fieldName,
    );
    if (timeInterval) {
      pushTimeIntervalToTimes(timeInterval, times);
    }
  }
  if (timeBarConfig.nodeTimeIntervalsProperty) {
    const timeIntervals: Record<string, string>[] = getDescendantPropIfPathDefined(
      data,
      timeBarConfig.nodeTimeIntervalsProperty.fieldName,
    );
    if (timeIntervals) {
      timeIntervals.forEach((timeInterval) => {
        pushTimeIntervalToTimes(timeInterval, times);
      });
    }
  }
  return times;
};

/**
 * Create a new set of edges grouped by the nodes they are connecting.
 * The constituent edges and the number of constituent edges can be accessed at
 * edge.data.components and edge.size respectively.
 * @param edges {UiSdlGraphVisualizationDataEdge[]} - Instances of edges to be grouped by the nodes they are connecting.
 * @param mergedEdgeConfig {UiSdlGraphVisualizationMergedEdgeConfig} - The configuration for how to combine multiple
 *   edges between two nodes.
 * @param setMergedEdgesMapping {React.Dispatch<React.SetStateAction<Record<string, string>>>} - Function to modify the
 *   mergedEdgeMapping state variable.
 * @param timeBarConfig {UiSdlGraphVisualizationTimeBarConfig} - The configuration for the time bar.
 * @param directionMap {Record<string, EdgeDirectionality>} - A mapping from categorical values on an edge property
 *   to the directionality of the edge.
 * @param edgeDirectionalityConfig {UiSdlGraphVisualizationEdgeDirectionConfig} - The edge directionality config
 *   specified at the directionConfig field in the edge styling spec.
 * @param translate {ReturnType<typeof useTranslate>} - The useTranslate hook.
 * @returns {Link[]} A list of edges grouped by the nodes they are connecting.
 */
const getMergedEdges = (
  edges: UiSdlGraphVisualizationDataEdge[],
  mergedEdgeConfig: UiSdlGraphVisualizationMergedEdgeConfig,
  setMergedEdgesMapping: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  timeBarConfig: UiSdlGraphVisualizationTimeBarConfig,
  directionMap: Record<string, EdgeDirectionality>,
  edgeDirectionalityConfig: UiSdlGraphVisualizationEdgeDirectionConfig,
  translate: ReturnType<typeof useTranslate>,
): Link[] => {
  const mergedEdges: Record<string, Link> = {};
  const mergedEdgeMapping: Record<string, string> = {};

  edges.forEach((edge) => {
    const directionPropertyValue = getDescendantPropIfPathDefined(edge, edgeDirectionalityConfig?.fieldName);
    const direction: EdgeDirectionality = directionMap[directionPropertyValue];
    const connectedNode1Id = edge.from?.id;
    const connectedNode2Id = edge.to?.id;

    /**
     * The merged edge id is generated based on the directionality of the edge.
     * - Each merged edge follows the norm of concatenating the id of the 'to' node to the id of the 'from' node.
     * - This ordered is reversed for reversed edges.
     * - Bidirectional edges are prefixed with 'bi-'.
     * - Undirected edges are prefixed with 'un-'.
     */
    let mergedEdgeId = '';
    switch (direction) {
      case EdgeDirectionality.UNIDIRECTIONAL:
        mergedEdgeId = `${connectedNode1Id}-_mergedlink_-${connectedNode2Id}`;
        break;
      case EdgeDirectionality.REVERSE:
        mergedEdgeId = `${connectedNode2Id}-_mergedlink_-${connectedNode1Id}`;
        break;
      case EdgeDirectionality.BIDIRECTIONAL:
        mergedEdgeId =
          connectedNode2Id > connectedNode1Id
            ? `bi-${connectedNode1Id}-_mergedlink_-${connectedNode2Id}`
            : `bi-${connectedNode2Id}-_mergedlink_-${connectedNode1Id}`;
        break;
      default:
        mergedEdgeId =
          connectedNode2Id > connectedNode1Id
            ? `un-${connectedNode1Id}-_mergedlink_-${connectedNode2Id}`
            : `un-${connectedNode2Id}-_mergedlink_-${connectedNode1Id}`;
        break;
    }

    // Retrieve the temporal data that belongs to the edge.
    const edgeTimes = timeBarConfig ? getEdgeTimes(edge, timeBarConfig) : [];
    const constituentEdge: Link = {
      id: edge.id,
      id1: connectedNode1Id,
      id2: connectedNode2Id,
      times: edgeTimes,
      data: edge.data,
      neighbors: {
        [connectedNode1Id]: true,
        [connectedNode2Id]: true,
      },
    };

    if (mergedEdgeId in mergedEdges) {
      mergedEdges[mergedEdgeId].times = [...mergedEdges[mergedEdgeId].times, ...edgeTimes];
      mergedEdges[mergedEdgeId].constituentEdges.push(constituentEdge);
      mergedEdges[mergedEdgeId].size += 1;
    } else {
      const mergedEdge: Link = {
        id: mergedEdgeId,
        id1: connectedNode1Id,
        id2: connectedNode2Id,
        size: 1,
        times: edgeTimes,
        constituentEdges: [constituentEdge],
        data: edge.data,
      };

      mergedEdges[mergedEdgeId] = setEdgeDirectionality(mergedEdge, direction);
      if (mergedEdgeConfig?.flow) {
        mergedEdges[mergedEdgeId].flow = mergedEdgeConfig?.flowVelocity
          ? { velocity: mergedEdgeConfig?.flowVelocity }
          : true;
      }
    }

    mergedEdgeMapping[edge.id] = mergedEdgeId;
  });

  const flattenedEdges = Object.values(mergedEdges)
    .map((mergedEdge) => {
      // If the merged edge size is 1, return the constituent edge. This unmerged edge wil be styled as a single edge.
      if (mergedEdge.size === 1) {
        const unmergedEdge = mergedEdge.constituentEdges[0];
        unmergedEdge.size = 1;

        // Update the merged edge mapping to point to itself.
        mergedEdgeMapping[unmergedEdge.id] = unmergedEdge.id;
        return unmergedEdge;
      }

      // If showCountGlyphOnMergedEdges is true, add a count glyph to merged edges where size is greater than 1.
      if (mergedEdgeConfig?.showCountGlyphOnMergedEdges) {
        mergedEdge.glyphs = [
          {
            isEdgeCount: true,
            color: getComputedStyleValue('--c3-style-graphVisualizationMergedEdgeGlyphBackgroundColor'),
            label: {
              color: getComputedStyleValue('--c3-style-graphVisualizationGlyphFontColor'),
              text: String(mergedEdge.size),
            },
            size: mergedEdgeConfig?.countGlyphSize,
          },
        ];
      }

      // Add the tooltip body to be rendered when a tooltip is hovered on an edge.
      mergedEdge.tooltipBody = translate({
        spec: {
          dynamicValue: 'SDL.FedGraphVisualization.mergedEdgeTooltip.tooltipBody',
          vars: {
            size: mergedEdge.size,
          },
        },
      });

      return mergedEdge;
    })
    .flat();

  // Store the merged edge mapping in the component state.
  setMergedEdgesMapping(mergedEdgeMapping);

  return flattenedEdges;
};

/**
 * Group by category, or whatever field is responsible for grouping, so that each group may be assigned a color
 *   in the UI. Ideally this function can be reused by other applications when dynamically grouping at runtime.
 * @param items {UiSdlGraphVisualizationDataNode[] | UiSdlGraphVisualizationDataEdge[]} - The data items
 *  (nodes or edges).
 * @param fieldName {string} - The fieldName in the data that represents a grouping or category.
 * @param colorMap {Record<string, string>} - The color map with the pre-defined user grouping.
 * @param defaultColors {string[]} - The array of colors that is available to color the item.
 * @returns { Object {colorsGroupings: Record<string, string>, idsGroupings: Record<string, Array<string>>}}
 *    Returns an object where the colorsGroupings Record is a map for the category to the color of that category
 *    The idsGroupings Record is a map for the category or grouping names to
 * the ids of the nodes which include that category
 */
const groupByCategory = (
  items: UiSdlGraphVisualizationDataNode[] | UiSdlGraphVisualizationDataEdge[],
  fieldName: string,
  colorMap: Record<string, string>,
  defaultColors: string[],
): {
  colorsGroupings: Record<string, string>;
  idsGroupings: Record<string, Array<string>>;
} => {
  let colorsGroupings: Record<string, string> = colorMap;
  let idsGroupings: Record<string, Array<string>> = {};
  let i = 0;

  (items || []).forEach((item: UiSdlGraphVisualizationDataNode | UiSdlGraphVisualizationDataEdge) => {
    const key: string = getDescendantPropIfPathDefined(item, fieldName);

    if (!isNil(key) && !(key in colorsGroupings)) {
      colorsGroupings[key] = defaultColors[i % defaultColors.length];
      i++;
    }
    if (!isNil(key) && key in colorsGroupings) {
      if (idsGroupings[key]) idsGroupings[key].push(item.id);
      else idsGroupings[key] = [item.id];
    }
  });

  return { colorsGroupings, idsGroupings };
};

/**
 * Gets a glyph based on the item data and a glyph configuration.
 * @param data {UiSdlGraphVisualizationDataEdge | UiSdlGraphVisualizationDataNode} - The edge/node data to extract the
 *   glyph information from.
 * @param config {UiSdlGraphVisualizationBaseGlyphConfig} - Configuration for the node or edge glyphs.
 * @param isNode {boolean} - Whether item is a node.
 * @returns {Glyph[]} An array containing a single glyph constructed from the config.
 */
const getGlyphFromConfig = (
  data: UiSdlGraphVisualizationDataEdge | UiSdlGraphVisualizationDataNode,
  config: UiSdlGraphVisualizationBaseGlyphConfig,
  isNode: boolean,
): Glyph[] => {
  if (!config) {
    return [];
  }

  const glyphValue = getDescendantPropIfPathDefined(data, config.fieldName);

  if (isNil(glyphValue)) {
    return [];
  }

  const glyph: Glyph = {
    border: {
      color: config.outlineColor,
    },
    color: config.color,
    size: config.size || 1,
  };

  if (isNode) {
    glyph.position = config.position;
  }

  switch (config.glyphType) {
    case GlyphTypeOption.ICON:
      glyph.fontIcon = {
        text: `c3-icon c3-icon-${glyphValue}`,
        fontFamily: 'Font Awesome 6 Pro',
        color: getComputedStyleValue('--c3-style-graphVisualizationGlyphFontColor'),
      };
      break;
    case GlyphTypeOption.IMAGE:
      glyph.image = glyphValue;
      break;
    case GlyphTypeOption.TEXT:
      glyph.label = {
        color: getComputedStyleValue('--c3-style-graphVisualizationGlyphFontColor'),
        text: glyphValue,
      };
      break;
    default:
      throw new Error(`Unknown glyph type: ${config.glyphType}`);
  }

  return [glyph];
};

/**
 * Sets glyphs on the graph items based on the glyph configurations.
 * @param item {Node | Link} - Node or edge to set the glyph on.
 * @param data {UiSdlGraphVisualizationDataEdge | UiSdlGraphVisualizationDataNode} - The edge/node data to extract the
 *   glyph information from.
 * @param glyphConfig {UiSdlGraphVisualizationEdgeGlyphConfig | UiSdlGraphVisualizationNodeGlyphConfig} - Configuration
 *   for the node or edge glyphs.
 * @returns {Node | Link} An updated Node or Link styled with glyphs.
 */
const setItemGlyphs = (
  item: Node | Link,
  data: UiSdlGraphVisualizationDataEdge | UiSdlGraphVisualizationDataNode,
  glyphConfig: UiSdlGraphVisualizationEdgeGlyphConfig | UiSdlGraphVisualizationNodeGlyphConfig,
): Node | Link => {
  if (isNode(item)) {
    item.glyphs = [
      ...getGlyphFromConfig(data, glyphConfig.topLeft, true),
      ...getGlyphFromConfig(data, glyphConfig.topRight, true),
      ...getGlyphFromConfig(data, glyphConfig.bottomLeft, true),
      ...getGlyphFromConfig(data, glyphConfig.bottomRight, true),
    ];
  } else {
    (item as Link).end1 = merge((item as Link).end1, {
      glyphs: getGlyphFromConfig(data, glyphConfig.start, false),
    });
    (item as Link).end2 = merge((item as Link).end2, {
      glyphs: getGlyphFromConfig(data, glyphConfig.end, false),
    });
    item.glyphs = getGlyphFromConfig(data, glyphConfig.center, false);
  }
  return item;
};

/**
 * Sets the donut segments on the node, based on the donutSpec configuration.
 * @param node {Node} - The node on which to set donuts.
 * @param data {UiSdlGraphVisualizationDataNode} - The node data to extract the donut information from.
 * @param donutSpec {UiSdlGraphVisualizationNodeDonutConfig} - The donut spec configuration.
 * @param graphBackgroundColor {string} - the background color of the graph,
 * set as donut border color to add transparency
 * @returns {Node} The node styled with donuts.
 */
const setNodeDonutSegments = (
  node: Node,
  data: UiSdlGraphVisualizationDataNode,
  donutSpec: UiSdlGraphVisualizationNodeDonutConfig,
  graphBackgroundColor: string,
  theme: string,
): Node => {
  let percentage: number;
  let percentageColor: string;

  const donutWidth = donutSpec.width;
  const thinDonut = donutWidth === DONUT_WIDTH_OPTION_THIN;
  const donut: Donut = {
    border: {
      color: graphBackgroundColor,
      width: thinDonut ? THIN_DONUT_BORDER_WIDTH : THICK_DONUT_BORDER_WIDTH,
    },
    width: thinDonut ? THIN_DONUT_WIDTH : THICK_DONUT_WIDTH,
    segments: [],
  };

  switch (donutSpec.donutType) {
    case DonutTypeOption.PERCENTAGE:
      if (donutSpec.percentageSegment) {
        percentage = getDescendantPropIfPathDefined(data, donutSpec.percentageSegment.fieldName);
        percentageColor = donutSpec.percentageSegment.color;
      } else if (donutSpec.percentageStepSegment) {
        percentage = getDescendantPropIfPathDefined(data, donutSpec.percentageStepSegment?.fieldName);
        percentageColor = getComputedStyleValue('--c3-style-graphVisualizationNodeDefaultDonutColor"');
        const colorList = donutSpec.percentageStepSegment.stepColors;
        const colorSteps = donutSpec.percentageStepSegment.colorStepValues;
        for (let i = 0; colorSteps && colorList && i < colorSteps.length && i < colorList.length; i++) {
          if (i === colorSteps?.length - 1 || percentage <= colorSteps[i + 1]) {
            percentageColor = colorList[i];
            break;
          }
        }
      } else {
        percentage = 0;
        percentageColor = getComputedStyleValue('--c3-style-graphVisualizationNodeDefaultDonutColor"');
      }

      donut.segments = [
        { color: percentageColor, size: percentage },
        {
          color: getComputedStyleValue('--c3-style-graphVisualizationPercentageDonutSegmentColor'),
          size: 100 - percentage,
        },
      ];
      break;
    case DonutTypeOption.SEGMENT:
      donut.segments = donutSpec.segments?.slice(0, 4).map((segmentSpec: UiSdlColorableFieldBasedDataSpecSetting) => {
        const segmentSize = getDescendantPropIfPathDefined(data, segmentSpec.fieldName);
        const segmentColor = segmentSpec.color;
        return {
          color: segmentColor,
          size: segmentSize,
        };
      });
      break;
    default:
      throw new Error(`${UNKNOWN_DONUT_TYPE_MESSAGE}: ${donutSpec.donutType}`);
  }

  // Only add donut to node if donut has segments with defined size property.
  if (donut.segments?.some((segment) => segment.size)) {
    node.donut = donut;
  }

  return node;
};

/**
 * Sets coordinates on nodes based on the coordinate spec.
 * @param node {Node} - The node to set coordinates on.
 * @param data {UiSdlGraphVisualizationDataNode} - The node data to extract the coordinates information from.
 * @param coordinateSpec {UiSdlGraphVisualizationNodeCoordinatesConfig} - Configuration for getting the latitude and
 *   longitude coordinates from the node data.
 * @returns {Node} An updated node with the coordinates field set.
 */
const setNodeCoordinates = (
  node: Node,
  data: UiSdlGraphVisualizationDataNode,
  coordinateSpec: UiSdlGraphVisualizationNodeCoordinatesConfig,
): Node => {
  const lat = getDescendantPropIfPathDefined(data, coordinateSpec.latitude?.fieldName);
  const lng = getDescendantPropIfPathDefined(data, coordinateSpec.longitude?.fieldName);
  if (lat && lng) {
    node.coordinates = {
      lat: lat,
      lng: lng,
    };
  }
  return node;
};

/**
 * Sets the item's tooltip fields based on the tooltip spec.
 * @param item {Node | Link} - The node or edge to set the fields on.
 * @param data {UiSdlGraphVisualizationDataEdge | UiSdlGraphVisualizationDataNode} - The node or edge data to extract
 *   the tooltip information from.
 * @param tooltipConfig {UiSdlGraphVisualizationTooltipConfig} - Configuration for the graph visualization tooltip.
 * @returns {Link | Node} An updated item with the tooltip field set.
 */
const setTooltipFields = (
  item: Node | Link,
  data: UiSdlGraphVisualizationDataEdge | UiSdlGraphVisualizationDataNode,
  tooltipConfig: UiSdlGraphVisualizationTooltipConfig,
): Link | Node => {
  item.tooltipTitle = getDescendantPropIfPathDefined(data, tooltipConfig.tooltipTitle?.fieldName);
  item.tooltipSubtitle = getDescendantPropIfPathDefined(data, tooltipConfig.tooltipSubtitle?.fieldName);
  item.tooltipBody = getDescendantPropIfPathDefined(data, tooltipConfig.tooltipBody?.fieldName);
  return item;
};

/**
 * Gets the gradient scale based on the values provided in the fill color by property configuration.
 * @param fillColorByProperty {UiSdlGraphVisualizationFillColorByPropertyStrategyGradient} - Fill color by property
 *   configuration.
 * @returns {Array<string>} Gradient scale to be used to fill color by property.
 */
const getFillColorGradientScale = (
  fillColorByProperty: UiSdlGraphVisualizationFillColorByPropertyStrategyGradient,
): Array<string> => {
  // Throw an error if fill color gradient min or max color is missing.
  if (!fillColorByProperty?.fillColorGradientMinColor || !fillColorByProperty?.fillColorGradientMaxColor) {
    throw new Error(GRADIENT_COLOR_VALUES_REQUIRED_MESSAGE);
  }

  // Throw an error if neither of fill color steps or fill color min and max are provided.
  if (
    !fillColorByProperty?.fillColorSteps &&
    isNil(fillColorByProperty?.fillColorGradientMax) &&
    isNil(fillColorByProperty?.fillColorGradientMin)
  ) {
    throw new Error(GRADIENT_VALUES_REQUIRED_MESSAGE);
  }

  // Number of stops in the gradient scale.
  const stops =
    fillColorByProperty?.fillColorSteps ??
    fillColorByProperty?.fillColorGradientMax - fillColorByProperty?.fillColorGradientMin + 1;

  return gradstop({
    stops: stops,
    inputFormat: 'hex',
    colorArray: [fillColorByProperty.fillColorGradientMinColor, fillColorByProperty.fillColorGradientMaxColor],
  });
};

/**
 * Gets the fill color of an item based on where the field value falls among a set of "steps".
 * @param fillColorByProperty {UiSdlGraphVisualizationFillColorByPropertyStrategyStepped} - Fill color by property
 *   configuration.
 * @param fieldValue {number} - The field value used to determine stepped color value.
 * @returns {string} Fill color of an item based on where the field value falls among a set of "steps".
 */
const getSteppedFillColor = (
  fillColorByProperty: UiSdlGraphVisualizationFillColorByPropertyStrategyStepped,
  fieldValue: number,
): string => {
  const steps = fillColorByProperty?.fillColorSteppedValues;
  const stepColors = fillColorByProperty?.fillColorSteppedColors;

  // Throw an error if fill color stepped values are missing.
  if (!steps || !stepColors) {
    throw new Error(STEPPED_VALUES_REQUIRED_MESSAGE);
  }

  let stepColor;
  for (let i = 0; i < steps.length; i++) {
    if (fieldValue <= steps[i]) {
      stepColor = stepColors[i];
      break;
    }
  }

  return stepColor;
};

/**
 * Helper function to add opacity to a color
 * @param color the color string as hex value
 * @param opacity opacity number, range from 0 - 1
 * @returns {string} rgb value as string
 */
const getColorWithOpacity = (color: string, opacity: number): string => {
  if (color) {
    return new Color(color).withAlpha(opacity).toString();
  } else {
    return '';
  }
};

/**
 * Set the item's styling based on the styling spec.
 * @param item {Node | Link} - The item (either node or link) to be styled.
 * @param data {UiSdlGraphVisualizationDataEdge | UiSdlGraphVisualizationDataNode} - The node or edge data to extract
 *   the style information from.
 * @param stylingSpec {UiSdlGraphVisualizationEdgeStyleConfig | UiSdlGraphVisualizationNodeStyleConfig} - Specification
 *   for how an item should be styled.
 * @param colorOption {string} - How an item should be colored.
 * @param groupings {Record<string, string>} - The identified groupings of items, used when coloring by category.
 * @param isNode {boolean} - Whether the item is a node or not.
 * @param directionMap {Record<string, EdgeDirectionality>} - A map that is used to set the direction of edges.
 * @param useContext Function - A function that will retrieve the react context hook for the style and theme.
 * @returns {Node | Link} The styled item.
 */
const setItemStyle = (
  item: Node | Link,
  data: UiSdlGraphVisualizationDataEdge | UiSdlGraphVisualizationDataNode,
  stylingSpec: UiSdlGraphVisualizationEdgeStyleConfig | UiSdlGraphVisualizationNodeStyleConfig,
  colorOption: string,
  groupings: Record<string, string>,
  isNode: boolean,
  directionMap: Record<string, EdgeDirectionality>,
  theme: string,
): Node | Link => {
  const fillColorByProperty = stylingSpec.fillColorByProperty;
  const colorPropertyField = stylingSpec.fillColorByProperty?.fieldName;

  // Setting item color.
  switch (colorOption) {
    case FILL_COLOR_BY_PROPERTY_STRATEGY_CATEGORICAL:
      item.color = getColorWithOpacity(groupings[data[colorPropertyField]], NODE_COLOR_OPACITY);
      break;
    case FILL_COLOR_BY_PROPERTY_STRATEGY_STEPPED:
      item.color = getColorWithOpacity(
        getSteppedFillColor(fillColorByProperty, data[colorPropertyField]),
        NODE_COLOR_OPACITY,
      );
      break;
    case FILL_COLOR_BY_PROPERTY_STRATEGY_GRADIENT: {
      const progress = data[fillColorByProperty?.fieldName];
      const gradient = getFillColorGradientScale(fillColorByProperty);
      item.color = getColorWithOpacity(gradient[progress - 1], NODE_COLOR_OPACITY);
      break;
    }
    default:
      item.color = stylingSpec.fillColor;
      break;
  }

  if (!isNode && stylingSpec.fillColorOnHover) {
    (item as Link).hoverColor = stylingSpec.fillColorOnHover;
    (item as Link).defaultColor = item.color;
  }

  // Outline node item as configured.
  if (isNode) {
    if (stylingSpec?.outlineColor) {
      (item as Node).border = {
        color: stylingSpec.outlineColor,
        lineStyle: stylingSpec.outlineStyle || NodeLineStyleOption.SOLID,
      };

      if (stylingSpec?.outlineDashedProperty) {
        (item as Node).border.lineStyle = getDescendantPropIfPathDefined(
          data,
          stylingSpec.outlineDashedProperty.fieldName,
        )
          ? NodeLineStyleOption.DASHED
          : NodeLineStyleOption.SOLID;
      }
    }
  } else if (data[stylingSpec.isDotted?.fieldName]) {
    // Set edge line style to dotted.
    (item as Link).lineStyle = EdgeLineStyleOption.DOTTED;
  }

  // Set item label as configured.
  if (isNode) {
    const fontColor = theme === 'Dark' ? '#F7F8FA' : '#111112';

    (item as Node).label = {
      backgroundColor: 'rgba(255, 255, 255, 0)',
      color: fontColor,
      center: stylingSpec.labelStyle?.textCenter,
      text: getDescendantPropIfPathDefined(data, stylingSpec.labelStyle?.textLabelField?.fieldName),
    };

    let iconValue: string;

    if (stylingSpec.labelStyle?.iconByProperty) {
      iconValue = getDescendantPropIfPathDefined(data, stylingSpec.labelStyle?.iconByProperty.fieldName);
    } else if (stylingSpec.labelStyle?.icon) {
      iconValue = stylingSpec.labelStyle?.icon;
    }

    if (iconValue) {
      (item as Node).fontIcon = {
        text: `c3-icon c3-icon-${iconValue}`,
        fontFamily: 'Font Awesome 6 Pro',
        color: fontColor,
      };
    }

    const imagePath = stylingSpec.labelStyle?.themedIcon
      ? getThemedIconPath(stylingSpec.labelStyle?.themedIcon, theme)
      : stylingSpec.labelStyle?.imageUrl;

    (item as Node).image =
      getDescendantPropIfPathDefined(data, stylingSpec.labelStyle?.imageUrlByProperty?.fieldName) || imagePath;
  } else if (stylingSpec.labelText?.fieldName) {
    item.label = {
      backgroundColor: 'rgba(255, 255, 255, 0)',
      color: getComputedStyleValue('--c3-style-fontColor'),
      text: data[stylingSpec.labelText?.fieldName],
    };
  }

  if (isNode) {
    (item as Node).shape = stylingSpec.shape || 'circle';
  }

  // Style edge item end nodes.
  if (!isNode && stylingSpec?.directionConfig) {
    const directionPropertyValue = getDescendantPropIfPathDefined(data, stylingSpec.directionConfig.fieldName);
    const direction = directionMap[directionPropertyValue];
    item = setEdgeDirectionality(item as Link, direction);
  }

  // Style edge flow.
  if (!isNode && stylingSpec?.flowConfig?.flow) {
    (item as Link).flow = true;
    if (stylingSpec.flowConfig?.flowVelocity) {
      (item as Link).flow = { velocity: stylingSpec.flowConfig?.flowVelocity };
    }
    const velocityProp = stylingSpec.flowConfig?.flowVelocityByProperty?.fieldName;
    if (velocityProp) {
      const velocity = getDescendantPropIfPathDefined(data, velocityProp);
      (item as Link).flow = {
        velocity: !velocity || isNaN(velocity) ? 0 : velocity,
      };
    }
  }

  // Set item size.
  if (stylingSpec.sizeByProperty || stylingSpec.size) {
    const size = getDescendantPropIfPathDefined(data, stylingSpec.sizeByProperty?.fieldName) ?? stylingSpec.size;

    if (isNode) {
      item.size = size;
    } else {
      (item as Link).width = size;
    }
  }

  if (!isNode && stylingSpec.widthOnHover) {
    (item as Link).defaultWidth = (item as Link).width;
    (item as Link).hoverWidth = stylingSpec.widthOnHover;
  }
  return item;
};

/**
 * Helper function to create a loaded style callback function to be passed into the Leaflet.geoJson constructor.
 * @param {Props} props - Props passed into FedGraphVisualization.
 * @returns {GeoJSON} - A Leaflet LayerGroup with the styling function set.
 */
const getStyledGeoJsonData = (props: Props): GeoJSON => {
  const geoJsonPathStylingSpec: UiSdlGraphVisualizationGeoJsonStyleConfig = props.geoJsonDataSpec?.style;

  if (!geoJsonPathStylingSpec) {
    return Leaflet.geoJson(props.geoJsonData);
  }

  const fillColorByProperty = geoJsonPathStylingSpec.fillColorByProperty;

  let stops: number;
  let colorGradient: string[];
  let denominator: number;

  // Get gradient values if fillColorAsGradient is set to true.
  if (fillColorByProperty?.type === FILL_COLOR_BY_PROPERTY_STRATEGY_GRADIENT) {
    stops =
      fillColorByProperty.fillColorSteps ??
      fillColorByProperty.fillColorGradientMax - fillColorByProperty.fillColorGradientMin + 1;
    colorGradient = getFillColorGradientScale(fillColorByProperty);
    denominator = Math.round(
      (fillColorByProperty.fillColorGradientMax - fillColorByProperty.fillColorGradientMin + 1) / stops,
    );
  }

  /**
   * Function defining Leaflet.Path options for styling GeoJSON lines. Called internally when data is added.
   * @param {GeoJSON.Feature} feature - GeoJSON feature configuration.
   * @returns {PathOptions} An object with path options.
   */
  const style = (feature: GeoJSON.Feature): PathOptions => {
    const fillColorValue = getDescendantPropIfPathDefined(feature.properties, fillColorByProperty?.fieldName);

    let fillColor: string;

    switch (fillColorByProperty?.type) {
      case FILL_COLOR_BY_PROPERTY_STRATEGY_CATEGORICAL: {
        fillColor = fillColorValue;
        break;
      }
      case FILL_COLOR_BY_PROPERTY_STRATEGY_GRADIENT: {
        // Intermediary variables to determine path color based on gradient.
        const progress = Math.floor((fillColorValue - fillColorByProperty.fillColorGradientMin) / denominator) + 1;
        fillColor = colorGradient[progress - 1];
        break;
      }
      case FILL_COLOR_BY_PROPERTY_STRATEGY_STEPPED: {
        fillColor = getSteppedFillColor(fillColorByProperty, fillColorValue);
        break;
      }
      default:
        break;
    }

    return {
      color: geoJsonPathStylingSpec.outlineColor,
      opacity: geoJsonPathStylingSpec.outlineOpacity,
      weight: geoJsonPathStylingSpec.outlineWeight,
      fillColor: fillColor,
      fillOpacity: geoJsonPathStylingSpec.fillOpacity,
    };
  };

  return Leaflet.geoJson(props.geoJsonData, { style: style });
};

/**
 * Helper function to apply edge styling for a single (i.e. non-merged) edge.
 * @param edge {UiSdlGraphVisualizationDataEdge} - The edge data to get styling information from.
 * @param edgeStylingSpec {UiSdlGraphVisualizationEdgeStyleConfig} - The configuration for styling edges.
 * @param edgeGlyphSpec {UiSdlGraphVisualizationEdgeGlyphConfig} - The configuration for adding glyphs to an edge.
 * @param edgeTimeBarSpec {UiSdlGraphVisualizationTimeBarConfig} - The configuration for the time bar.
 * @param edgeTooltipSpec {UiSdlGraphVisualizationTooltipConfig} - The configuration for the tooltip.
 * @param directionMap {Record<string, EdgeDirectionality>} - A map that is used to set the direction of edges.
 * @param edgeColorOption {string} - The edge color option.
 * @param groupings {Record<string, string>} - The groupings for coloring edges.
 * @param useContext Function - A function that will retrieve the react context hook for the style and theme.
 * @returns {Link} A single styled edge.
 */
const setUnmergedEdgeStyle = (
  edge: UiSdlGraphVisualizationDataEdge,
  edgeStylingSpec: UiSdlGraphVisualizationEdgeStyleConfig,
  edgeGlyphSpec: UiSdlGraphVisualizationEdgeGlyphConfig,
  edgeTimeBarSpec: UiSdlGraphVisualizationTimeBarConfig,
  edgeTooltipSpec: UiSdlGraphVisualizationTooltipConfig,
  directionMap: Record<string, EdgeDirectionality>,
  edgeColorOption: string,
  groupings: Record<string, string>,
  useContext: Function,
): Link => {
  let styledEdge: Link = {
    id: edge.id,
    id1: edge.from?.id,
    id2: edge.to?.id,
    data: edge.data,
    trackId: edge.trackId,
  };

  if (edgeStylingSpec) {
    styledEdge = setItemStyle(
      styledEdge,
      edge,
      edgeStylingSpec,
      edgeColorOption,
      groupings,
      false,
      directionMap,
    ) as Link;
  }
  if (edgeGlyphSpec) {
    styledEdge = setItemGlyphs(styledEdge, edge, edgeGlyphSpec) as Link;
  }
  if (edgeTimeBarSpec) {
    styledEdge.times = getEdgeTimes(edge, edgeTimeBarSpec);
  }
  if (edgeTooltipSpec) {
    styledEdge = setTooltipFields(styledEdge, edge, edgeTooltipSpec) as Link;
  }

  return styledEdge;
};

/**
 * Maps an item to its 1st degree neighbors. The neighbor information is added to the `neighbor` object of the item.
 * Used as an optimization when determining node display in relation to time bar events range updates. We need to
 * know if a node has any temporal edges within the selected time range, and by knowing a node's edges, this lookup
 * is faster than iterating all the edges looking for the existence of a node.
 * Also used as an optimization for finding 1st degree neighbors when highlighting neighbors on item interaction.
 * @param styledData {Record<string, Node | Link>} - The object that contains styled nodes and edges.
 * @param edge {Link} - The edge whose nodes we are mapping.
 */
const updateNeighborMapping = (styledData: Record<string, Node | Link>, edge: Link): void => {
  const node1 = styledData[edge.id1];
  const node2 = styledData[edge.id2];

  edge.neighbors = {
    [edge.id1]: true,
    [edge.id2]: true,
  };

  if (node1 && node2) {
    node1.neighbors[edge.id] = true;
    node1.neighbors[node2.id] = true;
    node2.neighbors[edge.id] = true;
    node2.neighbors[node1.id] = true;
  }
};

/**
 * Helper function to extract a category to color mapping from a color to array of categories mapping.
 * @param colorMap {Record<string, Array<string>>} - Color to array to categories mapping.
 * @returns {Record<string, string>} - Category to color mapping.
 */
const extractColorMap = (colorMap: Record<string, Array<string>>): Record<string, string> => {
  const invertedColorMap: Record<string, string> = {};

  if (!colorMap) {
    return invertedColorMap;
  }

  for (const key in colorMap) {
    const values = colorMap[key];
    values.forEach((value) => {
      invertedColorMap[value] = key;
    });
  }

  return invertedColorMap;
};

/**
 * Helper function to set node and edge styles based on spec availability.
 * @param props {Props} - Props passed into FedGraphVisualization.
 * @param setLegendNodeColorGroupings {React.Dispatch<React.SetStateAction<NodeColorGroup[]>>} - Function to modify the
 *   legendNodeColorGroupings state variable.
 * @param setMergedEdgesMapping {React.Dispatch<React.SetStateAction<Record<string, string>>>} - Function to modify the
 *   mergedEdgeMapping state variable.
 * @param translate {ReturnType<typeof useTranslate>} - The useTranslate hook.
 * @param useContext Function - A function that will retrieve the react context hook for the style and theme.
 * @returns {Record<string, Node | Link>} Styled nodes and edges.
 */
const getStyledData = (
  props: Props,
  setLegendNodeColorGroupings: React.Dispatch<React.SetStateAction<NodeColorGroup[]>>,
  setMergedEdgesMapping: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  translate: ReturnType<typeof useTranslate>,
  theme: string,
): Record<string, Node | Link> => {
  const styledData = {};

  const edgeGlyphSpec = props.dataSpec.edgeConfig?.glyphConfig;
  const edgeTimeBarSpec = props.timeBarConfig;
  const nodeTimeBarSpec = props.timeBarConfig;
  const edgeTooltipSpec = props.dataSpec.edgeConfig?.tooltipConfig;
  const edgeStylingSpec = props.dataSpec.edgeConfig?.style;
  const nodeClusterDonutSpec = props.dataSpec.nodeConfig?.clusterConfig?.clusterDonutConfig;
  const nodeCombineSpec = props.combineConfig;
  const nodeCoordinateSpec = props.dataSpec.nodeConfig?.coordinatesConfig;
  const nodeDonutSpec = props.dataSpec.nodeConfig?.donutConfig;
  const nodeGlyphSpec = props.dataSpec.nodeConfig?.glyphConfig;
  const nodeStylingSpec = props.dataSpec.nodeConfig?.style;
  const nodeTooltipSpec = props.dataSpec.nodeConfig?.tooltipConfig;
  const graphBackgroundColor = props.backgroundColor || getComputedStyleValue('--c3-style-componentBackgroundColor');

  let colorsGroupings: Record<string, string> = {};
  let idsGroupings: Record<string, Array<string>> = {};

  /*
   * Obtain groupings by category if node fill color by property option is set to categorical
   * and store them in state to use for display in the legend.
   */
  const nodeColorOption = nodeStylingSpec?.fillColorByProperty?.type;
  if (nodeColorOption === FILL_COLOR_BY_PROPERTY_STRATEGY_CATEGORICAL) {
    const colorMap = extractColorMap(nodeStylingSpec.fillColorByProperty.colorMap);
    ({ colorsGroupings, idsGroupings } = groupByCategory(
      Object.values(props.data.nodes),
      nodeStylingSpec.fillColorByProperty.fieldName,
      colorMap,
      props.defaultNodeColors,
    ));

    const nodeColorGroupings: NodeColorGroup[] = [];
    for (const label in colorsGroupings) {
      nodeColorGroupings.push({
        id: `${label}_item`,
        label: label,
        color: colorsGroupings[label],
        nodeIds: idsGroupings[label],
      });
    }
    setLegendNodeColorGroupings(nodeColorGroupings);
  }

  for (const nodeId in props.data.nodes) {
    const node: UiSdlGraphVisualizationDataNode = props.data.nodes[nodeId];
    let styledNode: Node = {
      id: node.id,
      neighbors: {},
      color: DEFAULT_NODE_COLOR,
      latestNode: node.lastNode,
      callSign: node.callSign,
      trackId: node.trackId,
    };
    if (nodeStylingSpec) {
      styledNode = setItemStyle(styledNode, node, nodeStylingSpec, nodeColorOption, colorsGroupings, true, null, theme);
    }
    if (nodeGlyphSpec) {
      styledNode = setItemGlyphs(styledNode, node, nodeGlyphSpec);
    }
    if (nodeCoordinateSpec) {
      styledNode = setNodeCoordinates(styledNode, node, nodeCoordinateSpec);
    }
    if (nodeDonutSpec) {
      styledNode = setNodeDonutSegments(styledNode, node, nodeDonutSpec, graphBackgroundColor, theme);
    }
    if (nodeTooltipSpec) {
      styledNode = setTooltipFields(styledNode, node, nodeTooltipSpec);
    }

    // Add the clustered donut property on the styled node if the clustered node donut config is set.
    if (nodeClusterDonutSpec) {
      styledNode.clusterDonutProperty = getDescendantPropIfPathDefined(node, nodeClusterDonutSpec?.fieldName);
    }
    if (nodeCombineSpec) {
      const combineProperties = map(props.combineConfig?.combineProperties || {}, 'fieldName');
      const nodeCombineData = {};
      combineProperties.forEach(function (property) {
        nodeCombineData[property] = getDescendantPropIfPathDefined(node, property);
      });
      styledNode.data = nodeCombineData;
    }

    // Add the level number to the styledNode (can have another name than level)
    if (!isNil(props.layout?.level) && props.layout?.level?.fieldName) {
      let levelKey = props.layout.level.fieldName;
      styledNode.data = Object.assign(styledNode.data || {}, {
        [levelKey]: getDescendantPropIfPathDefined(node, levelKey),
      });
    }

    styledData[styledNode.id] = styledNode;
  }

  // Mapping from categorical values specified at directionConfig on edges to the directionality of those edges.
  const directionMap: Record<string, EdgeDirectionality> = {};
  if (edgeStylingSpec?.directionConfig) {
    edgeStylingSpec?.directionConfig?.unidirectional?.forEach((value) => {
      directionMap[value] = EdgeDirectionality.UNIDIRECTIONAL;
    });
    edgeStylingSpec?.directionConfig?.bidirectional?.forEach((value) => {
      directionMap[value] = EdgeDirectionality.BIDIRECTIONAL;
    });
    edgeStylingSpec?.directionConfig?.reverse?.forEach((value) => {
      directionMap[value] = EdgeDirectionality.REVERSE;
    });
  }

  // Obtain groupings by category if edge fill color by property option is set to categorical.
  const edgeColorOption = edgeStylingSpec?.fillColorByProperty?.type;
  if (edgeColorOption === FILL_COLOR_BY_PROPERTY_STRATEGY_CATEGORICAL) {
    const colorMap = extractColorMap(edgeStylingSpec.fillColorByProperty.colorMap);
    ({ colorsGroupings } = groupByCategory(
      Object.values(props.data.edges),
      edgeStylingSpec.fillColorByProperty.fieldName,
      colorMap,
      props.defaultEdgeColors,
    ));
  }

  if (
    Object.keys(nodeTimeBarSpec || {}).some((key) =>
      ['nodeTimestampProperty', 'nodeTimestampsProperty', 'nodeIntervalProperty', 'nodeIntervalsProperty'].includes(
        key,
      ),
    )
  ) {
    Object.values(props.data.nodes).forEach((node: UiSdlGraphVisualizationDataNode) => {
      styledData[node.id].times = getNodeTimes(node, nodeTimeBarSpec);
    });
  }

  if (!(props.showMap && !props.showEdgesOnMap)) {
    if (props.disableMergedEdges) {
      Object.values(props.data.edges).forEach((edge: UiSdlGraphVisualizationDataEdge) => {
        const styledEdge: Link = setUnmergedEdgeStyle(
          edge,
          edgeStylingSpec,
          edgeGlyphSpec,
          edgeTimeBarSpec,
          edgeTooltipSpec,
          directionMap,
          edgeColorOption,
          colorsGroupings,
          useContext,
        );
        styledData[edge.id] = styledEdge;

        // Create/update the neighbor mapping for this edge and its adjacent nodes.
        updateNeighborMapping(styledData, styledEdge);
      });
    } else {
      getMergedEdges(
        Object.values(props.data.edges),
        props.mergedEdgeConfig,
        setMergedEdgesMapping,
        edgeTimeBarSpec,
        directionMap,
        edgeStylingSpec?.directionConfig,
        translate,
      ).forEach((mergedEdge: Link) => {
        /**
         * If a merged edge has a size of 1, apply styling as if it were a single (i.e. non-merged) edge
         * and update the merged edge mapping so the edge id maps to itself.
         */
        if (mergedEdge.size === 1) {
          const singleEdge = setUnmergedEdgeStyle(
            props.data.edges[mergedEdge.id],
            edgeStylingSpec,
            edgeGlyphSpec,
            edgeTimeBarSpec,
            edgeTooltipSpec,
            directionMap,
            edgeColorOption,
            colorsGroupings,
            useContext,
          );
          styledData[singleEdge.id] = singleEdge;

          // Update the neighbor mappings.
          updateNeighborMapping(styledData, singleEdge);
        } else {
          styledData[mergedEdge.id] = mergedEdge;

          // Update the neighbor mappings.
          updateNeighborMapping(styledData, mergedEdge);
        }
      });
    }
  }

  return mapValues(styledData, function (item) {
    return {
      ...item,
      outOfTimebarRange: false,
      neighbors: Object.keys(item.neighbors),
    };
  });
};

/**
 * Renders a FedGraphVisualization with React.
 * @param {Props} props - A FedGraphVisualization configuration.
 */
const FedGraphVisualization: React.FunctionComponent<Props> = (props) => {
  const theme = useContext(UiSdlStylePropertiesContext).themeCategory;
  const translate: ReturnType<typeof useTranslate> = useTranslate();
  const [legendNodeColorGroupings, setLegendNodeColorGroupings] = useState<NodeColorGroup[]>([]);
  const [mergedEdgesMapping, setMergedEdgesMapping] = useState<Record<string, string>>({});

  const combineProperties = map(props.combineConfig?.combineProperties || {}, 'fieldName');
  const reversedCombineProperties: string[] = combineProperties?.slice().reverse();
  const nodeCombineColorGroupings: Record<string, string> = !isNil(props.combineConfig)
    ? reversedCombineProperties.reduce(
        (groupings: Record<string, string>, property: string, index: number) => ({
          ...groupings,
          [property]: props.defaultNodeColors[index],
        }),
        {},
      )
    : {};

  /**
   * Memoized function to return styled nodes and edges based on the provided styling spec.
   */
  const styledData: Record<string, Node | Link> = useMemo(() => {
    if (!props.data) return null;
    return getStyledData(props, setLegendNodeColorGroupings, setMergedEdgesMapping, translate, theme);
  }, [props.data]);

  /**
   * Memoized function to return cache key.
   */
  const getCacheKey: string = useMemo(() => {
    return props?.data?.cacheKey ? props.data.cacheKey : CACHE_KEY_NOT_SET;
  }, [props.data]);

  /**
   * Memoized function to return geoJsonData along with a styling function based on GeoJSON stlying spec.
   */
  const styledGeoJsonData: GeoJSON = useMemo(() => {
    if (!props.showMap || !props.geoJsonData) {
      return null;
    }

    return getStyledGeoJsonData(props);
  }, [props.geoJsonData]);

  /*
   * See `UiSdlMap` documentation.
   * const mapboxConfig = useConfig(
   *   "UiSdlMapbox",
   *   "configWithAccessToken",
   *   { this: {} },
   *   ["map"]
   * );
   * const mapboxToken = mapboxConfig?.accessToken || "NOT_SET";
   * const mapboxVersion = props.mapboxVersion;
   * let mapboxStyle =
   *   props.mapboxStyle !== "NOT_SET"
   *     ? props.mapboxStyle.toLowerCase()
   *     : getComputedStyleValue("--c3-style-graphVisualizationMapTheme");
   * mapboxStyle = mapboxStyle.replace("_", "-");
   */

  /*
   * The Mapbox URL loaded with the API token required for rendering Mapbox tiles.
   * const mapboxDomain = mapboxConfig?.url || "https://api.mapbox.com";
   * const mapboxUrl = `${mapboxDomain}/styles/v1/mapbox/${mapboxStyle}-$i
   * {mapboxVersion}/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`;
   */

  /*
   * START MODIFICATION
   * This was modified to use this approach instead of UiSdlMapbox.
   */
  const fedMapboxConfig = useConfig('FedMapbox', 'configWithAccessToken', { this: {} }, ['map']);

  // The Mapbox URL loaded with the API token required for rendering Mapbox tiles.
  var mapboxUrl;

  if (theme === 'Dark') {
    mapboxUrl = fedMapboxConfig?.graphVisualizationDarkModeMapUrl;
  } else {
    mapboxUrl = fedMapboxConfig?.graphVisualizationLightModeMapUrl;
  }

  // Change the url to match the current toggle style
  if (props?.mapLayerToggle?.currentMapUrl == 'SATELLITE') {
    mapboxUrl = fedMapboxConfig?.graphVisualizationSatelliteModeUrl;
  }

  // END MODIFICATION

  /**
   * A reference to a loaded Supercluster instance to be used to determine the node clusters when the graph is
   * in map mode and clusterConfig.clusterNodes is set to true.
   */
  const superclusterRef = useMemo(() => {
    if (!props.dataSpec?.nodeConfig?.clusterConfig?.clusterNodes) {
      return;
    }

    const { minNodes, radius } = props.dataSpec?.nodeConfig?.clusterConfig || { minNodes: 0, radius: 0 };

    /**
     * Use the supercluster's map-reduce function to aggregate the property used to construct donuts
     * into a single array.
     */
    const supercluster = new Supercluster({
      minPoints: minNodes,
      radius: radius,
      map: (object: Node): { donutPropertyArray: Array<number | string | boolean> } => ({
        donutPropertyArray: [object['clusterDonutProperty']] || [],
      }),
      reduce: (accumulated: { donutPropertyArray: Array<number | string | boolean> }, object: Node): void => {
        accumulated.donutPropertyArray = accumulated.donutPropertyArray.concat(object.donutPropertyArray);
      },
    });

    /*
     * Supercluster only accepts points in the GeoJSON format. Convert each node to its
     * GeoJSON representation and load into the superclusterRef.
     */
    const features = [];
    if (styledData) {
      for (const id in styledData) {
        const node: Node = styledData[id];

        // Don't load nodes that are missing a coordiante
        if (!node.coordinates?.lat || !node.coordinates?.lng) {
          return;
        }
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [node.coordinates?.lng, node.coordinates?.lat],
          },
          properties: node,
        });
      }
    }

    // Load the super cluster instance with the node objects.
    supercluster.load(features);

    return supercluster;
  }, [styledData, props.dataSpec?.nodeConfig?.clusterConfig]);

  // GeoJSON styling spec to set for GeoJSON path on a mouse over event.
  const regionHoverStyle = {
    color: props.geoJsonDataSpec?.style?.outlineColorOnHover,
    fillOpacity: props.geoJsonDataSpec?.style?.fillOpacityOnHover,
    weight: props.geoJsonDataSpec?.style?.outlineWeightOnHover,
  };

  /**
   * GeoJSON styling spec to set for GeoJSON path on a click event. Only sets fillColor prop if the
   * property is defined in the styling spec.
   */
  const regionSelectFillColor = props.geoJsonDataSpec?.style?.fillColorWhenSelected;
  const regionSelectStyle = merge(
    {
      color: props.geoJsonDataSpec?.style?.outlineColorWhenSelected,
      fillOpacity: props.geoJsonDataSpec?.style?.fillOpacityWhenSelected,
      weight: props.geoJsonDataSpec?.style?.outlineWeightWhenSelected,
    },
    regionSelectFillColor && {
      fillColor: regionSelectFillColor,
    },
  );

  /**
   * Glyph to be displayed with the node info about an aggregated node. Used in:
   * - count on a closed combine node.
   * - percentage value on clustered node.
   */
  const nodeInfoGlyph = {
    bold: true,
    color: getComputedStyleValue('--c3-style-graphVisualizationNodeInfoGlyphBackgroundColor'),
    label: {
      color: getComputedStyleValue('--c3-style-graphVisualizationNodeInfoGlyphFontColor'),
    },
    position: TOP_RIGHT_GLYPH_POSITION,
    size: CLOSED_COMBINE_NODE_GLYPH_SIZE,
  };

  const backgroundColor = theme === 'Dark' ? '#000000' : '#FFFFFF';
  const nodeHoverBorderColor = theme === 'Dark' ? '#DFE1E5' : '#393B40';

  // TimeBar style properties.
  const timeBarBackgroundColor =
    props.timeBarConfig?.backgroundColor ||
    getComputedStyleValue('--c3-style-graphVisualizationTimeBarBackgroundColor');
  const timeBarColor = props.timeBarConfig?.color || getComputedStyleValue('--c3-style-graphVisualizationTimeBarColor');
  const timeBarHoverColor =
    props.timeBarConfig?.hoverColor || getComputedStyleValue('--c3-style-graphVisualizationTimeBarHoverColor');
  const timeBarScaleHoverColor = getComputedStyleValue('--c3-style-graphVisualizationTimeBarScaleHoverColor');
  const timeBarLabelColor = getComputedStyleValue('--c3-style-colorFgSecondary');
  const timeBarIsHistogram = props.timeBarConfig?.isHistogram ?? true;
  const timeBarIsDimmingMode = props.timeBarConfig?.mode === 'dim';
  const timeBarAnimation = props.timeBarConfig?.animation;

  const pingConfig = {
    color: props.pingConfig?.color || DEFAULT_PING_COLOR,
    haloRadius: props.pingConfig?.haloRadius || DEFAULT_PING_HALO_RADIUS,
    haloWidth: props.pingConfig?.haloWidth || DEFAULT_PING_HALO_WIDTH,
    linkWidth: props.pingConfig?.linkWidth || DEFAULT_PING_LINK_WIDTH,
    repeat: props.pingConfig?.repeat || DEFAULT_PING_REPEAT,
    time: props.pingConfig?.time || DEFAULT_PING_TIME,
  };

  let selectionConfigColor = DEFAULT_SELECTION_COLOR;
  try {
    selectionConfigColor = new Color(props.selectionConfig?.color).toRgbString('rgba');
  } catch (error) {
    selectionConfigColor = DEFAULT_SELECTION_COLOR;
  }

  const selectionConfig = {
    color: selectionConfigColor,
    highlightNeighborsOnSelect:
      props.selectionConfig?.highlightNeighborsOnSelect ?? DEFAULT_SELECTION_HIGHLIGHT_NEIGHBORS_ON_SELECT,
    labelColor: props.selectionConfig?.labelColor || DEFAULT_SELECTION_LABEL_COLOR,
    multiSelectionBehavior: props.selectionConfig?.multiSelectionBehavior || DEFAULT_SELECTION_MULTI_SELECTION_BEHAVIOR,
  };

  // Cluster node style properties.
  const clusterNodeFillColor = getComputedStyleValue('--c3-style-graphVisualizationClusterNodeFillColor');
  const clusterNodeOutlineColor = getComputedStyleValue('--c3-style-graphVisualizationClusterNodeOutlineColor');
  const collapseCombinedNodesOnLoad = props.combineConfig?.collapseCombinedNodesOnLoad ?? true;
  const useSummaryLinks = props.combineConfig?.useSummaryLinks ?? true;

  return (
    <FedGraphVisualizationPresentationalComponent
      {...props}
      backgroundColor={backgroundColor}
      cacheKey={getCacheKey}
      clearGraphWarningModalComponentId="SDL.UiSdlGraphVisualizationClearGraphWarningModal"
      clusterConfig={props.dataSpec?.nodeConfig?.clusterConfig}
      scaleConfig={props.scaleConfig}
      clusterNodeFillColor={clusterNodeFillColor}
      clusterNodeOutlineColor={clusterNodeOutlineColor}
      collapseCombinedNodesOnLoad={collapseCombinedNodesOnLoad}
      coordinateReferenceSystem={fedMapboxConfig?.coordinateReferenceSystem}
      data={styledData}
      geoJsonData={styledGeoJsonData}
      mapboxUrl={mapboxUrl}
      mergedEdgesMapping={mergedEdgesMapping}
      nodeColorGroupings={legendNodeColorGroupings}
      nodeCombineColorGroupings={nodeCombineColorGroupings}
      nodeHoverBorderColor={nodeHoverBorderColor}
      nodeInfoGlyph={nodeInfoGlyph}
      pingConfig={pingConfig}
      regionHoverStyle={regionHoverStyle}
      regionSelectStyle={regionSelectStyle}
      resetGraphWarningModalComponentId="SDL.UiSdlGraphVisualizationResetGraphWarningModal"
      reversedCombineProperties={reversedCombineProperties}
      selectionConfig={selectionConfig}
      superclusterRef={superclusterRef}
      timeBarBackgroundColor={timeBarBackgroundColor}
      timeBarColor={timeBarColor}
      timeBarAnimation={timeBarAnimation}
      timeBarHoverColor={timeBarHoverColor}
      timeBarIsDimmingMode={timeBarIsDimmingMode}
      timeBarIsHistogram={timeBarIsHistogram}
      timeBarScaleHoverColor={timeBarScaleHoverColor}
      timeBarLabelColor={timeBarLabelColor}
      useSummaryLinks={useSummaryLinks}
      boundingBox={props.boundingBox}
    />
  );
};

// Glyph type.
export type Glyph = {
  angle?: number;
  blink?: boolean;
  border?: {
    color: string;
    witdh: number;
  };
  color?: string;
  fontIcon?: {
    color: string;
    fontFamily: string;
    text: string | number;
  };
  image?: string;
  label?: {
    bold?: boolean;
    color: string;
    fontFamily?: string;
    text: string;
  };
  position?: 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';
  radius?: number;
  size?: number;
  isEdgeCount?: boolean;
};

// Link type.
export type Link = {
  id: string;
  flow?:
    | boolean
    | {
        velocity: number;
      };
  label?: {
    backgroundColor: string;
    bold: boolean;
    color: string;
    fontFamily: string;
    fontSize: number;
    text: string;
  };
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  size?: number;
  width?: number;
  id1: string;
  id2: string;
  end1?: LinkEnd;
  end2?: LinkEnd;
  times?: (Timestamp | TimeRange)[];
  neighbors?: Record<string, boolean>;
  constituentEdges?: Array<Link>;
  glyphs?: Array<Glyph>;
  tooltipTitle?: string;
  tooltipSubtitle?: string;
  tooltipBody?: string;
  color?: string;
  hoverColor?: string;
  defaultColor?: string;
  hoverWidth?: number;
  defaultWidth?: number;
};

export {
  extractColorMap,
  getColorWithOpacity,
  getEdgeTimes,
  getNodeTimes,
  getGlyphFromConfig,
  getMergedEdges,
  getStyledGeoJsonData,
  groupByCategory,
  pushTimeIntervalToTimes,
  pushTimestampToTimes,
  setEdgeDirectionality,
  setItemGlyphs,
  setItemStyle,
  setNodeCoordinates,
  setNodeDonutSegments,
  getStyledData,
  GRADIENT_VALUES_REQUIRED_MESSAGE,
  ILLEGAL_FILL_COLOR_MESSAGE,
  STEPPED_VALUES_REQUIRED_MESSAGE,
  UNKNOWN_DONUT_TYPE_MESSAGE,
  UNKNOWN_EDGE_DIRECTIONALITY_TYPE_MESSAGE,
};
export default FedGraphVisualization;
