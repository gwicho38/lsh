## Functions


```

\"/c3/genAiBase/src/agentsAndTools/Genai.Agent.QueryOrchestrator.py\", line 901, in run",
    "    return _run_single_hop(this, input, inProgressResult)",
    "  File \"/c3/genAiBase/src/agentsAndTools/Genai.Agent.QueryOrchestrator.py\", line 741, in _run_single_hop"


  File \"/c3/guruSearch/src/agentsAndTools/tools/Genai.TrackTool.py\", line 24, in run",
    "    res = c3.Genai.ApiTool.run(input, apiKit)",
    "  File \"/c3/guruSearch/src/agentsAndTools/tools/Genai.ApiTool.py\", line 322, in run",
    "    api = routeApi(query, apiKit)",
    "  File \"/c3/guruSearch/src/agentsAndTools/tools/Genai.ApiTool.py\", line 131, in routeApi",
    "    guidance = c3.Genai.Llm.Guide.defaultEvalToolGuide(modelConfigName=modelConfigName)",
    "  File \"/c3/platform/src/remote/ServerConnection.py\", line 2001, in funcForStayInRuntime",/

```

## Stacks
```json

[
   {
      "type":"Genai.TrackTool",
      "meta":{
         "type":"Meta",
         "deserSource":"meta://guruSearch/metadata/Genai.TrackTool/default.json"
      },
      "id":"TrackTool_default",
      "apiKit":{
         "type":"Genai.ApiKit",
         "id":"default_TrackToolApiKit"
      },
      "validColumns":{
         "type":"map<string, [string]>",
         "value":{
            "ais":{
               "type":"[string]",
               "value":[
                  "mmsi",
                  "ts",
                  "callSign",
                  "vesselFlag",
                  "lat",
                  "lon",
                  "speed",
                  "trueHeading",
                  "course",
                  "length",
                  "width",
                  "destination",
                  "origin"
               ]
            },
            "track":{
               "type":"[string]",
               "value":[
                  "id",
                  "lat",
                  "lon",
                  "ts",
                  "spd",
                  "alt",
                  "callSign",
                  "course",
                  "hdng",
                  "objNat",
                  "objPlat",
                  "errEllp",
                  "obTime"
               ]
            }
         }
      }
   },
   "What are the ship tracks from philippines on July 9th, 2023 between 4AM and 6AM?",
   {
      "type":"Genai.Query.Result",
      "id":"2d1fed6f-e554-4c40-a3ee-ba816074e136",
      "meta":{
         "type":"Meta",
         "created":"2024-01-29T19:09:56+00:00",
         "updated":"2024-01-29T19:09:56+00:00",
         "timestamp":"2024-01-29T19:09:56+00:00"
      },
      "version":1
   }
]

```

```javascript

[
    "Traceback (most recent call last):",
    "  File \"/c3/platform/src/typesys/type/MethodType.py\", line 109, in convertPositionalAndKeywordArgs",
    "    raise TypeError(f'`{this.toString()}` got an unexpected keyword argument \'{k}\'')",
    "TypeError: `defaultEvalToolGuide: function(generateTextKwargs: map<string, any>,",
    "         generateTokenKwargs: map<string, any>,",
    "         raiseErrorIfLogitBiasUsed: boolean): !native py-query_orchestrator` got an unexpected keyword argument 'modelConfigName'",
    "",
    "During handling of the above exception, another exception occurred:",
    "",
    "Traceback (most recent call last):",
    "  File \"/c3/genAiBase/src/agentsAndTools/Genai.Agent.QueryOrchestrator.py\", line 901, in run",
    "    return _run_single_hop(this, input, inProgressResult)",
    "  File \"/c3/genAiBase/src/agentsAndTools/Genai.Agent.QueryOrchestrator.py\", line 741, in _run_single_hop",
    "    tool_output = next_tool_dict['tool'].run(input, inProgressResult)",
    "  File \"/c3/platform/src/remote/ServerConnection.py\", line 2002, in funcForStayInRuntime",
    "  File \"/c3/platform/src/remote/ServerConnection.py-server.py\", line 583, in addToStackFrame",
    "  File \"/c3/platform/src/remote/ServerConnection.py\", line 2019, in inlineMethodWithErrorHandling",
    "  File \"/c3/guruSearch/src/agentsAndTools/tools/Genai.TrackTool.py\", line 24, in run",
    "    res = c3.Genai.ApiTool.run(input, apiKit)",
    "  File \"/c3/guruSearch/src/agentsAndTools/tools/Genai.ApiTool.py\", line 322, in run",
    "    api = routeApi(query, apiKit)",
    "  File \"/c3/guruSearch/src/agentsAndTools/tools/Genai.ApiTool.py\", line 131, in routeApi",
    "    guidance = c3.Genai.Llm.Guide.defaultEvalToolGuide(modelConfigName=modelConfigName)",
    "  File \"/c3/platform/src/remote/ServerConnection.py\", line 2001, in funcForStayInRuntime",
    "  File \"/c3/platform/src/typesys/type/MethodType.py\", line 116, in convertPositionalAndKeywordArgs",
    "    raise c3.Err.InvalidCall.invalidCall(this.toString(), str(e)).toNativeException()",
    "C3Error: Invalid call to defaultEvalToolGuide: function(generateTextKwargs: map<string, any>,",
    "         generateTokenKwargs: map<string, any>,",
    "         raiseErrorIfLogitBiasUsed: boolean): !native py-query_orchestrator: `defaultEvalToolGuide: function(generateTextKwargs: map<string, any>,",
    "         generateTokenKwargs: map<string, any>,",
    "         raiseErrorIfLogitBiasUsed: boolean): !native py-query_orchestrator` got an unexpected keyword argument 'modelConfigName'."
]


```