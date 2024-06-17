/*
 * Copyright 2009-2024 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

function configWithAccessToken() {
  var conf = this.config(true);
  var mapboxToken;
  try {
    mapboxToken = UiSdlMapbox.inst().getAccessToken();
  } catch (e) {
    mapboxToken = 'NOT_SET';
  }
  var coordinateReferenceSystem = conf.coordinateReferenceSystem || '3857';
  var graphVisualizationLightModeMapUrl =
    conf.graphVisualizationLightModeMapUrl ||
    'https://api.mapbox.com/styles/v1/mapbox/light-v10/tiles/{z}/{x}/{y}?access_token=${c3MapboxToken}';
  var graphVisualizationDarkModeMapUrl =
    conf.graphVisualizationDarkModeMapUrl ||
    'https://api.mapbox.com/styles/v1/mapbox/dark-v10/tiles/{z}/{x}/{y}?access_token=${c3MapboxToken}';
  var graphVisualizationSatelliteModeUrl =
    conf.graphVisualizationSatelliteModeUrl ||
    'https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=${c3MapboxToken}';

  graphVisualizationLightModeMapUrl.replace('${c3MapboxToken}', mapboxToken);
  graphVisualizationDarkModeMapUrl.replace('${c3MapboxToken}', mapboxToken);
  graphVisualizationSatelliteModeUrl.replace('${c3MapboxToken}', mapboxToken);

  conf.setConfigValue('coordinateReferenceSystem', coordinateReferenceSystem);
  conf.setConfigValue('graphVisualizationLightModeMapUrl', graphVisualizationLightModeMapUrl);
  conf.setConfigValue('graphVisualizationDarkModeMapUrl', graphVisualizationDarkModeMapUrl);
  conf.setConfigValue('graphVisualizationSatelliteModeUrl', graphVisualizationSatelliteModeUrl);
  return conf;
}
