// get all configs from target

import axios, { AxiosResponse } from "axios";
import AsyncLock from "async-lock";
import { c3, C3 } from "c3";
import path from "path";
import { Genai }  from "../../../../declarations/Genai";

const semaphore = new AsyncLock();

export const exec = async (
  typeName: any,
  method: any,
  data?: any,
  onSuccess?: (arg0: any) => void,
  endpoint?: string,
  token?: string
) => {
  const url = `/api/8/${typeName}/${method}`;
  try {
    // Prevent parallel writes/deletions
    return semaphore.acquire("request", async (done) => {
      try {
        const response: AxiosResponse = await axios.post(url, data);
        onSuccess?.(response.data);
        return response?.data;
      } catch (error) {
        console.error(error);
      } finally {
        done();
      }
    });
  } catch (e: any) {
    console.error(`Error running function ${typeName}.${method}`);
    return null;
  }
};
function getRetrieverInfo(fromEnv: any) {
  Genai.
  var colbertRetrievers = Genai.Retriever.ColBERT.fetch().objs;

  return {
    colbertRetrievers: colbertRetrievers,
    colbertDataConfigs: colbertRetrievers.map((retriever: { name: any }) => {
      Genai.Retriever.ColBERT.DataConfig.forConfigKey(retriever.name);
    }),
    sourceCollections: Genai.SourceCollection.fetch().objs,
    chunkerConfig: Genai.SourceFile.Chunker.UniversalChunker.Config.inst(),
  };
}

// get all configs from ref and set them on target
function setRetrieverInfo(fromEnv: any, toEnv: any) {
  var colbertRetrievers = Genai.Retriever.ColBERT.fetch().objs;
  return {
    colbertRetrievers: colbertRetrievers,
    colbertDataConfigs: colbertRetrievers.map((retriever: { name: any }) =>
      Genai.Retriever.ColBERT.DataConfig.forConfigKey(retriever.name)
    ),
    sourceCollections: Genai.SourceCollection.fetch().objs,
    chunkerConfig: Genai.SourceFile.Chunker.UniversalChunker.Config.inst(),
  };
}

function getQueryConfigs(fromEnv: any) {
  return {
    queryEngineConfigs: getQueryEngineConfigs(fromEnv),
    // 'reaConfigs': reaConfigs(),
    structuredDataConfigs: structuredDataConfigs(fromEnv),
  };
}

function setQueryConfigs(fromEnv: any) {
  return {
    queryEngineConfigs: getQueryEngineConfigs(fromEnv, toEnv),
    // 'reaConfigs': reaConfigs(),
    structuredDataConfigs: structuredDataConfigs(fromEnv, toEnv),
  };
}

function getQueryEngineConfigs(fromEnv: any) {
  var engineConfig = Genai.UnstructuredQuery.Engine.Config.inst();
  return {
    queryEngineConfig: engineConfig,
    modelConfig: queryEngineModelConfig(engineConfig.modelConfigName),
    extractionModelConfig: queryEngineModelConfig(
      engineConfig.extractionModelConfigName
    ),
    questionRewritingModelConfig: queryEngineModelConfig(
      engineConfig.questionRewritingModelConfigName
    ),
    promptConfig: Genai.ConfigUtil.queryOrchestratorPromptConfig(
      "QueryOrchestrator_default"
    ),
  };
}

function setQueryEngineConfigs(fromEnv: any, toEnv: any) {
  var engineConfig = Genai.UnstructuredQuery.Engine.Config.inst();
  return {
    queryEngineConfig: engineConfig,
    modelConfig: queryEngineModelConfig(engineConfig.modelConfigName),
    extractionModelConfig: queryEngineModelConfig(
      engineConfig.extractionModelConfigName
    ),
    questionRewritingModelConfig: queryEngineModelConfig(
      engineConfig.questionRewritingModelConfigName
    ),
    promptConfig: Genai.ConfigUtil.queryOrchestratorPromptConfig(
      "QueryOrchestrator_default"
    ),
  };
}

function getQueryEngineModelConfig(fromEnv: any, modelConfigName: any) {
  return (
    modelConfigName &&
    Genai.UnstructuredQuery.Engine.ModelConfig.forConfigKey(
      modelConfigName
    ).getConfig()
  );
}

function setQueryEngineModelConfig(
  fromEnv: any,
  toEnv: any,
  modelConfigName: any
) {
  return (
    modelConfigName &&
    Genai.UnstructuredQuery.Engine.ModelConfig.forConfigKey(
      modelConfigName
    ).getConfig()
  );
}

function getReaConfigs(fromEnv: any) {
  var pipelineConfig = Genai.UnstructuredQuery.Engine.REA.PipelineConfig.inst();

  var extractionConfig = contextProcessorConfig(
    pipelineConfig.extractionConfigName
  );
  var qaConfig = contextProcessorConfig(
    pipelineConfig.questionAnsweringConfigName
  );
  var questionRewriteConfig =
    Genai.UnstructuredQuery.Engine.REA.QuestionRewritingConfig.make(
      pipelineConfig.questionRewritingConfigName
    ).getConfig();

  return {
    reaConfig: pipelineConfig,
    extractionConfigs: modelInferenceConfigs(extractionConfig),
    qaConfigs: modelInferenceConfigs(qaConfig),
    questionRewriteConfigs: modelInferenceConfigs(questionRewriteConfig),
    retrieverConfig: Genai.UnstructuredQuery.Engine.REA.RetrieverConfig.make(
      pipelineConfig.retrieverConfigName
    ).getConfig(),
    rerankerConfig: contextProcessorConfig(pipelineConfig.rerankerConfigName),
    attributorConfig:
      pipelineConfig.attributorConfigName &&
      Genai.AttributorConfig.make(
        pipelineConfig.attributorConfigName
      ).getConfig(),
  };
}

function setReaConfigs(fromEnv: any, toEnv: any) {
  var pipelineConfig = Genai.UnstructuredQuery.Engine.REA.PipelineConfig.inst();

  var extractionConfig = contextProcessorConfig(
    pipelineConfig.extractionConfigName
  );
  var qaConfig = contextProcessorConfig(
    pipelineConfig.questionAnsweringConfigName
  );
  var questionRewriteConfig =
    Genai.UnstructuredQuery.Engine.REA.QuestionRewritingConfig.make(
      pipelineConfig.questionRewritingConfigName
    ).getConfig();

  return {
    reaConfig: pipelineConfig,
    extractionConfigs: modelInferenceConfigs(extractionConfig),
    qaConfigs: modelInferenceConfigs(qaConfig),
    questionRewriteConfigs: modelInferenceConfigs(questionRewriteConfig),
    retrieverConfig: Genai.UnstructuredQuery.Engine.REA.RetrieverConfig.make(
      pipelineConfig.retrieverConfigName
    ).getConfig(),
    rerankerConfig: contextProcessorConfig(pipelineConfig.rerankerConfigName),
    attributorConfig:
      pipelineConfig.attributorConfigName &&
      Genai.AttributorConfig.make(
        pipelineConfig.attributorConfigName
      ).getConfig(),
  };
}

function getContextProcessorConfig(fromEnv: any, configName: any) {
  return Genai.UnstructuredQuery.Engine.REA.ContextProcessorConfig.make(
    configName
  ).getConfig();
}

function setContextProcessorConfig(fromEnv: any, toEnv: any, configName: any) {
  return Genai.UnstructuredQuery.Engine.REA.ContextProcessorConfig.make(
    configName
  ).getConfig();
}

function getModelInferenceConfigs(
  fromEnv: any,
  toEnv: any,
  config: { modelInferenceConfigName: any }
) {
  var modelInferenceConfig =
    Genai.UnstructuredQuery.Engine.REA.ModelInferenceConfig.make({
      name: config.modelInferenceConfigName,
    }).getConfig();
  return {
    config: config,
    inferenceConfig: modelInferenceConfig,
    promptConfig: c3.Genai.ConfigUtil.queryOrchestratorPromptConfig(
      "QueryOrchestrator_default"
    ),
  };
}

function setModelInferenceConfigs(
  fromEnv: any,
  toEnv: any,
  config: { modelInferenceConfigName: any }
) {
  var modelInferenceConfig =
    Genai.UnstructuredQuery.Engine.REA.ModelInferenceConfig.make({
      name: config.modelInferenceConfigName,
    }).getConfig();
  return {
    config: config,
    inferenceConfig: modelInferenceConfig,
    promptConfig: c3.Genai.ConfigUtil.queryOrchestratorPromptConfig(
      "QueryOrchestrator_default"
    ),
  };
}

function getStructuredDataConfigs(fromEnv: any) {
  var queryOrchestratorConfig = Genai.Agent.Config.make({
    name: "QueryOrchestrator_default",
  }).getConfig();
  var structuredDataConfigs = {
    structuredDataConfig: Genai.StructuredData.Config.getConfig(),
    queryOrchestratorConfig: queryOrchestratorConfig,
    queryOrchestratorModelConfig: queryEngineModelConfig(
      queryOrchestratorConfig.llmConfigName
    ),
    queryOrchestratorPromptConfig: queryOrchestratorPromptConfig(
      "QueryOrchestrator_default"
    ),
  };
  var orchestratorToolkit = Genai.Agent.Toolkit.forName(
    queryOrchestratorConfig.toolkitName
  );
  var tools = orchestratorToolkit.tools.map((tool: { id: any }) =>
    Genai.Agent.Tool.forId(tool.id)
  );
  tools.each(
    (tool: { id: string | number; config: () => any }) =>
      (structuredDataConfigs[tool.id] = tool.config())
  );
  return structuredDataConfigs;
}

function setStructuredDataConfigs(fromEnv: any, toEnv: any) {
  var queryOrchestratorConfig = Genai.Agent.Config.make({
    name: "QueryOrchestrator_default",
  }).getConfig();
  var structuredDataConfigs = {
    structuredDataConfig: Genai.StructuredData.Config.getConfig(),
    queryOrchestratorConfig: queryOrchestratorConfig,
    queryOrchestratorModelConfig: queryEngineModelConfig(
      queryOrchestratorConfig.llmConfigName
    ),
    queryOrchestratorPromptConfig: queryOrchestratorPromptConfig(
      "QueryOrchestrator_default"
    ),
  };
  var orchestratorToolkit = Genai.Agent.Toolkit.forName(
    queryOrchestratorConfig.toolkitName
  );
  var tools = orchestratorToolkit.tools.map((tool: { id: any }) =>
    Genai.Agent.Tool.forId(tool.id)
  );
  tools.each(
    (tool: { id: string | number; config: () => any }) =>
      (structuredDataConfigs[tool.id] = tool.config())
  );
  return structuredDataConfigs;
}

function getQueryOrchestratorPromptConfig(
  fromEnv: any,
  queryOrchestratorName: any
) {
  var promptConfigName = Genai.Agent.Config.forConfigKey(
    queryOrchestratorName
  ).getConfig().promptConfigName;
  return Genai.Agent.QueryOrchestrator.Prompt.Config.forConfigKey(
    promptConfigName
  ).getConfig();
}

function setQueryOrchestratorPromptConfig(
  fromEnv: any,
  toEnv: any,
  queryOrchestratorName: any
) {
  var promptConfigName = Genai.Agent.Config.forConfigKey(
    queryOrchestratorName
  ).getConfig().promptConfigName;
  return Genai.Agent.QueryOrchestrator.Prompt.Config.forConfigKey(
    promptConfigName
  ).getConfig();
}

function exportAppState(fromEnv: undefined) {
  var appState = dumpAppState();
  var downloadFileName =
    "genai_app_state_" + C3.app().id + "_" + DateTime.now() + ".json";
  c3DL(appState, "json", downloadFileName);
  return appState;
}

function importAppState(fromEnv: any, toEnv: any) {
  var appState = dumpAppState();
  var downloadFileName =
    "genai_app_state_" + C3.app().id + "_" + DateTime.now() + ".json";
  c3DL(appState, "json", downloadFileName);
  return appState;
}

function getAppState(fromEnv: any) {
  var queryConfigs = getQueryConfigs();
  return Object.assign({}, queryConfigs, {
    environmentInfo: environmentInfo(),
    retrieverInfo: retrieverInfo(),
    projectConfigs: projectConfigs(),
  });
}

function setAppState(fromEnv: any) {
  var queryConfigs = getQueryConfigs();
  return Object.assign({}, queryConfigs, {
    environmentInfo: environmentInfo(),
    retrieverInfo: retrieverInfo(),
    projectConfigs: projectConfigs(),
  });
}

function getEnvironmentInfo(fromEnv: any) {
  var app = C3.app();
  return {
    applicationInfo: app,
    nodes: app.nodes(),
    nodePoolConfigs: app
      .nodePools()
      .map((nodePool: { config: () => any }) => nodePool.config()),
  };
}

function setEnvironmentInfo(fromEnv: any, toEnv: any) {
  var app = C3.app();
  return {
    applicationInfo: app,
    nodes: app.nodes(),
    nodePoolConfigs: app
      .nodePools()
      .map((nodePool: { config: () => any }) => nodePool.config()),
  };
}

function getProjectConfigs() {
  var projects = Genai.Project.fetch().objs;
  return {
    projectSettings: Genai.Project.Settings.fetch().objs,
    projects: projects,
    unstructuredQueryEngineConfigs: projects.map(
      (project: { unstructuredQueryEngineConfigName: any }) =>
        Genai.UnstructuredQuery.Engine.REA.PipelineConfig.forConfigKey(
          project.unstructuredQueryEngineConfigName
        )
    ),
    chunkerConfigs: projects.map((project: { chunkerConfig: { name: any } }) =>
      Genai.SourceFile.Chunker.UniversalChunker.Config.forConfigKey(
        project.chunkerConfig.name
      )
    ),
  };
}

function setProjectConfigs() {
  var projects = Genai.Project.fetch().objs;
  return {
    projectSettings: Genai.Project.Settings.fetch().objs,
    projects: projects,
    unstructuredQueryEngineConfigs: projects.map(
      (project: { unstructuredQueryEngineConfigName: any }) =>
        Genai.UnstructuredQuery.Engine.REA.PipelineConfig.forConfigKey(
          project.unstructuredQueryEngineConfigName
        )
    ),
    chunkerConfigs: projects.map((project: { chunkerConfig: { name: any } }) =>
      Genai.SourceFile.Chunker.UniversalChunker.Config.forConfigKey(
        project.chunkerConfig.name
      )
    ),
  };
}

const fromEnv = "";
const FROM_ENV_TOKEN = "";
const toEnv = "";
const TO_ENV_TOKEN = "";

var result = exportAppState();

// Get the home directory of the executing user
const homeDir = os.homedir();

// Define the output file path
const outputPath = path.join(homeDir, "result.json");

// Write the copied object to the file
fs.writeFile(outputPath, JSON.stringify(result, null, 2), (err: any) => {
  if (err) {
    console.error("Error writing to file:", err);
  } else {
    console.log(`Copied object written to ${outputPath}`);
  }
});
