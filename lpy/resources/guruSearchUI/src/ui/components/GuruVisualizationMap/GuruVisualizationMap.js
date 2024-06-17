/*
 * Copyright 2009-2024 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

function generateUiComponent() {
  const uniqueColors = [
    '#617754',
    '#d66e2e',
    '#e2a84d',
    '#a7fe14',
    '#9a1339',
    '#860f68',
    '#e37ed1',
    '#4ef106',
    '#62223d',
    '#5f7e34',
    '#771904',
    '#fac258',
    '#ef8ec5',
    '#616f92',
    '#9ca8e9',
    '#6e7926',
    '#8a5dd4',
    '#5955c3',
    '#d49821',
    '#fda813',
    '#f94d1c',
    '#932966',
    '#0036d6',
    '#ea958a',
    '#96a960',
    '#ea7d4e',
    '#98714b',
    '#3d9fa4',
    '#7a72e1',
    '#9bcc0d',
    '#2d3415',
    '#88c9b5',
    '#4fa1b5',
    '#9e6d64',
    '#8ff13c',
    '#0c2d4e',
    '#75f15b',
    '#f07fbc',
    '#84336d',
    '#ef5ade',
    '#9e690d',
    '#6e662b',
    '#4201e1',
    '#c59907',
    '#061af2',
    '#1cb645',
    '#472fce',
    '#b00cac',
    '#ddf936',
    '#3c4266',
    '#fb435d',
    '#234c4f',
    '#2d6723',
    '#465a8a',
    '#cfbbce',
    '#a8030b',
    '#394db0',
    '#dde7d9',
    '#f07f1b',
    '#8e2a88',
    '#9f883f',
    '#c91d28',
    '#38ae98',
    '#f34f45',
    '#a5d5bc',
    '#cf6500',
    '#19121e',
    '#12b08b',
    '#0aba85',
    '#d0fdda',
    '#fc0065',
    '#7a72cc',
    '#9c376f',
    '#c563f7',
    '#840c0f',
    '#09d850',
    '#45860f',
    '#0c65e6',
    '#63113f',
    '#366836',
    '#f157a4',
    '#ebb88b',
    '#fbb1a6',
    '#4a27c0',
    '#c6348c',
    '#3ba953',
    '#4c20b1',
    '#668baf',
    '#69ac98',
    '#1608d2',
    '#5a0185',
    '#6307d5',
    '#435542',
    '#0494e2',
    '#04ad60',
    '#b6b75e',
    '#78e581',
    '#b0b300',
    '#aa1200',
    '#928900',
    '#b5b4fa',
    '#02ccf2',
    '#eb4cc9',
    '#bae293',
    '#f0c5dc',
    '#0c5f96',
    '#a07e36',
    '#c5bf0a',
    '#0551fe',
    '#ccd93d',
    '#f96e51',
    '#beb7f8',
    '#c1b08f',
    '#a9fcbb',
    '#17c448',
    '#40e18d',
    '#9d6f48',
    '#746526',
    '#3e5903',
    '#0fd10e',
    '#3341d9',
    '#e63382',
    '#325d49',
    '#b3d42a',
    '#c8e06b',
    '#069ece',
    '#588232',
    '#6d3a63',
    '#4720a2',
    '#d0af79',
    '#8f8c81',
    '#f79860',
    '#e3b660',
    '#bb351e',
    '#d7a15a',
    '#31104a',
    '#cc8065',
    '#0e32a7',
    '#5c227e',
    '#f233e4',
    '#d7ee68',
    '#90dd38',
    '#919f5f',
    '#5eff16',
    '#f539bb',
    '#4752ef',
    '#34b736',
    '#5b69df',
    '#e613c8',
    '#6e97d7',
    '#d69411',
    '#ee4777',
    '#2a56df',
    '#0cbfb3',
    '#bb89d8',
    '#16955d',
    '#9b69af',
    '#f512ed',
    '#3b6df4',
    '#7b9280',
    '#0a5a8c',
    '#ad4047',
    '#1b3799',
    '#fee7f9',
    '#45685e',
    '#1b4203',
    '#1f95c2',
    '#4c1e1a',
    '#cd6aea',
    '#e925a5',
    '#27c759',
    '#59e388',
    '#e29c80',
    '#a5851d',
    '#8fc3d1',
    '#12d5e9',
    '#08ae64',
    '#306ed6',
    '#54b38c',
    '#5076d0',
    '#a4316e',
    '#573ee8',
    '#f99899',
    '#37e670',
    '#33f6f7',
    '#c9d206',
    '#6b60e4',
    '#c61cba',
    '#91d625',
    '#bb6ac9',
    '#13ac86',
    '#bc05b9',
    '#7c9129',
    '#135bc3',
    '#92ef2f',
    '#7b1b63',
    '#7ca112',
    '#4ce332',
    '#3cb595',
    '#2dc82a',
  ];

  return {
    /**
     * Since the component is rendered by a UiSdlDynamicComponentRenderer an id is required BUT it must be different
     * in order for another query to be visualized.
     */
    id: Uuid.create(),
    type: 'UiSdlConnected<GuruUiSearchResultMap>',
    component: GuruUiSearchResultMap.make(
      Object.assign(
        {
          mapSpec: {
            wrapWithMetadataId: true,
            showMap: true,
            scaleConfig: {
              position: 'bottomleft',
              maxWidth: 100,
              metric: true,
              imperial: true,
              updateWhenIdle: false
            },
            showEdgesOnMap: true,
            clearable: false,
            resettable: false,
            height: 1000,
            dataSpec: {
              disableDataRequestOnFirstRender: true,
              nodeConfig: {
                tooltipConfig: {
                  tooltipBody: {
                    type: 'UiSdlFieldBasedDataSpecSetting',
                    fieldName: 'tooltipValue',
                  },
                },
                style: {
                  sizeByProperty: {
                    fieldName: 'size',
                  },
                  labelStyle: {
                    textLabelField: {
                      fieldName: 'callSign',
                    },
                    textCenter: false,
                    imageUrlByProperty: {
                      fieldName: 'icon',
                    },
                  },
                  fillColorByProperty: {
                    type: 'UiSdlGraphVisualizationFillColorByPropertyStrategyStepped',
                    fieldName: 'trackIdColor',
                    fillColorSteppedValues: [...Array(200).keys()],
                    fillColorSteppedColors: uniqueColors,
                  },
                },
                coordinatesConfig: {
                  latitude: {
                    fieldName: 'lat',
                  },
                  longitude: {
                    fieldName: 'lon',
                  },
                },
              },
              edgeConfig: {
                style: {
                  size: '5',
                  fillColorByProperty: {
                    type: 'UiSdlGraphVisualizationFillColorByPropertyStrategyStepped',
                    fieldName: 'trackIdColor',
                    fillColorSteppedValues: [...Array(200).keys()],
                    fillColorSteppedColors: uniqueColors,
                  },
                },
              },
            },
          },
        },
        this.getBaseComponentConfiguration(),
      ),
      true,
    ),
  };
}

function getBaseComponentConfiguration() {
  return Object.assign(
    {
      title: this.title,
      sourceType: this.sourceType,
      evalMetricsSpec: this.evalMetricsSpec,
      evalSpec: this.evalSpec,
    },
    convertDataForVisualization(this.data),
  );
}

function convertDataForVisualization(dataFrame) {
  var data = dataFrame && dataFrame.collect().toJson();
  return {
    data: data,
    columnNames: dataFrame && dataFrame.columnNames().toJson(),
  };
}

function getGraph(fileUrl) {
  file = C3.File.make(fileUrl);
  data = JSON.parse(file.readString());
  var nodes = [];
  var edges = [];
  var trackIdDict = {};

  for (let i = 0; i < data.length; i++) {
    let node = data[i];

    // Sort nodes into arrays by trackId
    var trackIdArray = trackIdDict[node.trackId];
    if (!trackIdArray) {
      trackIdDict[node.trackId] = [];
      trackIdArray = trackIdDict[node.trackId];
    }
    trackIdArray.push(node);
  }

  // Iterate through each array, creating edges
  var colorIterator = 0;
  for (const trackId in trackIdDict) {
    if (trackId !== 'Unknown') {
      var array = trackIdDict[trackId];

      // Sort array to ensure edges are created correctly
      array.sort((a, b) => a.order - b.order);

      // Set stylings and data for the nodes
      formattedArray = array.map((node, idx) => formatNode(node, idx, array.length - 1, colorIterator));

      // Duplicate the second to last node so that the trail falls directly under the icon
      if (array.length > 1) {
        var duplicateNode = array[array.length - 2];
        duplicateNode.lat = array[array.length - 1].lat;
        duplicateNode.lon = array[array.length - 1].lon;
        array.push(duplicateNode);
      }

      nodes.push(formattedArray[0]);

      for (var i = 1; i < formattedArray.length; i++) {
        var from = formattedArray[i - 1];
        var to = formattedArray[i];
        nodes.push(to);
        edges.push({
          id: from.id + to.id,
          from: {
            centroid: { latitude: from.lat, longitude: from.lon },
            id: from.id,
          },
          to: {
            centroid: { latitude: to.lat, longitude: to.lon },
            id: to.id,
          },
          relation: 'unidirectional',
          trackIdColor: colorIterator,
          trackId: from.trackId,
        });
      }
      colorIterator += 1;
      if (colorIterator % 200 == 0) {
        colorIterator = 0;
      }
    }
  }

  // Create dictionaries keyed by id for node and edge lists
  var nodeDict = nodes.reduce((dict, node) => {
    dict[node.id] = node;
    return dict;
  }, {});

  var edgeDict = edges.reduce((dict, edge) => {
    dict[edge.id] = edge;
    return dict;
  }, {});

  /*
   * Filter grid data columns, in order to reduce the number of columns presented in the grid.
   * We add 'trackId' and 'order' upstream, so we want to remove those columns here
   */
  var columnNames;
  if (data[0]) {
    columnNames = Object.keys(data[0]);
    columnNames = columnNames.filter((v) => v !== 'trackId' && v !== 'order');
  }

  // Return in expected format
  return {
    data: data,
    columnNames: columnNames,
    mapData: {
      nodes: nodeDict,
      edges: edgeDict,
    },
  };
}

function formatNode(node, idx, lastNodeIdx, colorIterator) {
  var formattedNode = Object.assign({}, node);

  // TODO: Make these configurable COR-793
  const validAffiliations = ['hostile', 'friend', 'unknown'];

  const validModes = ['air', 'sea', 'land', 'surface', 'subsurface', 'space', 'unknown'];

  const imageMap = {
    air: 'air',
    sea: 'sea',
    land: 'land',
    surface: 'sea',
    subsurface: 'sea',
    space: 'unknown',
    unknown: 'unknown',
  };

  // Create node for this data point
  var mode =
    node.env && node.env !== 'NaN' ? node.env?.toLowerCase().replace(/[^A-z]/g, '') : node.mmsi ? 'sea' : 'unknown';
  mode = validModes.includes(mode) ? mode : 'unknown';

  var affiliation =
    node.affiliation && node.affiliation !== 'NaN' ? node.affiliation?.toLowerCase().replace(/[^A-z]/g, '') : 'unknown';
  affiliation = validAffiliations.includes(affiliation) ? affiliation : 'unknown';

  var callSign = (String(node.callSign) || '').replace('NaN', 'Unknown') || 'Unknown';

  // If it's not the final node, then remove the icon and make it small
  if (idx != lastNodeIdx) {
    formattedNode.icon = undefined;
    formattedNode.size = 0.01;
    formattedNode.callSign = callSign;
    formattedNode.trackIdColor = colorIterator;
    formattedNode.lastNode = false;
    formattedNode.trackId = node.trackId;
  } else {
    // Round heading to the nearest 5 degrees if it exists
    var heading = isNaN(node.heading) ? undefined : Math.ceil(node.heading / 5) * 5;

    // Validate that it falls between 0 and 360
    heading = isNaN(heading) || heading < 0 || heading > 360 ? undefined : heading;
    formattedNode.icon = isNaN(heading)
      ? ['assets', 'icons', imageMap[mode] + '_' + affiliation + '.png'].join('/')
      : [
          'assets',
          'icons',
          imageMap[mode] + '_' + affiliation,
          imageMap[mode] + '_' + affiliation + '_' + heading + '.png',
        ].join('/');
    formattedNode.trackIdColor = '#000000FF';
    formattedNode.size = 1;
    formattedNode.callSign = callSign;
    formattedNode.lastNode = true;
    formattedNode.trackId = node.trackId;
  }

  formattedNode.tooltipValue = `Entity ID: ${callSign}
  Latitude: ${node.lat === 'NaN' ? 'Unknown' : node.lat.toFixed(2)}
  Longitude: ${node.lon === 'NaN' ? 'Unknown' : node.lon.toFixed(2)}
  Affiliation: ${affiliation.charAt(0).toUpperCase() + affiliation.slice(1)}
  ${node.ts === 'NaN' ? '' : 'Timestamp: ' + node.ts + '\n'}`;

  return formattedNode;
}
