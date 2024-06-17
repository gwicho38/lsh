/*
 * Copyright 2009-2024 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import cloneDeep from 'lodash/cloneDeep';
import countBy from 'lodash/countBy';
import { getDescendantPropIfPathDefined } from '@c3/ui/UiSdlHelpers';
import showEmptyState from '@c3/sdl-react/helpers/showEmptyStateHelper';
import SDLEmptyState from '@c3/sdl-react/reactComponents/SDLEmptyState';
import isEmpty from 'lodash/isEmpty';
import isNil from 'lodash/isNil';
import keyBy from 'lodash/keyBy';
import map from 'lodash/map';
import omitBy from 'lodash/omitBy';
import omit from 'lodash/omit';
import * as Leaflet from 'leaflet/dist/leaflet';
import NestedComponent from '@c3/ui/UiSdlNestedComponentReact';
import Supercluster from 'supercluster';
import Color from '@c3/sdl-react/helpers/Color';
import { useLocaleDateTimeFormat } from '@c3/sdl-react/hooks/useLocaleDateTimeFormat';
import { useTranslate } from '@c3/sdl-react/hooks/useTranslate';
import lightenColor from '@c3/sdl-react/helpers/lightenColorHelper';
import { useTimeout } from '@c3/ui/UiSdlUseTimeout';
import { useType } from '@c3/ui/UiSdlUseType';
import UiSdlGraphVisualizationContextMenu from '@c3/ui/UiSdlGraphVisualizationContextMenuReact';
import UiSdlGraphVisualizationGraphAction from '@c3/ui/UiSdlGraphVisualizationGraphActionReact';
import UiSdlGraphVisualizationLegend from '@c3/ui/UiSdlGraphVisualizationLegendReact';
import UiSdlGraphVisualizationTooltip from '@c3/ui/UiSdlGraphVisualizationTooltipReact';
import UiSdlGraphVisualizationZoomControls from '@c3/ui/UiSdlGraphVisualizationZoomControlsReact';
import UiSdlGraphVisualizationTimeBarControlBar from '@c3/ui/UiSdlGraphVisualizationTimeBarControlBarReact';
import UiSdlReduxAction, { FedGraphVisualizationPresentationalComponent as Props } from '@c3/types';
import UiSdlSpinner from '@c3/ui/UiSdlSpinnerReact';

// Required for map capability.
import 'leaflet/dist/leaflet.css';
import '@c3/css-library/base/_fontAwesome.scss';

// Event passed to the `handleChartHover` function.
type ChartHoverEvent = {
  // The id of the hovered item, if any.
  id?: string;

  // The x position of the mouse.
  x: number;

  // The y position of the mouse.
  y: number;
};

type ChartItemInteractionEvent = {
  // Whether or not an item is being selected
  selected: boolean;

  // Whether or not an item is being hovered
  hovered: boolean;

  // The item being interacted with
  item: object;

  // The id of the item
  id: string;

  // Function to set the style of the item
  setStyle: Function;
};

type ChartClickEvent = {
  // Id of clicked item
  id: string;

  modifierKeys: object;

  // Marker object
  subItem: object;

  // The x location of the pointer in view coordinates.
  x: number;

  // The y location of the pointer in view coordinates.
  y: number;
};

// Cluster node default values.
const CLUSTER_NODE_BORDER_WIDTH = 2;
const CLUSTER_NODE_DONUT_BORDER_WIDTH = 0;
const CLUSTER_NODE_DONUT_WIDTH = 5;
const CLUSTER_NODE_FILL_COLOR_OPACITY = 0.5;
const CLUSTER_NODE_SIZE_MULTIPLIER = 0.15;

// Error message for unknown donut type.
const UNKNOWN_DONUT_TYPE_MESSAGE = 'Unknown donut type';

// Default time bar height.
const TIME_BAR_HEIGHT = '106px';

// Base time bar play speed.
const TIME_BAR_BASE_SPEED = 60;

// Values for graph vendor type name and package name.
const GRAPH_VENDOR_TYPE_NAME = 'UiSdlGraphVendorComponent';
const GRAPH_VENDOR_PACKAGE_NAME = 'vendorGraph';

// Labels font family.
const SDL_FONT_FAMILY = 'Inter';

/**
 * Checks if an item is a node.
 * @param {Record<string, any>} item - The item to check.
 * @returns {boolean} Whether the item is a node or not.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isNode = (item: Record<string, any>): boolean => {
  return item && isNil(item.id1) && isNil(item.id2);
};

/**
 * Checks if an item is an edge.
 * @param {Record<string, any>} item - The item to check.
 * @returns {boolean} Whether the item is an edge or not.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isEdge = (item: Record<string, any>): boolean => {
  return item.id && item.id1 && item.id2;
};

/**
 * Checks if the target of a click is a group.
 * @param {string} id - The id of the item to check
 * @returns {boolean} Whether the item is a group or not.
 */
const isGroup = (id: string): boolean => {
  return id?.indexOf('_combonode_') >= 0;
};

/**
 * Checks if the target of a click is a combo edge.
 * @param {string} id - The id of the item to check.
 * @returns {boolean} Whether the item is a combo edge or not.
 */
const isComboEdge = (id: string): boolean => {
  return id?.indexOf('_combolink_') >= 0;
};

/**
 * Used as a reference to define defaultProps for an empty action function.
 * @returns {UiSdlReduxAction} A redux action.
 */
const emptyActionFunction = (): UiSdlReduxAction => {
  return {};
};

/**
 * Used to check if the data has changed since the last render.
 * @param {Record<string, string>} data The data to check.
 * @returns {string} A string containing the node ids concatenated.
 */
const stringifiedData = (data: Record<string, string>): string => Object.keys(data || {}).join('');

/**
 * Renders a FedGraphVisualizationPresentationalComponent with React.
 * @param {Props} props - A FedGraphVisualizationPresentationalComponent configuration.
 */
const FedGraphVisualizationPresentationalComponent: React.FunctionComponent<Props> = (props) => {
  const UiSdlGraphVendorComponent = useType(GRAPH_VENDOR_TYPE_NAME, GRAPH_VENDOR_PACKAGE_NAME);
  const displayEmptyState = !props.showMap && !props.isDataLoading && showEmptyState(props, 'data');
  const translate = useTranslate();
  const localeDateTimeFormatRef = useRef(useLocaleDateTimeFormat());

  // State variable to hold the open status of combine nodes.
  const [combineOpenStatus, setCombineOpenStatus] = useState({});
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    options: null,
    x: null,
    y: null,
    optionClick: (): void => {
      /* */
    },
    itemId: '',
  });
  const [tooltip, setTooltip] = useState(null);

  /**
   * Only execute actions in `handleTimeBarChange` if the timebar handle is actually being dragged.  It is set to true
   * on `dragStart` of the timebar handle, and set to false on `dragEnd` of the timebar handle.  If we don't do this,
   * the `handleTimeBarChange` function is executed after a `fit` operation, which we don't want because at that point,
   * we've already executed the `handleTimeBarChange` function.  So the second execution of `handleTimeBarChange` is
   * superfluous.
   */
  const [timebarIsDragging, setTimebarIsDragging] = useState(false);

  // Call setTimeBarInRangeItemsAction once render in useEffect, so after that we set this state value to true.
  const [didSetTimebarItemsOnRender, setDidSetTimebarItemsOnRender] = useState(false);

  // Track the zoom value of the graph.  This is used in calculating the position of the node tooltip.
  const [view, setView] = useState({ zoom: 0 });

  // Set the node positions on initial render.  This is used in calculating the position of the node tooltip.
  const [nodePositions, setNodePositions] = useState({});

  // Set the play speed for the time bar
  const defaultSpeed = props.timeBarConfig?.controlsConfig?.defaultSpeed ?? 1;
  const [timeBarPlaySpeed, setTimeBarPlaySpeed] = useState(TIME_BAR_BASE_SPEED * defaultSpeed);

  // Set the time bar play or pause state
  const [timeBarIsPlaying, setTimeBarIsPlaying] = useState(false);

  const chartRef = useRef(null);

  // We use the `geoJsonRef` to prevent re-adding geoJson layers to the Leaflet map on every render.
  const geoJsonRef = useRef(null);

  // We use the `leafletRef` to re-render geoJson layers to the Leaflet map when geoJson loads.
  const leafletRef = useRef(null);

  // We will use `timeBarRef` as a pointer to the rendered React element.
  const timeBarRef = useRef(null);

  const { clear: clearUseTimeout, reset: resetUseTimeout } = useTimeout(() => {
    setTimebarIsDragging(false);
  }, 1000);

  /**
   * Clear the timeout function once the component mounted
   */
  useEffect(() => {
    clearUseTimeout();
  }, []);

  /*
   * We will use `bboxRef` to store the initial bounding box of the leaflet map. This value and the map zoom level
   * will be used by the Supercluster library to determine the node clusters.
   */
  const bboxRef = useRef(null);

  /**
   * We use chartPropsRef to control the layout.  We only want to set the layout prop on first render, or if the layout
   * value changes.  This is to avoid a "feature" in organic layout where the nodes layout will shift around even
   * if the number of nodes and edges has not changed.
   */
  const chartPropsRef = useRef({
    ref: null,
    animation: null,
    combine: null,
    items: null,
    selection: null,
    style: null,
    onClick: null,
    map: null,
    onChange: null,
    onCombineNodes: null,
    onCombineLinks: null,
    onDoubleClick: null,
    onPointerMove: null,
    onViewChange: null,
    options: null,
  });

  /**
   * Callback function to set selected region in state and update styles.
   */
  const selectRegion = useCallback(
    (region) => {
      // De-select region.
      if (region === selectedRegion) {
        geoJsonRef.current.resetStyle(selectedRegion);
        setSelectedRegion(null);
        return;
      }
      if (region) {
        region.setStyle(props.regionSelectStyle);
      }
      if (selectedRegion) {
        geoJsonRef.current.resetStyle(selectedRegion);
      }
      setSelectedRegion(region);
    },
    [props.regionSelectStyle, selectedRegion],
  );

  /**
   * The region's onClick handler: called after the chart's onClick, but before the global Leaflet onClick handler.
   */
  const handleLeafletRegionClick = useCallback(
    (e) => {
      // Prevent the global Leaflet click handler from handling this event if a region was clicked
      Leaflet.DomEvent.stop(e);
      selectRegion(e.target);
      props.clickRegionAction(e.target.feature?.properties?.name);
    },
    [selectRegion, props],
  );

  /**
   * Apply hover style to region on mouseover.
   */
  const handleLeafletRegionMouseOver = useCallback(
    (e) => {
      if (!selectedRegion || e.target.feature?.properties?.name !== selectedRegion.feature?.properties?.name) {
        const layer = e.target;
        layer.setStyle(props.regionHoverStyle);
      }
    },
    [props.regionHoverStyle, selectedRegion],
  );

  /**
   * Restore original style to region on mouseout.
   */
  const handleLeafletRegionMouseOut = useCallback(
    (e) => {
      if (!selectedRegion || e.target.feature?.properties?.name !== selectedRegion.feature?.properties?.name) {
        geoJsonRef.current.resetStyle(e.target);
      }
    },
    [selectedRegion],
  );

  const unmergedItems = useMemo(() => {
    const unmergedItems = {};
    if (isNil(props.data)) {
      return unmergedItems;
    }
    for (const id in props.data) {
      const item = props.data[id];
      if (isEdge(item)) {
        if (item.size > 1) {
          item.constituentEdges?.forEach((constituentEdge) => {
            unmergedItems[constituentEdge.id] = constituentEdge;
          });
        } else {
          unmergedItems[id] = item;
        }
      } else {
        unmergedItems[id] = item;
      }
    }
    return unmergedItems;
  }, [props.data]);

  /**
   * Set up mouse event listeners for leaflet layers.
   */
  useEffect(() => {
    if (!props.showMap || !props.geoJsonData) return;

    /*
     * We set the geoJsonRef ref when props.geoJsonData is set and conditionally bind event
     * listeners to each of the layers for the click, mouseover, and mouseout events.
     */
    geoJsonRef.current = props.geoJsonData;
    geoJsonRef.current.eachLayer((layer) => {
      layer.on({
        click: props.geoJsonDataSpec?.selectable && handleLeafletRegionClick,
        mouseover: props.geoJsonDataSpec?.highlightable && handleLeafletRegionMouseOver,
        mouseout: props.geoJsonDataSpec?.highlightable && handleLeafletRegionMouseOut,
      });
    });

    // Add the layers to leaflet whenever geoJsonData is updated
    if (leafletRef.current) {
      geoJsonRef.current.addTo(leafletRef.current);
    }

    return (): void => {
      geoJsonRef.current.eachLayer((layer) => layer.off());
    };
  }, [
    props.geoJsonData,
    props.data,
    handleLeafletRegionClick,
    handleLeafletRegionMouseOver,
    handleLeafletRegionMouseOut,
    props.showMap,
    props.geoJsonDataSpec,
    leafletRef,
  ]);

  /**
   * Sets the mergedEdgesMapping in the Redux state to allow programmatic selection of merged edges.
   */
  useEffect(() => {
    props.setMergedEdgeMappingAction(props.mergedEdgesMapping);
  }, [JSON.stringify(props.mergedEdgesMapping)]);

  /**
   * Temporarily animate or ping the given graph items.
   */
  useEffect(() => {
    const ids = props.pingItems || [];
    if (chartRef.current && ids.length > 0) {
      ids.forEach((id) => {
        chartRef.current.ping(id, props.pingConfig);
      });
      props.pingItemsAction([]);
    }
  }, [JSON.stringify(props.pingItems)]);

  /**
   * If using the timebar, call the action once to set the timebar in range items.
   */
  useEffect(() => {
    if (
      props.timeBarConfig &&
      !didSetTimebarItemsOnRender &&
      timeBarRef.current &&
      !isEmpty(timeBarRef.current.props.items)
    ) {
      const keysArray = Object.keys(timeBarRef.current.props.items);
      props.setTimeBarInRangeItemsAction(keysArray);
      setDidSetTimebarItemsOnRender(true);
    }
  }, [props, didSetTimebarItemsOnRender]);

  /**
   * If using the timebar and highlight neighbors is true, fit the timebar on the higlighted items.
   * Do not fit the timebar when the timebar is dragging. If no items are highlighted, fit only on the timebar
   * in range edges.
   */
  useEffect(() => {
    if (!timebarIsDragging && props.timeBarConfig && timeBarRef.current && chartRef.current) {
      const inRangeItems =
        !isEmpty(props.highlightedItemIds) && props.defaultFitOptionOnSelect !== 'none'
          ? props.highlightedItemIds
          : props.timeBarInRangeItems;
      timeBarRef.current.fit(inRangeItems);
    }
  }, [props.timeBarInRangeItems, props.highlightedItemIds]);

  /**
   * Fit the graph to selected items.
   */
  useEffect(() => {
    if (chartRef.current && !isEmpty(props.selectedItems)) {
      if (props.defaultFitOptionOnSelect === 'auto') {
        chartRef.current.fit(props.selectedItems);
      } else if (props.defaultFitOptionOnSelect === 'all' || props.defaultFitOptionOnSelect === 'selection') {
        chartRef.current.fit(props.defaultFitOptionOnSelect);
      }
    }
  }, [JSON.stringify(props.selectedItems)]);

  /**
   * Refresh canvasItems when the data changes.
   */
  useEffect(() => {
    if (props.data !== null) {
      props.initializeCanvasItemsAction(props.data);
    }
  }, [stringifiedData(props.data)]);

  /**
   * Reset CombineOpenStatus when the reset graph is clicked.
   */
  useEffect(() => {
    if (props.forceCanvasItemsInitialization) {
      props.setForceCanvasItemsInitializationAction(false);
      setCombineOpenStatus((prevStatus) => (isEmpty(prevStatus) ? prevStatus : {}));
    }
  }, [props.forceCanvasItemsInitialization]);

  /**
   * Handler for the combineNodes function. Invoked each time a combo is created or updated. Used to adjust the style
   * of the combo by using the setStyle function.
   * @param {string} id - The default id for this combo. This can be overridden in the return value.
   * @param {Record<string, any>} nodes - The nodes belonging to this combo.
   * @param {Record<string, string>} combo - An object containing the specific values for the combine properties.
   *   For example, properties ['county', 'state'] could result in a combo object
   *   { county: ‘Cambridge’, state: ‘Massachusetts’ }.
   * @param {Function} setStyle - Use to specify the style of this combo.
   */
  const handleChartCombineNodes = ({ id, nodes, combo, setStyle }): void => {
    if (!isNil(props.combineConfig)) {
      /**
       * If the combo node id does not exist in the combineOpenStatus state object, set the id and default to
       * collapseCombinedNodesOnLoad value.
       */
      if (!(id in combineOpenStatus)) {
        setCombineOpenStatus({
          ...combineOpenStatus,
          [id]: !props.collapseCombinedNodesOnLoad,
        });
      }

      // Get combo category to determine background color.
      const comboDepth = Object.keys(combo).length;
      const comboCategory = props.reversedCombineProperties[comboDepth - 1];

      // Get the combo fill color based on nodeCombineColorGroupings and dilute it to 0.2 alpha.
      const comboColor = props.nodeCombineColorGroupings[comboCategory];
      const color = new Color(comboColor).withAlpha(0.2).toString();
      const outlineColor = props.combineConfig.combineOutlineColor || comboColor;

      /**
       * According to https://regraph.io/reference#Chart-ComboStyle
       * combo nodes need to set label style through setStyle function.
       * Retriving the nodes label styling from the first node since they are all the same.
       */
      let labelConfig = Object.assign({}, Object.values(nodes)[0]?.label);
      delete labelConfig.text;

      // Set the node count in the glyph to be displayed when the combo node is closed.
      const countGlyph = cloneDeep(props.nodeInfoGlyph);
      countGlyph.label.text = Object.keys(nodes).length;

      setStyle({
        open: id in combineOpenStatus ? combineOpenStatus[id] : !props.collapseCombinedNodesOnLoad,
        color: color,
        glyphs: [countGlyph],
        border: { color: outlineColor },
        label: labelConfig,
      });
    }
  };

  /**
   * Handler for the combineLinks function. Invoked each time a summary link is created or updated. Used to adjust the
   * style of the summary link by using the setStyle function.
   * @param {Function} setStyle - Use to specify the style of this combo.
   */
  const handleChartCombineLinks = ({ setStyle }): void => {
    if (!isNil(props.combineConfig)) {
      setStyle({
        color: props.combineConfig.summaryLinkColor,
        contents: !props.useSummaryLinks,
        lineStyle: props.combineConfig.summaryLinkLineStyle,
        summary: props.useSummaryLinks,
        width: props.combineConfig.summaryLinkWidth,
      });
    }
  };

  /**
   * Adds the node to the opened object, and re-fire the handleChartCombineNodes function.
   * @param {string} id - The id of the node that was double clicked.
   */
  const handleChartDoubleClick = ({ id }): void => {
    // Toggle combine node open status on double click.
    if (isGroup(id)) {
      setCombineOpenStatus({
        ...combineOpenStatus,
        [id]: !combineOpenStatus[id],
      });
    }
  };

  /**
   * Invoked whenever the chart triggers a change of state. Typically caused by layouts and user interactions.
   * @param {Record<string, any>} change - An object describing the change.
   * @param {Record<string, any>} change.leaflet - The underlying Leaflet map object that is used in map mode. When
   *   the map is hidden, the property is set to null.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChartChange = (change: Record<string, any>): void => {
    const { leaflet, view, positions } = change;

    // Add scale control
    if (leaflet && props.showMap && props.scaleConfig) {
      const scaleConfig = Object.assign({
        position: 'bottomleft',
        maxWidth: 100,
        metric: true,
        imperial: true,
        updateWhenIdle: false
      }, props.scaleConfig);
      Leaflet.control.scale(scaleConfig).addTo(leaflet);
    }

    if (positions) {
      // Set the positions of the nodes in the state; this will be used when calculating tooltip position.
      setNodePositions(positions);
    }

    if (!isNil(view)) {
      // Set the zoom value in the state; this will be used when calculating tooltip position.
      setView(view);
    }

    // Get the bounding box of the leaflet map to be used by Supercluster to cluster nodes.
    if (leaflet && props.clusterConfig?.clusterNodes) {
      const bbox = leaflet.getBounds().toBBoxString();
      const bboxBounds = bbox.split(',');
      bboxRef.current = [
        parseFloat(bboxBounds[0]),
        parseFloat(bboxBounds[1]),
        parseFloat(bboxBounds[2]),
        parseFloat(bboxBounds[3]),
      ];
    }

    if (!leafletRef.current && leaflet) {
      leafletRef.current = leaflet;
    }

    if (leaflet && geoJsonRef.current) {
      geoJsonRef.current.addTo(leaflet);
    }
    if (
      props.boundingBox.hasOwnProperty('lat1') &&
      props.boundingBox.hasOwnProperty('lat2') &&
      props.boundingBox.hasOwnProperty('lon1') &&
      props.boundingBox.hasOwnProperty('lon2')
    ) {
      Leaflet.rectangle(
        [
          [props.boundingBox.lat1, props.boundingBox.lon1],
          [props.boundingBox.lat2, props.boundingBox.lon2],
        ],
        { color: '#FF0000', weight: 5, fillOpacity: 0 },
      ).addTo(leaflet);
    }

    // Re-calculate the clusters based on the map zoom level.
    if (props.superclusterRef && view?.mapZoom) {
      const clusters = props.superclusterRef.getClusters(bboxRef.current, view.mapZoom);
      setClusters(clusters);
    }
  };

  /**
   * Invoked when the pointer moves on a chart item that is not already hovered.
   * @param {Record<string, any>} item - The hovered item.
   * @param {number} x - The x location of the pointer in view coordinates.
   * @param {number} y - The y location of the pointer in view coordinates.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleItemHoverOn = (item: Record<string, any>, x: number, y: number): void => {
    const itemId = item.id;

    if (isNode(item)) {
      props.hoverOnNodeAction(itemId, x, y, view.zoom);
    } else {
      props.hoverOnEdgeAction(itemId, x, y);

      if (!props.disableMergedEdges) {
        props.hoverOnMergedEdgeAction(map(item.constituentEdges, (item) => item.id));
      }
    }
  };

  /**
   * Invoked when the pointer moves off a hovered item in the chart.
   */
  const handleItemHoverOff = (): void => {
    setTooltip(null);
  };

  /**
   * Checks if a specific item in the chart is hovered.
   * @param {string} itemId - The id of the item to check.
   * @returns {boolean} Whether the item is hovered or not.
   */
  const isItemHovered = (itemId: string): boolean => {
    return props.hoveredNodeId === itemId || props.hoveredEdgeId === itemId;
  };

  /**
   * Checks if any item in the chart is hovered.
   * @returns {boolean} Whether any item is hovered or not.
   */
  const isAnyItemHovered = (): boolean => {
    return props.hoveredNodeId || props.hoveredEdgeId;
  };

  const handleItemInteraction = (event: ChartItemInteractionEvent): void => {
    const { hovered, selected, item, id, setStyle } = event;
    const existingColor = item?.color;
    let newColor = 'ffffff';

    if (existingColor) {
      newColor = lightenColor(existingColor, 20);
      newColor = removeAlpha(newColor);
    }

    if (hovered || selected) {
      const newStyle = {
        color: '#00FFFFFF',
        border: {
          color: props.nodeHoverBorderColor,
        },
      };
      setStyle({ [id]: newStyle });
    }
  };

  /**
   * Removes the alpha value from a color
   * @param {String} color The color
   * @returns {boolean} Whether any item is hovered or not.
   */
  function removeAlpha(color) {
    // Remove any whitespace and convert to lowercase
    color = color.trim().toLowerCase();

    if (color.startsWith('rgba(')) {
      // Parse RGB color components
      const rgbValues = color.match(/\d+/g);
      if (rgbValues && rgbValues.length > 3) {
        // We ignore the a value
        const r = parseInt(rgbValues[0]);
        const g = parseInt(rgbValues[1]);
        const b = parseInt(rgbValues[2]);

        // Return the new RGB format
        return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
      }
    }

    // Return default color if format is not recognized
    return color;
  }

  /**
   * Invoked when the user hovers over an item for a specified time. Only invoked whenever the hover id changes.
   * @param {ChartHoverEvent} event - The hover event passed to the function.
   */
  const handleChartHover = (event: ChartHoverEvent): void => {
    const { id } = event;
    let x: number;
    let y: number;

    if (id && !isGroup(id) && !isComboEdge(id)) {
      const item = props.data[id];

      // Don't do anything if item is not found in canvasItems.
      if (!item) {
        return;
      }

      if (!isItemHovered(id)) {
        if (isNode(item) && nodePositions[id]) {
          /**
           * Convert world coordinates (absolute positions relative to the center of the chart), which is how the
           * node positions are represented in the graph, into view coordinates (relative to the top-left of the
           * viewport).  This is so the tooltip can be positioned relative to the node instead of relative to the
           * mouse position.
           */
          const adjustedNodePosition: Record<string, number> = chartRef.current.viewCoordinates(
            nodePositions[id].x,
            nodePositions[id].y,
          );
          x = adjustedNodePosition.x;
          y = adjustedNodePosition.y;
        } else {
          x = event.x;
          y = event.y;
        }
        if (isNode(item)) {
          props.hoverOnNodeAction(id, x, y, view.zoom);
          const tooltipConfig = props.dataSpec.nodeConfig?.tooltipConfig;
          if (tooltipConfig && props.data[id]) {
            const tooltipTitle = props.data[id].tooltipTitle;
            const tooltipSubtitle = props.data[id].tooltipSubtitle;
            const tooltipBody = props.data[id].tooltipBody;
            if (tooltipTitle || tooltipSubtitle || tooltipBody) {
              let count = 0;
              for (const key in props.data) {
                if (props.data[key].trackId == props.data[id].trackId) {
                  count++;
                  if (count > 1) {
                    break;
                  }
                }
              }
              let historicalTracksString = count == 1 ? 'Historical Tracks: No\n' : 'Historical Tracks: Yes\n';
              setTooltip({
                x: x,
                y: y,
                tooltipTitle: tooltipTitle,
                tooltipSubtitle: tooltipSubtitle,
                tooltipBody: tooltipBody.concat(historicalTracksString),
              });
            }
          }
        } else if (isEdge(item)) {
          props.hoverOnEdgeAction(id, x, y);
          if (!props.disableMergedEdges) {
            props.hoverOnMergedEdgeAction(map(item.constituentEdges, (item) => item.id));
          }
          const tooltipConfig = props.dataSpec.edgeConfig?.tooltipConfig;
          if (tooltipConfig && props.data[id]) {
            const tooltipTitle = props.data[id].tooltipTitle;
            const tooltipSubtitle = props.data[id].tooltipSubtitle;
            const tooltipBody = props.data[id].tooltipBody;
            if (tooltipTitle || tooltipSubtitle || tooltipBody) {
              setTooltip({
                x: x,
                y: y,
                tooltipTitle: tooltipTitle,
                tooltipSubtitle: tooltipSubtitle,
                tooltipBody: tooltipBody,
              });
            }
          }
        }
      }
    } else {
      handleItemHoverOff();
    }
  };

  /**
   * Invoked when the user clicks or taps on the chart surface. The props object passing into the function contains the
   *   following properties:
   *   - {string | null} id - The id of the target item.
   *   - {object} modifierKeys - A dictionary detailing which modifier keys were pressed when the event occurred.
   *   - {object} subItem - An object containing details of the targeted sub-item, if applicable.
   *   - {number} x - The x location of the pointer in view coordinates.
   *   - {number} y - The y location of the pointer in view coordinates.
   */
  const handleChartClick = ({ id, modifierKeys, subItem, x, y }: ChartClickEvent): void => {
    const glyphClick = (subItem): boolean => subItem?.type === 'glyph';
    const item = props.data[id];

    // GET the worldCoordinates method from the Chart instance
    const { worldCoordinates } = chartRef.current;
    const { lat, lng } = worldCoordinates(x, y);
    props.clickGraphAction(lat, lng);

    if ((item && isEdge(item)) || isComboEdge(id)) {
      props.clickEdgeAction(id);
      if (glyphClick(subItem)) {
        props.clickEdgeGlyphAction(id, item.glyphs[subItem.index]);
      }
    } else if ((item && isNode(item)) || isGroup(id)) {
      props.clickNodeAction(id);
      if (glyphClick(subItem)) {
        props.clickNodeGlyphAction(id, item.glyphs[subItem.index]);
      }

      for (const key in props.data) {
        if (props.data[key].trackId == props.data[id].trackId) {
          if (filteredItemsToRender.hasOwnProperty(key) && filteredItemsToRender[key].latestNode == false) {
            delete filteredItemsToRender[key];
          } else {
            filteredItemsToRender[key] = props.data[key];
          }
        }
      }
    }

    const isMultiSelect = modifierKeys.shift;
    const selectedItems = props.selectedItems || {};
    let newSelectedItems = {};

    if (selectedItems[id]) {
      Object.keys(selectedItems).forEach((selectedItemId) => {
        if (selectedItemId !== id) {
          newSelectedItems[selectedItemId] = true;
        }
      });
    } else if (id && !isMultiSelect) {
      newSelectedItems[id] = true;
    } else if (id && isMultiSelect) {
      newSelectedItems = selectedItems;
      newSelectedItems[id] = true;
    }

    /**
     * Filter out all given graph items to exclude `_combonode_`s and `_combolink_`s which are not real nodes and edges,
     * and are not present in the original graph items.
     */
    const filteredIds = Object.keys(newSelectedItems).filter((id) => !isGroup(id) && !isComboEdge(id));

    // Don't dispatch a setSelectedItemAction if clicking on the graph canvas when no items are selected.
    if (!isEmpty(props.selectedItems) || !isEmpty(filteredIds)) {
      props.setSelectedItemsAction(filteredIds);
    }
  };

  /**
   * Handler for the zoom control buttons.
   * @param {(in | out | all)} value - The value returned by the zoom control button.
   */
  const handleZoomClick = useCallback((value) => {
    if (chartRef.current !== null) {
      if (value === 'in' || value === 'out') {
        chartRef.current.zoom(value);
      } else if (value === 'all') {
        chartRef.current.fit(value);
      }
    }
  }, []);

  const handleOnClearGraphClick = (): void => {
    props.openWarningModalAction(props.clearGraphWarningModalComponentId);
  };

  const handleOnResetGraphClick = (): void => {
    props.openWarningModalAction(props.resetGraphWarningModalComponentId);
  };

  const openContextMenu = ({ id, x: xClickPos, y: yClickPos }): void => {
    // If node or edge not clicked, return.
    if (isNil(id)) {
      return;
    }

    // If no context menu configuration, return.
    if (
      isEmpty(props.dataSpec?.nodeConfig?.contextMenuConfig) &&
      isEmpty(props.dataSpec?.edgeConfig?.contextMenuConfig)
    ) {
      return;
    }

    const nodeOrEdge = props.data[id];

    if (isNil(nodeOrEdge)) {
      return;
    }

    const dataSpecToUse = isNode(nodeOrEdge) ? 'nodeConfig' : 'edgeConfig';

    setContextMenu({
      x: xClickPos,
      y: yClickPos,
      visible: true,
      itemId: id,
      options: props.dataSpec?.[dataSpecToUse]?.contextMenuConfig,
      optionClick: (itemId, action) => {
        props.clickContextMenuItemAction(itemId, action);
        setContextMenu({ visible: false });
      },
    });
  };

  // Checks if we should render the tooltip.  If there are not any values to render, don't render the tooltip element.
  const shouldRenderTooltip = (): boolean =>
    tooltip && tooltip.x && tooltip.y && (tooltip.tooltipTitle || tooltip.tooltipSubtitle || tooltip.tooltipBody);

  /**
   * Abstracts the rendering of the graph, so we can have
   * some control over the rendering lifecycle. Also allows us
   * to more elegantly conditionally render the FontLoader wrapper.
   * @param {Props} props - The component props.
   * @param {Record<string, any>} filteredItemsToRender - The graph items
   * already converted to the format that the Chart component understands.
   * @returns {React.ReactElement} The chart React element.
   */
  const renderChart = (props: Props, filteredItemsToRender: Record<string, any>): React.ReactElement => {
    /*
     * We only want to add the layout and animation props on initial render, or
     * if the value of any of the props changes,
     * so that subsequent re-renders don't cause the graph node positions to shift.
     */
    if (!chartPropsRef.current.ref || chartPropsRef.current.layout?.name !== props.layout.name) {
      chartPropsRef.current.layout = {
        ...props.layout,
        level: props.layout?.level?.fieldName,
      };
    }

    var crs = Leaflet.CRS.EPSG3857;
    if (props.coordinateReferenceSystem == '4326') {
      crs = Leaflet.CRS.EPSG4326;
    } else if (props.coordinateReferenceSystem == '3395') {
      crs = Leaflet.CRS.EPSG3395;
    }

    if (!chartPropsRef.current.ref || chartPropsRef.current.animation?.animate !== props.animation?.animate) {
      chartPropsRef.current.animation = props.animation;
    }

    Object.assign(chartPropsRef.current, {
      ref: chartRef,
      animation: {
        animate: false,
      },
      combine: !isNil(props.combineConfig) && {
        properties: map(props.combineConfig?.combineProperties || {}, 'fieldName'),
        level: props.combineConfig?.combineLevel,
        shape: props.combineConfig?.combineShape,
      },
      items: filteredItemsToRender,
      selection: props.selectedItems,
      style: {
        position: 'absolute',
        height: '100%',
        width: '100%',
      },
      map: props.showMap,
      onChange: handleChartChange,
      onClick: handleChartClick,
      onCombineLinks: handleChartCombineLinks,
      onCombineNodes: handleChartCombineNodes,
      onContextMenu: openContextMenu,
      onDoubleClick: handleChartDoubleClick,
      onHover: handleChartHover,
      onItemInteraction: handleItemInteraction,
      options: {
        backgroundColor: props.backgroundColor,
        fit: props.fitOption,
        hoverDelay: 0,
        links: {
          endSpacing: props.endSpacing,
        },
        labels: {
          fontFamily: SDL_FONT_FAMILY,
          maxLength: 20,
        },
        map: {
          leaflet: {
            crs: crs,
          },
          tiles: {
            url: props.mapboxUrl,
          },
        },
        navigation: false,
        selection: {
          color: props.selectionConfig?.color,
          labelColor: props.selectionConfig?.labelColor,
        },
      },
    });

    return <Chart {...chartPropsRef.current} />;
  };

  const renderGraph = (props: Props, filteredItemsToRender: Record<string, any>): React.ReactElement => {
    return (
      <div className="c3-sdl-graph-visualization flex" style={{ height: props.height }}>
        <div
          className={classNames('c3-sdl-graph-visualization-loading', {
            hidden: !props.isDataLoading,
          })}
        >
          <UiSdlSpinner isDataLoading={props.isDataLoading} />
        </div>
        <div
          className="c3-sdl-graph-visualization-container"
          style={{
            height: props.timeBarConfig ? props.height - 100 : props.height,
          }}
        >
          {props.useFontLoader ? (
            <FontLoader config={{ custom: { families: ['Font Awesome 6 Pro'] } }}>
              {renderChart(props, filteredItemsToRender)}
            </FontLoader>
          ) : (
            renderChart(props, filteredItemsToRender)
          )}

          <UiSdlGraphVisualizationContextMenu {...contextMenu} />

          {shouldRenderTooltip() && <UiSdlGraphVisualizationTooltip tooltip={tooltip} />}
          <div className="c3-sdl-graph-visualization-controls-container">
            <div> {props.showZoomControls && <UiSdlGraphVisualizationZoomControls onClick={handleZoomClick} />} </div>
            <div>
              {props.resettable && (
                <UiSdlGraphVisualizationGraphAction
                  buttonText={translate({
                    key: 'SDL.UiSdlGraphVisualization.resetGraphText',
                  })}
                  onClick={handleOnResetGraphClick}
                />
              )}
            </div>
            <div>
              {props.clearable && (
                <UiSdlGraphVisualizationGraphAction
                  buttonText={translate({
                    key: 'SDL.UiSdlGraphVisualization.clearGraphText',
                  })}
                  onClick={handleOnClearGraphClick}
                />
              )}
            </div>
            <div>
              {props.resettable && !props.forceCanvasItemsInitialization && (
                <NestedComponent componentId={props.resetGraphWarningModalComponentId} />
              )}
            </div>
            <div>
              {props.clearable && !props.isClearingCanvasItems && (
                <NestedComponent componentId={props.clearGraphWarningModalComponentId} />
              )}
            </div>
          </div>
          {props.showLegend && props.nodeColorGroupings?.length > 0 && (
            <UiSdlGraphVisualizationLegend
              icon={props.legendConfig?.icon}
              items={props.nodeColorGroupings}
              maxLegendItems={props.legendConfig?.maxLegendItems}
              onNodeLegendClick={handleLegendNodeClick}
              hiddenNodes={props.hiddenNodes}
            />
          )}
        </div>
        <div className="c3-sdl-graph-visualization-time-bar-container flex">
          {props.timeBarConfig && (
            <>
              <TimeBar
                ref={timeBarRef}
                items={props.disableMergedEdges ? props.data : unmergedItems}
                style={{
                  height: TIME_BAR_HEIGHT,
                  flexGrow: 1,
                }}
                play={timeBarIsPlaying}
                mode={props.timeBarIsHistogram ? 'histogram' : 'smooth'}
                onChange={handleTimeBarChange}
                onDragStart={(): void => setTimebarIsDragging(true)}
                onDragEnd={(): void => setTimebarIsDragging(false)}
                onWheel={(): void => {
                  if (timebarIsDragging) {
                    resetUseTimeout();
                  } else {
                    setTimebarIsDragging(true);
                    resetUseTimeout();
                  }
                }}
                animation={props.timeBarAnimation}
                options={{
                  labels: {
                    fontFamily: SDL_FONT_FAMILY,
                    color: props.timeBarLabelColor,
                  },
                  style: {
                    color: props.timeBarColor,
                    hoverColor: props.timeBarHoverColor,
                  },
                  backgroundColor: props.timeBarBackgroundColor,
                  scale: {
                    hoverColor: props.timeBarScaleHoverColor,
                  },
                  stack: props.dataSpec?.timeBarStackConfig,
                  locale: {
                    longMonths: localeDateTimeFormatRef.current.longMonthNames,
                    shortMonths: localeDateTimeFormatRef.current.shortMonthNames,
                  },
                  playSpeed: timeBarPlaySpeed,
                }}
              />
              {props.timeBarConfig?.showTimeBarControls && (
                <UiSdlGraphVisualizationTimeBarControlBar
                  {...props.timeBarConfig?.controlsConfig}
                  isPlaying={timeBarIsPlaying}
                  onPlay={handleTimeBarPlay}
                  timeBarPan={handleTimeBarPan}
                  updatePlaySpeed={handleTimeBarSpeedChange}
                />
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  /**
   * Builds the Chart node representations of node clusters generated using Supercluster.
   */
  const getClusteredNodes = useCallback(() => {
    const clusterNodes: any[] = [];

    // Invert the keys and values for the color mapping being passed in.
    const colorMapping = {};
    if (!isEmpty(props.clusterConfig?.clusterDonutConfig?.colorMapping)) {
      for (const [key, value] of Object.entries(props.clusterConfig?.clusterDonutConfig?.colorMapping)) {
        colorMapping[value as string] = key;
      }
    }

    let updateClusters = clusters;

    if (props.superclusterRef && view?.mapZoom) {
      updateClusters = props.superclusterRef.getClusters(bboxRef.current, view.mapZoom);
    }

    updateClusters.forEach((cluster) => {
      // If the cluster flag is false, return the regular node object.
      if (!cluster.properties.cluster) {
        clusterNodes.push(cluster.properties);
      } else {
        const coordinates = cluster.geometry.coordinates;
        let children = props.superclusterRef.getLeaves(cluster.id, 'Infinity');

        // Clean the cluster and children of cluster from hiddenNodes
        children = children.filter((childNode: any) => !props?.hiddenNodes?.includes(childNode?.properties?.id));

        if (children.length === 0) {
          return;
        }

        if (children.length === 1) {
          const childNode = children[0];
          clusterNodes.push(childNode.properties);
          return;
        }

        const node = {
          id: `_clusternode_${cluster.id}`,
          coordinates: {
            lng: coordinates[0],
            lat: coordinates[1],
          },
          size: props.clusterConfig?.clusterSize || 1 + children.length * CLUSTER_NODE_SIZE_MULTIPLIER,
          data: {
            components: map(children, 'properties'),
          },
          color: new Color(props.clusterNodeFillColor).withAlpha(CLUSTER_NODE_FILL_COLOR_OPACITY).toString(),
          border: {
            color: props.clusterNodeOutlineColor,
            width: CLUSTER_NODE_BORDER_WIDTH,
          },
          label: {},
          donut: {},
          glyphs: [],
        };

        const donut = {
          border: { width: CLUSTER_NODE_DONUT_BORDER_WIDTH },
          width: CLUSTER_NODE_DONUT_WIDTH,
        };

        // Add cluster donut, if the configuration is passed through.
        if (props.clusterConfig?.clusterDonutConfig?.fieldName) {
          switch (props.clusterConfig?.clusterDonutConfig.donutType) {
            case 'percentage': {
              const average = (array): number => array.reduce((a, b) => a + b) / array.length;
              const percentage = average(cluster.properties.donutPropertyArray);
              node.donut = {
                ...donut,
                segments: [
                  {
                    color: props.clusterConfig?.clusterDonutConfig?.color,
                    size: percentage,
                  },
                  {
                    color: props.clusterNodeOutlineColor,
                    size: 100 - percentage,
                  },
                ],
              };

              const glyph = cloneDeep(props.nodeInfoGlyph);
              glyph.label.text = `${Math.round(percentage)}%`;
              node.glyphs = [glyph];
              break;
            }
            case 'segment': {
              // Get the unique counts for each categorical value specified at clusterDonutConfig.fieldName.
              const uniqueCounts = countBy(cluster.properties.donutPropertyArray);
              const segments = [];
              for (const [key, value] of Object.entries(uniqueCounts)) {
                /*
                 * If the colorMapping doesn't include the key for a categorical value, the Chart component default
                 * color value is applied.
                 */
                const color = colorMapping && colorMapping[key];
                segments.push({
                  color: color,
                  size: value,
                });
              }

              node.donut = {
                ...donut,
                segments: segments,
              };
              break;
            }
            default:
              throw new Error(`${UNKNOWN_DONUT_TYPE_MESSAGE}: ${props.clusterConfig?.clusterDonutConfig.donutType}`);
          }
        }

        // Add cluster count label, if applicable.
        if (props.clusterConfig?.showClusterCount ?? true) {
          node.label = {
            backgroundColor: 'transparent',
            bold: true,
            color: '#fff',
            fontFamily: SDL_FONT_FAMILY,
            center: true,
            text: children.length,
          };
        }

        clusterNodes.push(node);
      }
    });

    return keyBy(clusterNodes, 'id');
  }, [
    clusters,
    props.clusterConfig,
    props.clusterNodeFillColor,
    props.clusterNodeOutlineColor,
    props.nodeInfoGlyph,
    props.superclusterRef,
    props.hiddenNodes,
  ]);

  /**
   * Invoked whenever the range of the Time Bar changes.
   * @param {Record<string, any>} items - The items are currently in the visible range.
   * @param {Record<string, Date | number>} range - The currently visible time-range.
   * @param {Boolean} play - Defines if the change event was triggered by
   * a time bar animation play (only exists once on the first event)
   */
  const handleTimeBarChange = ({ items, range, play }): void => {
    if (!isNil(play) && play !== timeBarIsPlaying) {
      setTimeBarIsPlaying(!!play);
    }
    if (play) {
      setTimebarIsDragging(true);
      resetUseTimeout();
    }
    if (timebarIsDragging) {
      const inRangeEdgeIds = Object.keys(items || {});
      props.setTimeBarInRangeItemsAction(inRangeEdgeIds, range);
      resetUseTimeout();
    }
  };

  /**
   * Handle the click of the play button from the time bar controls.
   * This triggers an onChange event for the TimeBar component
   */
  const handleTimeBarPlay = useCallback(() => {
    setTimeBarIsPlaying((prevIsPlaying) => !prevIsPlaying);
  }, []);

  /**
   * Handle the click of the backward or forward button from the time bar controls
   * This will pan to the left or right the time bar and update the graph when
   * the pan finishes.
   * @param {string} type - If the pan is forward or backward
   * @param {number} duration - The time in milliseconds the pan will last
   */
  const handleTimeBarPan = useCallback(
    (type: string, duration: number): void => {
      // Do nothing if there is no time bar reference
      if (!timeBarRef.current) return;

      timeBarRef.current.pan(type, { time: duration });
    },
    [timeBarRef],
  );

  /**
   * Handle the update of the play speed selection. The speed will always be calculated
   * using 60 pixels per second as the base speed.
   * @param {number} speedMultiplier - The speed multiplier
   */
  const handleTimeBarSpeedChange = useCallback((speedMultiplier: number) => {
    setTimeBarPlaySpeed(TIME_BAR_BASE_SPEED * speedMultiplier);
  }, []);

  /**
   * Handle the click event on legend nodes
   * Will toggle nodes on the graph and trigger updateHiddenNodesAction
   * to update nodes ids in hiddenNodes array
   *
   * @param {NodeColorGroup} legend this contains the related ids of the node that is clicked
   */
  const handleLegendNodeClick = useCallback(
    (legend, _event) => props.updateHiddenNodesAction && props.updateHiddenNodesAction(legend.nodeIds),
    [props],
  );

  // Only the latest Nodes
  const canvasNodes = useMemo(() => {
    if (isNil(props.data)) {
      return {};
    }
    let latestNodes = {};
    for (const key in props.data) {
      if (props.data[key].latestNode && props.data[key].id != 'no-record-found') {
        latestNodes[key] = props.data[key];
      }
    }
    return latestNodes;
  }, [props.data]);

  // The items to be rendered on the chart.
  const itemsToRender = useMemo(() => {
    if (isNil(canvasNodes)) {
      return {};
    }

    /**
     * If cluster nodes is set true and the clusters have been loaded for the current map view,
     * construct and return the clustered nodes to be rendered on the canvas.
     */
    if (props.clusterConfig?.clusterNodes && !isEmpty(clusters)) {
      return getClusteredNodes();
    }

    // If the timebar is enabled and not in dimming mode, do not pass in outOfTimebarRange items into the chart.
    if (props.timeBarConfig && !props.timeBarIsDimmingMode) {
      return omitBy(props.data, (item) => item.outOfTimebarRange);
    } else {
      return canvasNodes;
    }
  }, [
    clusters,
    getClusteredNodes,
    props.data,
    props.clusterConfig,
    props.superclusterRef,
    props.hiddenNodes,
    canvasNodes,
  ]);

  // Hides the nodes that have been clicked from the legend nodes
  const hideNodesLegendsNodes = (itemsToRender: Record<string, any>, hiddenNodes: [string]) => {
    return omit(itemsToRender, hiddenNodes);
  };

  const filteredItemsToRender = useMemo(() => {
    return hideNodesLegendsNodes(itemsToRender, props.hiddenNodes);
  }, [itemsToRender, props.hiddenNodes, canvasNodes]);

  if (isNil(props.data) || props.forceCanvasItemsInitialization) {
    props.initializeCanvasItemsAction(props.data);
    props.setCacheKeyAction(props.cacheKey);
    props.setForceCanvasItemsInitializationAction(false);
  }

  /**
   * This property is used to determine whether the clear graph warning modal component should show up.
   * When this property is set to true, the clearing of canvas items is in progress, and we do not need
   * to show the modal component again.
   * Setting this property back to false will enable showing the modal component again after clicking on
   * an action button to clear graph.
   */
  if (props.isClearingCanvasItems) {
    props.setClearingCanvasItemsAction(false);
  }

  if (!UiSdlGraphVendorComponent) {
    return false;
  }

  const Chart = UiSdlGraphVendorComponent.Chart;
  const FontLoader = UiSdlGraphVendorComponent.FontLoader;
  const TimeBar = UiSdlGraphVendorComponent.TimeBar;

  return (
    <div>
      {displayEmptyState ? (
        React.isValidElement(props.emptyState) ? (
          props.emptyState
        ) : (
          <SDLEmptyState {...props.emptyState} />
        )
      ) : (
        renderGraph(props, filteredItemsToRender)
      )}
    </div>
  );
};

FedGraphVisualizationPresentationalComponent.propTypes = {
  /**
   * The background color of the graph.
   */
  backgroundColor: PropTypes.string,

  /**
   * The cache key of the whole in-memory graph.
   */
  cacheKey: PropTypes.string,

  /**
   * The default fit option for the graph when data load.
   */
  fitOption: PropTypes.oneOf(['auto', 'none', 'all', 'selection']),

  /**
   * The state value which determines what appears on the canvas, mapped to props.data.  This should be the
   * "source of truth" for what shows up on the canvas.  Actions/reducers should be used any time we are updating the
   * state of the canvas.
   */
  canvasItems: PropTypes.shape({
    /**
     * The edges/links in the graph.
     */
    edges: PropTypes.arrayOf(
      PropTypes.shape({
        /**
         * The original data of the edge.  The data here will be the fields that are accessed when dictating the
         * treatment of the visual properties on the graph.
         */
        data: PropTypes.object,

        /**
         * The id of the edge.
         */
        id: PropTypes.string,
      }),
    ),

    /**
     * The nodes in the graph.
     */
    nodes: PropTypes.arrayOf(
      PropTypes.shape({
        /**
         * The original data of the node.  The data here will be the fields that are accessed when dictating the
         * treatment of the visual properties on the graph.
         */
        data: PropTypes.object,

        /**
         * The id of the node.
         */
        id: PropTypes.string,
      }),
    ),
  }),

  /**
   * The modal to display warning on clear graph click.
   */
  clearGraphWarningModalComponentId: PropTypes.string,

  /**
   * Whether or not graph should be clearable.
   */
  clearable: PropTypes.bool,

  /**
   * Function (provided from the UiSdlGraphVisualization.c3typ if applicable) that will fire when a context menu item
   * is clicked.
   */
  clickContextMenuItemAction: PropTypes.func,

  /**
   * Function (provided from the UiSdlGraphVisualization.c3typ if applicable) that will fire when an edge is clicked.
   */
  clickEdgeAction: PropTypes.func,

  /**
   * Function (provided from the UiSdlGraphVisualization.c3typ if applicable) that will fire when an edge glyph is
   * clicked.
   */
  clickEdgeGlyphAction: PropTypes.func,

  /**
   * Function (provided from the UiSdlGraphVisualization.c3typ if applicable) that will fire when the graph is clicked.
   */
  clickGraphAction: PropTypes.func,

  /**
   * Function (provided from the UiSdlGraphVisualization.c3typ if applicable) that will fire when a node is clicked.
   */
  clickNodeAction: PropTypes.func,

  /**
   * Function (provided from the UiSdlGraphVisualization.c3typ if applicable) that will fire when a node glyph is
   * clicked.
   */
  clickNodeGlyphAction: PropTypes.func,

  /**
   * Function (provided from the UiSdlGraphVisualization.c3typ if applicable) that will fire when a GeoJson region is
   * clicked.
   */
  clickRegionAction: PropTypes.func,

  /**
   * The coordinate reference system identifier to use for the leaflet instance
   */
  coordinateReferenceSystem: PropTypes.string,

  /**
   * The configuration for clustering nodes within a certain pixel radius when props.showMap is true.
   */
  clusterConfig: PropTypes.shape({
    /**
     * The configuration to set a donut around a cluster node.
     */
    clusterDonutConfig: PropTypes.shape({
      /**
       * The color to use for the percentage segment when `donutType` is set to 'percentage'.
       */
      color: PropTypes.string,

      /**
       * The color mapping to use for each segment representing a categorical value when `donutType` is set to
       * 'segment'.
       */
      colorMapping: PropTypes.object,

      /**
       * The type of donut to be used around a cluster node.
       */
      donutType: PropTypes.oneOf(['percentage', 'segment']),

      /**
       * The field to get the donut property from.
       */
      fieldName: PropTypes.string,
    }),

    /**
     * Set to true to cluster nodes within a certain radius.
     */
    clusterNodes: PropTypes.bool,

    /**
     * The enlargement factor to scale node clusters by.
     */
    clusterSize: PropTypes.double,

    /**
     * The minimum number of nodes required within the same radius to form a cluster.
     */
    minNodes: PropTypes.number,

    /**
     * Cluster radius in pixels. All nodes within this radius are grouped into the same cluster.
     */
    radius: PropTypes.number,

    /**
     * When set to true, the cluster shows the number of nodes in the cluster.
     */
    showClusterCount: PropTypes.bool,
  }),

  /**
   * The configuration for showing the scale bar
   */
  scaleConfig: PropTypes.shape({
    /**
     * The position of the control (one of the map corners). Possible values are 'topleft', 'topright', 'bottomleft' or 'bottomright'.
     */
    position: PropTypes.string,

    /**
     * Maximum width of the control in pixels. The width is set dynamically to show round values (e.g. 100, 200, 500).
     */
    maxWidth: PropTypes.number,

    /**
     * Whether to show the metric scale line (m/km).
     */
    metric: PropTypes.bool,

    /**
     * Whether to show the imperial scale line (mi/ft).
     */
    imperial: PropTypes.bool,

    /**
     * If true, the control is updated on moveend, otherwise it's always up-to-date (updated on move).
     */
    updateWhenIdle: PropTypes.bool,
  }),

  /**
   * The fill color of a cluster node in map mode.
   */
  clusterNodeFillColor: PropTypes.string,

  /**
   * The outline color of a cluster node in map mode.
   */
  clusterNodeOutlineColor: PropTypes.string,

  /**
   * Whether or not to initial render the graph in a combined / grouped state.
   */
  collapseCombinedNodesOnLoad: PropTypes.bool,

  /**
   * Configuration for combining nodes (grouping).
   */
  combineConfig: PropTypes.shape({
    /**
     * Number of levels of grouping.
     */
    combineLevel: PropTypes.number,

    /**
     * The outline color for combine nodes.
     */
    combineOutlineColor: PropTypes.string,

    /**
     * The outline color when a combined node is selected.
     */
    combineOutlineColorWhenSelected: PropTypes.string,

    /**
     * Fields to group nodes by, ordered from lowest-level grouping to highest.
     */
    combineProperties: PropTypes.arrayOf(PropTypes.string),

    /**
     * The shape of a combined node.
     */
    combineShape: PropTypes.string,

    /**
     * The hex or rgb color for the summary links.
     */
    summaryLinkColor: PropTypes.string,

    /**
     * The line style of the summary links.
     */
    summaryLinkLineStyle: PropTypes.string,

    /**
     * The width of the summary link.
     */
    summaryLinkWidth: PropTypes.number,
  }),

  /**
   * The data for the graph.
   */
  data: PropTypes.shape({
    /**
     * The edges/links in the graph.
     */
    edges: PropTypes.arrayOf(
      PropTypes.shape({
        /**
         * The original data of the edge.  The data here will be the fields that are accessed when dictating the
         * treatment of the visual properties on the graph.
         */
        data: PropTypes.object,

        /**
         * The id of the edge.
         */
        id: PropTypes.string,
      }),
    ),

    /**
     * The nodes in the graph.
     */
    nodes: PropTypes.arrayOf(
      PropTypes.shape({
        /**
         * The original data of the node.  The data here will be the fields that are accessed when dictating the
         * treatment of the visual properties on the graph.
         */
        data: PropTypes.object,

        /**
         * The id of the node.
         */
        id: PropTypes.string,
      }),
    ),
  }),

  /**
   * The default fit option for the graph.
   */
  defaultFitOption: PropTypes.string,

  /**
   * When true, multiple edges between two nodes are not merged.
   */
  disableMergedEdges: PropTypes.bool,

  /**
   * Defaults to tight, loose will put a little space between the node and the edge.
   */
  endSpacing: PropTypes.oneOf(['tight', 'loose']),

  /**
   * Flag to force initialization of `canvasItems`.
   */
  forceCanvasItemsInitialization: PropTypes.bool,

  /**
   * The the data passed to Leaflet to display on the tile layer on the map.
   */
  geoJsonData: PropTypes.object,

  /**
   * The specification used for retrieving GeoJSON data passed on to Leaflet to be rendered in the tile layer.
   */
  geoJsonDataSpec: PropTypes.shape({
    /**
     * Property to control if shapes from the geoJSON can be highlighted on hover.
     */
    highlightable: PropTypes.bool,

    /**
     * Property to control if shapes from the geoJSON can be selected by the user.
     */
    selectable: PropTypes.bool,
  }),

  /**
   * The height of the graph container element.  The graph element itself will take up 100% of this height.
   */
  height: PropTypes.number,

  /**
   * Function (provided from the UiSdlGraphVisualization.c3typ if applicable) that will fire when an edge is no longer
   * hovered.
   */
  hoverOffEdgeAction: PropTypes.func,

  /**
   * Function (provided from the UiSdlGraphVisualization.c3typ if applicable) that will fire when a merged edge is no
   * longer hovered.
   */
  hoverOffMergedEdgeAction: PropTypes.func,

  /**
   * Function (provided from the UiSdlGraphVisualization.c3typ if applicable) that will fire when a node is no longer
   * hovered.
   */
  hoverOffNodeAction: PropTypes.func,

  /**
   * Function (provided from the UiSdlGraphVisualization.c3typ if applicable) that will fire when an edge is hovered.
   */
  hoverOnEdgeAction: PropTypes.func,

  /**
   * Function (provided from the UiSdlGraphVisualization.c3typ if applicable) that will fire when a merged edge is
   * hovered.
   */
  hoverOnMergedEdgeAction: PropTypes.func,

  /**
   * Function (provided from the UiSdlGraphVisualization.c3typ if applicable) that will fire when a node is hovered.
   */
  hoverOnNodeAction: PropTypes.func,

  /**
   * The id of the hovered edge (empty string if no edge hovered).
   */
  hoveredEdgeId: PropTypes.string,

  /**
   * The id of the hovered node (empty string if no node hovered).
   */
  hoveredNodeId: PropTypes.string,

  /**
   * Action dispatched to initialize the canvasItems state to what is passed as props.data.
   */
  initializeCanvasItemsAction: PropTypes.func,

  /**
   * Whether the clearing of canvas items is in progress.
   */
  isClearingCanvasItems: PropTypes.bool,

  /**
   * Holds the loading state of the graph.
   */
  isDataLoading: PropTypes.bool,

  /**
   * The layout configuration to use.
   */
  layout: PropTypes.shape({
    /**
     * The the data location.
     */
    level: PropTypes.shape({
      /**
       * The field to get the level from.
       */
      fieldName: PropTypes.string,
    }),

    /**
     * The layout name to apply.
     */
    name: PropTypes.oneOf(['organic', 'standard', 'structural', 'radial', 'lens', 'sequential', 'tweak']),

    /**
     * The orientation of sequential layouts.
     */
    orientation: PropTypes.oneOf(['down', 'right', 'up', 'left']),

    /**
     * The packing mode to arrange subgraphs. Not used by 'lens'.
     */
    packing: PropTypes.oneOf(['circle', 'rectangle']),

    /**
     * Controls how close nodes are spaced, with higher values making nodes closer. Ranges from 0-10.
     */
    tightness: PropTypes.number,
  }),

  /**
   * Canvas legend configuration.
   */
  legendConfig: PropTypes.shape({
    /**
     * Default icon to be displayed with the icon items.
     */
    icon: PropTypes.string,

    /**
     * The maximum number of legend items to show in the legend.
     */
    maxLegendItems: PropTypes.number,
  }),

  /**
   * The Mapbox URL loaded with the API token required for rendering Mapbox tiles.
   */
  mapboxUrl: PropTypes.string,

  /**
   * Merged edge configuration.
   */
  mergedEdgeConfig: PropTypes.shape({
    /**
     * Sets a flow animation on the link.
     */
    flow: PropTypes.bool,

    /**
     * Sets the velocity of the flow animation on an edge.
     * When specified, this overrides the "flow" setting.
     */
    flowVelocity: PropTypes.number,

    /**
     * The configuration for showing a glyph with the count of constituent edges of a merged edge.
     */
    showCountGlyphOnMergedEdges: PropTypes.bool,
  }),

  /**
   * The dictionary to store the mapping from an original edge id to its merged edge id.
   */
  mergedEdgesMapping: PropTypes.object,

  /**
   * The color grouping for the nodes based on category if `style.fillColorByProperty` is set to categorical type.
   */
  nodeColorGroupings: PropTypes.object,

  /**
   * The color grouping for the combined nodes.
   */
  nodeCombineColorGroupings: PropTypes.object,

  /**
   * The loaded glyph to display the number of nodes in a closed combo node.
   */
  nodeInfoGlyph: PropTypes.object,

  /**
   * Function (provided from the UiSdlGraphVisualization.c3typ if applicable) that will fire after the user clicks the
   * clear graph button.
   */
  openWarningModalAction: PropTypes.func,

  /**
   * The configuration for a temporarily animated halo effect to a node or a link, also known as a ping effect.
   */
  pingConfig: PropTypes.shape({
    /**
     * The color to use for the animated effect.
     */
    color: PropTypes.string,

    /**
     * The radius of a halo at the end of its animation.
     */
    haloRadius: PropTypes.number,

    /**
     * The width of a halo at the end of its animation.
     */
    haloWidth: PropTypes.number,

    /**
     * The width of a link at the end of its animation.
     */
    linkWidth: PropTypes.number,

    /**
     * The number of times the animation should be repeated.
     */
    repeat: PropTypes.number,

    /**
     * The time the animation should take, in milliseconds.
     */
    time: PropTypes.number,
  }),

  /**
   * An array of node or edge ids to temporary animate or ping.
   */
  pingItems: PropTypes.arrayOf(PropTypes.string),

  /**
   * Action dispatched to temporary animate or ping the given graph items.
   */
  pingItemsAction: PropTypes.func,

  /**
   * The style to apply to GeoJson region on hover.
   */
  regionHoverStyle: PropTypes.object,

  /**
   * The style to apply to GeoJson region on select.
   */
  regionSelectStyle: PropTypes.object,

  /**
   * The modal to display warning on reset graph button click.
   */
  resetGraphWarningModalComponentId: PropTypes.string,

  /**
   * Whether or not graph should be resettable.
   */
  resettable: PropTypes.bool,

  /**
   * The list of properties associated with the combined nodes listed in the reverse order
   * (from the lowest to highest granularity).
   */
  reversedCombineProperties: PropTypes.arrayOf(PropTypes.string),

  /**
   * The ids of selected edges.
   */
  selectedEdgeIds: PropTypes.arrayOf(PropTypes.string),

  /**
   * The dictionary with a truthy property for each selected item.
   */
  selectedItems: PropTypes.object,

  /**
   * The ids of selected nodes.
   */
  selectedNodeIds: PropTypes.arrayOf(PropTypes.string),

  /**
   * The configuration to control the appearance of selected items.
   */
  selectionConfig: PropTypes.shape({
    /**
     * The color of the selection indicator for items.
     */
    color: PropTypes.string,

    /**
     * Configuration to control if 1st degree neighbors of a node or an edge should be highlighted
     * when they are selected.
     */
    highlightNeighborsOnSelect: PropTypes.bool,

    /**
     * The font color of any labels on the selected item.
     */
    labelColor: PropTypes.string,

    /**
     * Options to control how node multi-selection affects 1st degree neighbor highlighting.
     */
    multiSelectionBehavior: PropTypes.oneOf(['union', 'intersection']),
  }),

  /**
   * Action dispatched to set cache key of the whole in-memory graph.
   */
  setCacheKeyAction: PropTypes.func,

  /**
   * Action dispatched to set flag whether the clearing of canvas items is in progress.
   */
  setClearingCanvasItemsAction: PropTypes.func,

  /**
   * Action dispatched to set flag to force initialization of `canvasItems`.
   */
  setForceCanvasItemsInitializationAction: PropTypes.func,

  /**
   * Action dispatched to set mergedEdgeMapping in the graph state.
   */
  setMergedEdgeMappingAction: PropTypes.func,

  /**
   * Action dispatched to set selected items in the graph.
   */
  setSelectedItemsAction: PropTypes.func,

  /**
   * Function (provided from the UiSdlGraphVisualization.c3typ if applicable) that will fire to set the items
   * that are included in the current time bar range.
   */
  setTimeBarInRangeItemsAction: PropTypes.func,

  /**
   * When true show the canvas legend.
   */
  showLegend: PropTypes.bool,

  /**
   * Set to true to enable map mode.
   */
  showMap: PropTypes.bool,

  /**
   * A loaded `Supercluster` instance to be used to determine node clusters when the graph is in map mode and
   * `props.clusterConfig.clusterNodes` is set to true.
   */
  superclusterRef: PropTypes.instanceOf(Supercluster),

  /**
   * Controls the timeBar's animation.
   */
  timeBarAnimation: PropTypes.shape({
    /**
     * Animates transitions between chart states.
     */
    animate: PropTypes.bool,

    /**
     * The total duration in milliseconds in which animations should run.
     * This time is shared between all animations on a particular update.
     */
    time: PropTypes.number,
  }),

  /**
   * The background color for the time bar.
   */
  timeBarBackgroundColor: PropTypes.string,

  /**
   * The color used for the bars of the time bar.
   */
  timeBarColor: PropTypes.string,

  /**
   * The configuration to control the appearance of the time bar.
   */
  timeBarConfig: PropTypes.shape({
    /**
     * When set to false, nodes without links are filtered out of the canvas; otherwise, disconnected nodes are still
     * displayed.
     */
    showDisconnectedNodes: PropTypes.bool,

    /**
     * When set to false, edges that do not have a timestamp are filtered out of the canvas; otherwise, non-temporal
     * edges are still displayed.
     */
    showNonTemporalData: PropTypes.bool,

    /**
     * When set to false, the controls for the time bar will not be visible
     */
    showTimeBarControls: PropTypes.bool,
  }),

  /**
   * The color when a bar in the time bar is hovered on by the user.
   */
  timeBarHoverColor: PropTypes.string,

  /**
   * The items in the currently visible time bar range.
   */
  timeBarInRangeItems: PropTypes.arrayOf(PropTypes.string),

  /**
   * Whether the time bar is in dimming mode or filtering mode.
   */
  timeBarIsDimmingMode: PropTypes.bool,

  /**
   * Whether the time bar should display a histogram.
   */
  timeBarIsHistogram: PropTypes.bool,

  /**
   * The color of the time bar scale section that is hovered over.
   */
  timeBarScaleHoverColor: PropTypes.string,

  /**
   * Update hidden nodes array when legend is clicked
   */
  updateHiddenNodesAction: PropTypes.func,

  /**
   * Whether to use FontLoader.
   */
  useFontLoader: PropTypes.bool,

  /**
   * Whether multiple links between 2 groups should be displayed as a single link.
   */
  useSummaryLinks: PropTypes.bool,

  /**
   * Whether or not the zoom control buttons should be displayed on this graph.
   */
  showZoomControls: PropTypes.bool,
};

FedGraphVisualizationPresentationalComponent.defaultProps = {
  backgroundColor: null,
  clearable: true,
  clearGraphWarningModalComponentId: 'SDL.UiSdlGraphVisualizationClearGraphWarningModal',
  clickContextMenuItemAction: emptyActionFunction,
  clickEdgeAction: emptyActionFunction,
  clickEdgeGlyphAction: emptyActionFunction,
  clickGraphAction: emptyActionFunction,
  clickNodeAction: emptyActionFunction,
  clickNodeGlyphAction: emptyActionFunction,
  clickRegionAction: emptyActionFunction,
  collapseCombinedNodesOnLoad: true,
  defaultFitOption: 'auto',
  endSpacing: 'tight',
  fitOption: 'auto',
  height: 650,
  hoverOffEdgeAction: emptyActionFunction,
  hoverOffMergedEdgeAction: emptyActionFunction,
  hoverOffNodeAction: emptyActionFunction,
  hoverOnEdgeAction: emptyActionFunction,
  hoverOnMergedEdgeAction: emptyActionFunction,
  hoverOnNodeAction: emptyActionFunction,
  hoveredEdgeId: null,
  hoveredNodeId: null,
  initializeCanvasItemsAction: emptyActionFunction,
  layout: {},
  openWarningModalAction: emptyActionFunction,
  pingItemsAction: emptyActionFunction,
  resettable: true,
  resetGraphWarningModalComponentId: 'SDL.UiSdlGraphVisualizationResetGraphWarningModal',
  searchField: 'name',
  selectedEdgeIds: [],
  selectedNodeIds: [],
  setCacheKeyAction: emptyActionFunction,
  setClearingCanvasItemsAction: emptyActionFunction,
  setForceCanvasItemsInitializationAction: emptyActionFunction,
  setMergedEdgeMappingAction: emptyActionFunction,
  setSelectedItemsAction: emptyActionFunction,
  setTimeBarInRangeItemsAction: emptyActionFunction,
  showLegend: true,
  useFontLoader: true,
  showZoomControls: true,
};

export { isNode };
export default FedGraphVisualizationPresentationalComponent;
