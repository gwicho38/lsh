# Copyright 2009-2024 C3 AI (www.c3.ai). All Rights Reserved.
# This material, including without limitation any software, is the confidential trade secret and proprietary
# information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
# strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
# This material may be covered by one or more patents or pending patent applications.


# pylint: disable=locally-disabled, multiple-statements, fixme, line-too-long
def _generate_viz_spec_guru(df, thresh_int_as_cat=0, thresh_use_pie=0):
    import re
    from collections import Counter

    import numpy as np
    import pandas as pd

    logger.debug("The df passed to the choose chart tool".center(100, "-") + "\n\n" + df.head().to_string())
    
    # Return Image Grid Visualization if df contains image information
    # TODO: make imgsColumn configurable at api level
    imgsColumn = "thumbnail"
    if imgsColumn in df:
        return c3.GuruVisualizationImageGrid(
            title="Images"
        )
    
    trackFileCol = "trackFile"
    if trackFileCol in df:
        return c3.GuruVisualizationMap()

    # datatypes
    DATETIME = "datetime"
    NUM = "num"
    STR = "str"
    LAT = "lat"
    LON = "lon"
    ORDER = "order"
    lat_pattern = "([a-z](Lat|_lat))|^lat$|^latitude$"
    lon_pattern = "([a-z](Lon|Lng|_lon|_lng))|^lon$|^lng$|^longitude$"
    id_pattern = "([a-z]Id)|^id$"

    # identify all datatypes mannualy
    dtypes = df.convert_dtypes().dtypes.tolist()
    for i, dtype in enumerate(dtypes[:]):
        if not pd.api.types.is_numeric_dtype(dtype):
            # dates vs strings
            try:
                df[df.columns[i]] = pd.to_datetime(df[df.columns[i]])
                dtypes[i] = DATETIME
            except Exception as e:
                dtypes[i] = STR
        elif re.search(ORDER, df.columns[i]):
            dtypes[i] = ORDER
        elif re.search(lat_pattern, df.columns[i]):
            # latitudes
            dtypes[i] = LAT
        elif re.search(lon_pattern, df.columns[i]):
            # longitudes
            dtypes[i] = LON
        elif dtype == np.dtype("int64") or dtype == pd.Int64Dtype():
            # ints, could be considered categorical or numerical
            if len(df.iloc[:, 0].unique()) <= thresh_int_as_cat:
                df.iloc[:, 0] = df.iloc[:, 0].astype(str)
                dtypes[i] = STR
            else:
                dtypes[i] = NUM
        elif pd.api.types.is_numeric_dtype(dtype):
            dtypes[i] = NUM
        else:
            # default to str
            dtypes[i] = STR
    dtype_counter = Counter(dtypes)

    # map to plot
    # TODO GENAI-1008, GENAI-1010: bring back when Histogram and Pie Chart implemented
    # if len(dtypes) == 1:
    #     if dtypes[0] == NUM or dtypes[0] == DATETIME:
    #         # assume UI will handle number of bins in histogram
    #         # TODO GENAI-1008: Correctly instantiate when histogram implemented
    #         return c3.GenAiVisualizationHistogram()
    #     else:
    #         # TODO GENAI-1010 remove when histogram and pie chart are implemented
    #         return c3.GenAiVisualizationHistogram()
    #         vizType = c3.GenAiVisualizationHistogram
    #         if len(df.iloc[0].unique()) <= thresh_use_pie:
    #             vizType = c3.GenAiVisualizationPieChart
    #         return vizType(
    #             xAxis=df.columns[0]
    #         )
    if len(dtypes) >= 2:
        if (
            dtype_counter[LAT] == 1
            and dtype_counter[LON] == 1
            and df.iloc[:, dtypes.index(LON)].abs().max() <= 180
            and df.iloc[:, dtypes.index(LAT)].abs().max() <= 90
        ):
            return c3.GuruVisualizationMap()
        elif dtype_counter[DATETIME] == 1 and dtype_counter[NUM] >= 1:
            i_datetime_col = dtypes.index(DATETIME)
            numeric_cols = [df.columns[i] for i, dtype in enumerate(dtypes) if dtype == NUM]

            # With multiple subjects in a single metric, we need to group by the categorical column
            # We do this when there is only one column with "string" data, which we consider the categorical column,
            # and only one column with "numeric" data, which we consider the single metric column
            is_single_metric = len(numeric_cols) == 1
            categorical_column = df.columns[dtypes.index(STR)] if is_single_metric and dtype_counter[STR] == 1 else None

            return c3.GenAiVisualizationLineChart(
                xAxis=df.columns[i_datetime_col],
                groups=numeric_cols,
                yAxes=[numeric_cols[0]],  # currently only support single metric on a single measurementSeries
                groupBy=categorical_column,
            )
        elif dtype_counter[NUM] >= 2:
            numeric_cols = [df.columns[i] for i, dtype in enumerate(dtypes) if dtype == NUM]
            x_axis_col = numeric_cols[0]
            y_axis_col = numeric_cols[1]
            size_col = numeric_cols[2] if len(numeric_cols) > 2 else ""
            group_col = df.columns[dtypes.index(STR)] if dtype_counter[STR] else ""
            return c3.GenAiVisualizationScatterPlot(
                xAxis=x_axis_col,
                yAxes=[y_axis_col],
                bubbleSizeBy=size_col,
                groupBy=group_col,
            )
    if len(dtypes) == 2:
        if dtype_counter[STR] == 1 and dtype_counter[NUM] == 1:
            i_column_str = dtypes.index(STR)
            i_column_num = dtypes.index(NUM)

            # vizType = c3.GenAiVisualizationBoxPlot DNE yet
            if len(df.iloc[:, i_column_str].drop_duplicates()) == len(df):
                vizType = c3.GenAiVisualizationBarChart
                return vizType(xAxis=df.columns[i_column_str], yAxes=[df.columns[i_column_num]])
        # multi-bar type DNE
        # elif dtype_counter[STR] == 2:
        #     # here we can also return array of both combinations of orientations
        #     cardinalities = [len(df[col].unique()) for col in df]
        #     i_min_cardinality = min(
        #         range(2), key=lambda i: cardinalities[i])
        #     return c3.GenAiVisualizationMultiBarChart(
        #         firstAxis=df.columns[i_min_cardinality],
        #         secondAxis=df.columns[(i_min_cardinality + 1) % 2],
        #     )
    return c3.GenAiVisualizationGrid()


def forData(cls, data, structuredQuerySpec=None):
    if structuredQuerySpec is not None:
        logger.debug(f"forData: {structuredQuerySpec.toJsonString()}, {type(structuredQuerySpec.spec)}")
    else:
        logger.debug("forData: structuredQuerySpec is None")
    df = data.to_pandas()
    if len(df) == 0:
        return None
    visualization = _generate_viz_spec_guru(df)

    # pass data by spec whenever possible
    if structuredQuerySpec is not None and structuredQuerySpec.sourceType is not None:
        visualization = visualization.withSourceType(structuredQuerySpec.sourceType.name())
        if isinstance(structuredQuerySpec.spec, c3.EvalMetricsSpec):
            logger.debug("Using eval metrics spec to generate visualization by spec")
            visualization = visualization.withEvalMetricsSpec(structuredQuerySpec.spec)
        elif isinstance(structuredQuerySpec.spec, c3.EvalSpec):
            logger.debug("Using eval spec to generate visualization by spec")
            visualization = visualization.withEvalSpec(structuredQuerySpec.spec)
        else:
            logger.debug("Fall back to passing data")
            visualization = visualization.withData(data)
    else:
        logger.debug("Fall back to passing data")
        visualization = visualization.withData(data)

    return visualization.setVisualizationConfiguration()
