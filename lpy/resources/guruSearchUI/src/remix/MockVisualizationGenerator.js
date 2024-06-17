/*
 * Copyright 2009-2024 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

function getMockVisualizationKind(query) {
  var packageSpecificVisualization = MockVisualizationGenerator.getPackageSpecificMockVisualizationKind(query);
  if (packageSpecificVisualization) {
    return packageSpecificVisualization;
  }

  if (query.includes('grid')) {
    if (query.includes('one')) {
      return MockVisualizationKind.GRID_ONE_ROW;
    }
    return MockVisualizationKind.GRID;
  } else if (query.includes('imgs')) {
    return MockVisualizationKind.IMG_GRID;
  } else if (query.includes('map')) {
    return MockVisualizationKind.MAP;
  } else if (query.includes('bar')) {
    if (query.includes('multi')) {
      return MockVisualizationKind.BAR_MULTIPLE_YAXES;
    }
    return MockVisualizationKind.BAR;
  } else if (query.includes('line')) {
    if (query.includes('null')) {
      return MockVisualizationKind.LINE_NULL;
    } else if (query.includes('multi')) {
      return MockVisualizationKind.LINE_MULTIPLE_YAXES;
    } else if (query.includes('groupby') || query.includes('group by')) {
      return MockVisualizationKind.LINE_GROUP_BY;
    } else if (query.includes('basic')) {
      return MockVisualizationKind.LINE_BASIC;
    }
    return MockVisualizationKind.LINE_GROUPS;
  } else if (query.includes('scatter')) {
    if (query.includes('basic')) {
      return MockVisualizationKind.SCATTER_BASIC;
    } else if (query.includes('null')) {
      return MockVisualizationKind.SCATTER_NULL;
    } else if (query.includes('multi')) {
      return MockVisualizationKind.SCATTER_MULTIPLE_YAXES;
    } else if (query.includes('bubble')) {
      return MockVisualizationKind.SCATTER_BUBBLE_SIZE_BY;
    } else if (query.includes('groupby') || query.includes('group by')) {
      return MockVisualizationKind.SCATTER_GROUP_BY;
    } else if (query.includes('small')) {
      return MockVisualizationKind.SCATTER_SMALL;
    }

    return MockVisualizationKind.SCATTER_LARGE;
  }

  return MockVisualizationKind.RANDOM;
}

function generateVisualization(chartType) {
  var method;
  var vizTypeToMethodMap = {};
  vizTypeToMethodMap[MockVisualizationKind.BAR] = 'generateBarChart';
  vizTypeToMethodMap[MockVisualizationKind.BAR_MULTIPLE_YAXES] = 'generateBarChartWithMultipleAxes';
  vizTypeToMethodMap[MockVisualizationKind.LINE_BASIC] = 'generateLineChart';
  vizTypeToMethodMap[MockVisualizationKind.LINE_GROUPS] = 'generateLineChartWithGroups';
  vizTypeToMethodMap[MockVisualizationKind.LINE_GROUP_BY] = 'generateLineChartWithGroupBy';
  vizTypeToMethodMap[MockVisualizationKind.LINE_NULL] = 'generateLineChartNullGroupBy';
  vizTypeToMethodMap[MockVisualizationKind.LINE_MULTIPLE_YAXES] = 'generateLineChartWithMultipleAxes';
  vizTypeToMethodMap[MockVisualizationKind.GRID] = 'generateGrid';
  vizTypeToMethodMap[MockVisualizationKind.GRID_ONE_ROW] = 'generateGridOneRowOfData';
  vizTypeToMethodMap[MockVisualizationKind.MAP] = 'generateMap';
  vizTypeToMethodMap[MockVisualizationKind.IMG_GRID] = 'generateImgs';
  vizTypeToMethodMap[MockVisualizationKind.SCATTER_BASIC] = 'generateScatterPlotBasic';
  vizTypeToMethodMap[MockVisualizationKind.SCATTER_BUBBLE_SIZE_BY] = 'generateScatterPlotBubbleSizeBy';
  vizTypeToMethodMap[MockVisualizationKind.SCATTER_GROUP_BY] = 'generateScatterPlotGroupBy';
  vizTypeToMethodMap[MockVisualizationKind.SCATTER_LARGE] = 'generateScatterPlotLarge';
  vizTypeToMethodMap[MockVisualizationKind.SCATTER_NULL] = 'generateScatterPlotNullGroupBy';
  vizTypeToMethodMap[MockVisualizationKind.SCATTER_MULTIPLE_YAXES] = 'generateScatterPlotWithMultipleAxes';
  vizTypeToMethodMap[MockVisualizationKind.SCATTER_SMALL] = 'generateScatterPlotSmall';
  vizTypeToMethodMap = Object.assign(
    {},
    vizTypeToMethodMap,
    MockVisualizationGenerator.packageSpecificVizTypeMethods(),
  );

  if (chartType === MockVisualizationKind.RANDOM) {
    var chartTypes = Object.keys(vizTypeToMethodMap);
    var randomChartType = chartTypes[parseInt(chartTypes.length * Math.random(), 0)];
    method = vizTypeToMethodMap[randomChartType];
  } else {
    method = vizTypeToMethodMap[chartType];
  }

  return MockVisualizationGenerator[method]();
}

function generateMap() {
  var data = [
    {
      mmsi: 'air',
      lon: -10,
      errellp: '[50.0, 50.0, 0.0]',
      alt: 12.43653285206904,
      spd: 12.96388471581504,
      id: '7c80995a-f07d-48a1-8ae1-ff8f1cc7f4fa',
      ts: '2023-09-20 05:01:05.430',
      lat: -3,
      callSign: 'DONG YU 1530 84%',
      heading: 25.362035225,
      order: 2.0,
      trackId: 'DONG YU 1530',
      affiliation: 'HOSTILE',
    },
    {
      mmsi: 'sea',
      lon: 8,
      errellp: '[50.0, 50.0, 0.0]',
      alt: 12.43653285206904,
      spd: 12.96388471581504,
      id: '138b13c6-2716-4364-a9f8-965c817ef069',
      ts: '2023-09-20 04:59:14.260',
      lat: -13,
      callSign: 'DONG YU 1530 84%',
      heading: 25.362035225,
      order: 1.0,
      trackId: 'DONG YU 1530',
      affiliation: 'HOSTILE',
    },
    {
      env: 'air',
      lon: -41.5527756443,
      errellp: '[50.0, 50.0, 0.0]',
      alt: 2.534319982998237,
      spd: 12.96388471581504,
      id: '60464ecb-80c6-48d4-b96f-36fb3319e2bf',
      ts: '2023-09-20 03:20:29.210',
      lat: 5.3076979567,
      callSign: 'ABCDE 86%',
      heading: 25.362035225,
      order: 6.0,
      trackId: 'ABCDE',
      affiliation: 'FRIEND',
    },
    {
      env: 'air',
      lon: -65.5527756443,
      errellp: '[50.0, 50.0, 0.0]',
      alt: 2.534319982998237,
      spd: 12.96388471581504,
      id: '21b991fa-b211-4612-b069-43a432488909',
      ts: '2023-09-20 03:22:29.330',
      lat: -45.3076979567,
      callSign: 'ABCDE 86%',
      heading: 25.362035225,
      order: 8.0,
      trackId: 'ABCDE',
      affiliation: 'FRIEND',
    },
    {
      env: 'air',
      lon: -37.5527756443,
      errellp: '[50.0, 50.0, 0.0]',
      alt: 2.534319982998237,
      spd: 12.96388471581504,
      id: '3a3638c1-bd99-4cdf-9ffb-086b30b80da7',
      ts: '2023-09-20 03:19:29.140',
      lat: -7.3076979567,
      callSign: 'ABCDE 86%',
      heading: 80.362035225,
      order: 5.0,
      trackId: 'ABCDE',
      affiliation: 'FRIEND',
    },
    {
      env: 'air',
      lon: -58.5527756443,
      errellp: '[50.0, 50.0, 0.0]',
      alt: 2.534319982998237,
      spd: 12.96388471581504,
      id: '315bb138-29ef-4299-97cf-ebbfe23cada3',
      ts: '2023-09-20 03:21:29.270',
      lat: 3.3076979567,
      callSign: 'ABCDE 86%',
      heading: 25.362035225,
      order: 7.0,
      trackId: 'ABCDE',
      affiliation: 'FRIEND',
    },
    {
      env: 'air',
      lon: -36.5368903646,
      errellp: '[50.0, 50.0, 0.0]',
      alt: 6.475092616902957,
      spd: 12.96388471581504,
      id: '433eb434-4ae7-4c9f-ba9a-d424ce13fbdc',
      ts: '2023-09-20 02:39:06.180',
      lat: 50.3059186153,
      callSign: 'ABCDE 64%',
      heading: 25.362035225,
      order: 2.0,
      trackId: 'ABCDE',
      affiliation: 'FRIEND',
    },
    {
      env: 'air',
      lon: -66.5368903646,
      errellp: '[50.0, 50.0, 0.0]',
      alt: 6.475092616902957,
      spd: 12.96388471581504,
      id: '5f9a0c70-10e7-47f2-a6ec-4c45a4fb12e3',
      ts: '2023-09-20 02:40:06.220',
      lat: 55.3059186153,
      callSign: 'ABCDE 64%',
      heading: 25.362035225,
      order: 3.0,
      trackId: 'ABCDE',
      affiliation: 'FRIEND',
    },
    {
      env: 'air',
      lon: -58.5368903646,
      errellp: '[50.0, 50.0, 0.0]',
      alt: 6.475092616902957,
      spd: 12.96388471581504,
      id: '8bdf3ebe-7b49-4968-a39b-bb551732dcdc',
      ts: '2023-09-20 02:38:13.730',
      lat: 42.3059186153,
      callSign: 'ABCDE 64%',
      heading: 25.362035225,
      order: 1.0,
      trackId: 'ABCDE',
      affiliation: 'FRIEND',
    },
    {
      env: 'air',
      lon: -85.5368903646,
      errellp: '[50.0, 50.0, 0.0]',
      alt: 6.475092616902957,
      spd: 12.96388471581504,
      id: '26496d7b-235a-4325-a6fb-feaf93f759a5',
      ts: '2023-09-20 02:41:06.260',
      lat: 33.3059186153,
      callSign: 'ABCDE 64%',
      heading: 25.362035225,
      order: 4.0,
      trackId: 'ABCDE',
      affiliation: 'FRIEND',
    },
    {
      env: 'air',
      lon: 47.7781397059,
      errellp: '[1000.0, 1000.0, 0.0]',
      alt: 9.090667861301364,
      spd: 'NaN',
      id: 'c4dbebb8-8535-424d-a590-627ba7de5618',
      ts: '2023-09-20 00:02:26.000',
      lat: 61.2486042929,
      callSign: '1699966309',
      order: 1.0,
      trackId: '1699966309',
      affiliation: 'UNKNOWN',
    },
    {
      env: 'air',
      lon: -21.9756004487,
      errellp: '[1000.0, 1000.0, 0.0]',
      alt: 3.124127094772064,
      spd: 'NaN',
      id: '67223d80-2392-4461-b1a2-1a39459c276f',
      ts: '2023-09-20 16:07:54.650',
      lat: 73.7029862533,
      callSign: '1852376088',
      heading: 0.0,
      order: 1.0,
      trackId: '',
      affiliation: 'UNKNOWN',
    },
    {
      env: 'unknown',
      lon: 98.64860879,
      errellp: '[1000.0, 1000.0, 0.0]',
      alt: 3.5573413762349206,
      spd: 'NaN',
      id: '07a8a633-fa55-4550-9ab3-87435855de30',
      ts: '2023-09-20 15:39:26.000',
      lat: 65.4459511693,
      callSign: '1920216892',
      heading: 0.0,
      order: 1.0,
      trackId: '1920216892',
      affiliation: 'UNKNOWN',
    },
    {
      env: 'land',
      lon: 78.1903641102,
      errellp: '[1000.0, 1000.0, 0.0]',
      alt: 4.561159888957112,
      spd: 'NaN',
      id: '267e2deb-3fc1-48c1-9972-ab63395da816',
      ts: '2023-09-20 17:06:42.000',
      lat: 6.7515073738,
      callSign: '1349215073',
      heading: 0.0,
      order: 4.0,
      trackId: '1349215073',
      affiliation: 'SUSPECT',
    },
    {
      env: 'land',
      lon: 88.1903641102,
      errellp: '[1000.0, 1000.0, 0.0]',
      alt: 4.561159888957112,
      spd: 'NaN',
      id: '5db1e59d-c276-4a59-a9a7-d2a894d985a8',
      ts: '2023-09-20 15:10:41.000',
      lat: 8.7515073738,
      callSign: '1349215073',
      heading: 0.0,
      order: 1.0,
      trackId: '1349215073',
      affiliation: 'SUSPECT',
    },
    {
      env: 'land',
      lon: 79.1903641102,
      errellp: '[1000.0, 1000.0, 0.0]',
      alt: 4.561159888957112,
      spd: 'NaN',
      id: 'bd11cdaf-f92a-41b7-8eaf-b7a14211e0dc',
      ts: '2023-09-20 16:13:23.000',
      lat: 17.7515073738,
      callSign: '1349215073',
      heading: 0.0,
      order: 3.0,
      trackId: '1349215073',
      affiliation: 'SUSPECT',
    },
    {
      env: 'land',
      lon: 85.1903641102,
      errellp: '[1000.0, 1000.0, 0.0]',
      alt: 4.561159888957112,
      spd: 'NaN',
      id: '478341f4-eca3-406c-804b-9a5a02665b0d',
      ts: '2023-09-20 16:07:31.000',
      lat: 33.7515073738,
      callSign: '1349215073',
      heading: 0.0,
      order: 2.0,
      trackId: '1349215073',
      affiliation: 'SUSPECT',
    },
  ];

  // If the mount doesn't exist yet, create it
  if (!FileSystem.inst().mounts().get('trackFiles')) {
    FileSystem.inst().setMount('trackFiles', FileSystem.inst().rootUrl() + 'trackFiles/');
  }

  // Mock file is always expected to me be located here
  const url = FileSystem.inst().mounts().get('trackFiles') + 'mockTrackFile.json';

  // If the file doesn't exist yet, create it
  if (!FileSystem.makeFile(url).exists()) {
    C3.File.createFile(url).writeString(JSON.stringify(data));
  }

  data = [{ trackFile: url }];

  return GuruVisualizationMap.make({
    title: 'TEST_MAP',
    data: Data.dataFrame(data),
  }).setVisualizationConfiguration();
}

function generateImgs() {
  var data = [
    {
      thumbnail: '/assets/images/mockImgGrid.jpg',
      imageName: 'test_img_1',
      imageUrl: '/assets/images/mockImgGrid.jpg',
      rating: 1,
      cloudCover: 50,
      ts: '2024-01-01 17:06:42.000',
    },
    {
      thumbnail: '/assets/images/mockImgGrid.jpg',
      imageName: 'test_img_2',
      imageUrl: '/assets/images/mockImgGrid.jpg',
      rating: 2,
      cloudCover: 60,
      ts: '2024-01-10 17:06:42.000',
    },
    {
      thumbnail: '/assets/images/mockImgGrid.jpg',
      imageName: 'test_img_3',
      imageUrl: '/assets/images/mockImgGrid.jpg',
      rating: 3,
      cloudCover: 40,
      ts: '2024-01-20 17:06:42.000',
    },
    {
      thumbnail: '/assets/images/mockImgGrid.jpg',
      imageName: 'test_img_4',
      imageUrl: '/assets/images/mockImgGrid.jpg',
      rating: 4,
      cloudCover: 5,
      ts: '2024-01-30 17:06:42.000',
    },
    {
      thumbnail: '/assets/images/mockImgGrid.jpg',
      imageName: 'test_img_5',
      imageUrl: '/assets/images/mockImgGrid.jpg',
      rating: 5,
      cloudCover: 100,
      ts: '2024-02-01 17:06:42.000',
    },
    {
      thumbnail: '/assets/images/mockImgGrid.jpg',
      imageName: 'test_img_6',
      imageUrl: '/assets/images/mockImgGrid.jpg',
      rating: 6,
      ts: '2024-02-15 17:06:42.000',
    },
    {
      thumbnail: '/assets/images/mockImgGrid.jpg',
      imageName: 'test_img_7',
      imageUrl: '/assets/images/mockImgGrid.jpg',
      rating: 1,
    },
    {
      thumbnail: '/assets/images/mockImgGrid.jpg',
      imageName: 'test_img_8',
      imageUrl: '/assets/images/mockImgGrid.jpg',
    },
  ];

  return GuruVisualizationImageGrid.make({
    data: Data.dataFrame(data),

    // "height": 650,
  }).setVisualizationConfiguration();
}
