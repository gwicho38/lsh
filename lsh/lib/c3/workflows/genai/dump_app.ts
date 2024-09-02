// get all configs from target

import axios from "axios";
import AsyncLock from "async-lock";

const semaphore = new AsyncLock();

// import { getAPIEndpoint } from "./utils";

interface AxiosResponse {
  data: any;
}
export const c3FunctionCall = async (
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
        const response = await axios.post(url, data);
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

function getRetrieverInfo(fromEnv) {
  var colbertRetrievers = Genai.Retriever.ColBERT.fetch().objs;

  return {
    colbertRetrievers: colbertRetrievers,
    colbertDataConfigs: colbertRetrievers.map((retriever) =>
      Genai.Retriever.ColBERT.DataConfig.forConfigKey(retriever.name)
    ),
    sourceCollections: Genai.SourceCollection.fetch().objs,
    chunkerConfig: Genai.SourceFile.Chunker.UniversalChunker.Config.inst(),
  };
}

// get all configs from ref and set them on target
function setRetrieverInfo(fromEnv, toEnv) {
  var colbertRetrievers = Genai.Retriever.ColBERT.fetch().objs;
  return {
    colbertRetrievers: colbertRetrievers,
    colbertDataConfigs: colbertRetrievers.map((retriever) =>
      Genai.Retriever.ColBERT.DataConfig.forConfigKey(retriever.name)
    ),
    sourceCollections: Genai.SourceCollection.fetch().objs,
    chunkerConfig: Genai.SourceFile.Chunker.UniversalChunker.Config.inst(),
  };
}

function getQueryConfigs(fromEnv) {
  return {
    queryEngineConfigs: getQueryEngineConfigs(fromEnv),
    // 'reaConfigs': reaConfigs(),
    structuredDataConfigs: structuredDataConfigs(fromEnv),
  };
}

function setQueryConfigs(fromEnv) {
  return {
    queryEngineConfigs: getQueryEngineConfigs(fromEnv, toEnv),
    // 'reaConfigs': reaConfigs(),
    structuredDataConfigs: structuredDataConfigs(fromEnv, toEnv),
  };
}

function getQueryEngineConfigs(fromEnv) {
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

function setQueryEngineConfigs(fromEnv, toEnv) {
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

function getQueryEngineModelConfig(fromEnv, modelConfigName) {
  return (
    modelConfigName &&
    Genai.UnstructuredQuery.Engine.ModelConfig.forConfigKey(
      modelConfigName
    ).getConfig()
  );
}

function setQueryEngineModelConfig(fromEnv, toEnv, modelConfigName) {
  return (
    modelConfigName &&
    Genai.UnstructuredQuery.Engine.ModelConfig.forConfigKey(
      modelConfigName
    ).getConfig()
  );
}

function getReaConfigs(fromEnv) {
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

function setReaConfigs(fromEnv, toEnv) {
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

function getContextProcessorConfig(fromEnv, configName) {
  return Genai.UnstructuredQuery.Engine.REA.ContextProcessorConfig.make(
    configName
  ).getConfig();
}

function setContextProcessorConfig(fromEnv, toEnv, configName) {
  return Genai.UnstructuredQuery.Engine.REA.ContextProcessorConfig.make(
    configName
  ).getConfig();
}

function getModelInferenceConfigs(fromEnv, toEnv, config) {
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

function setModelInferenceConfigs(fromEnv, toEnv, config) {
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

function getStructuredDataConfigs(fromEnv) {
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
  var tools = orchestratorToolkit.tools.map((tool) =>
    Genai.Agent.Tool.forId(tool.id)
  );
  tools.each((tool) => (structuredDataConfigs[tool.id] = tool.config()));
  return structuredDataConfigs;
}

function setStructuredDataConfigs(fromEnv, toEnv) {
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
  var tools = orchestratorToolkit.tools.map((tool) =>
    Genai.Agent.Tool.forId(tool.id)
  );
  tools.each((tool) => (structuredDataConfigs[tool.id] = tool.config()));
  return structuredDataConfigs;
}

function getQueryOrchestratorPromptConfig(fromEnv, queryOrchestratorName) {
  var promptConfigName = Genai.Agent.Config.forConfigKey(
    queryOrchestratorName
  ).getConfig().promptConfigName;
  return Genai.Agent.QueryOrchestrator.Prompt.Config.forConfigKey(
    promptConfigName
  ).getConfig();
}

function setQueryOrchestratorPromptConfig(
  fromEnv,
  toEnv,
  queryOrchestratorName
) {
  var promptConfigName = Genai.Agent.Config.forConfigKey(
    queryOrchestratorName
  ).getConfig().promptConfigName;
  return Genai.Agent.QueryOrchestrator.Prompt.Config.forConfigKey(
    promptConfigName
  ).getConfig();
}

function exportAppState(fromEnv) {
  var appState = dumpAppState();
  var downloadFileName =
    "genai_app_state_" + C3.app().id + "_" + DateTime.now() + ".json";
  c3DL(appState, "json", downloadFileName);
  return appState;
}

function importAppState(fromEnv, toEnv) {
  var appState = dumpAppState();
  var downloadFileName =
    "genai_app_state_" + C3.app().id + "_" + DateTime.now() + ".json";
  c3DL(appState, "json", downloadFileName);
  return appState;
}

function getAppState(fromEnv) {
  var queryConfigs = getQueryConfigs();
  return Object.assign({}, queryConfigs, {
    environmentInfo: environmentInfo(),
    retrieverInfo: retrieverInfo(),
    projectConfigs: projectConfigs(),
  });
}

function setAppState(fromEnv) {
  var queryConfigs = getQueryConfigs();
  return Object.assign({}, queryConfigs, {
    environmentInfo: environmentInfo(),
    retrieverInfo: retrieverInfo(),
    projectConfigs: projectConfigs(),
  });
}

function getEnvironmentInfo(fromEnv) {
  var app = C3.app();
  return {
    applicationInfo: app,
    nodes: app.nodes(),
    nodePoolConfigs: app.nodePools().map((nodePool) => nodePool.config()),
  };
}

function setEnvironmentInfo(fromEnv, toEnv) {
  var app = C3.app();
  return {
    applicationInfo: app,
    nodes: app.nodes(),
    nodePoolConfigs: app.nodePools().map((nodePool) => nodePool.config()),
  };
}

function getProjectConfigs() {
  var projects = Genai.Project.fetch().objs;
  return {
    projectSettings: Genai.Project.Settings.fetch().objs,
    projects: projects,
    unstructuredQueryEngineConfigs: projects.map((project) =>
      Genai.UnstructuredQuery.Engine.REA.PipelineConfig.forConfigKey(
        project.unstructuredQueryEngineConfigName
      )
    ),
    chunkerConfigs: projects.map((project) =>
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
    unstructuredQueryEngineConfigs: projects.map((project) =>
      Genai.UnstructuredQuery.Engine.REA.PipelineConfig.forConfigKey(
        project.unstructuredQueryEngineConfigName
      )
    ),
    chunkerConfigs: projects.map((project) =>
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
fs.writeFile(outputPath, JSON.stringify(result, null, 2), (err) => {
  if (err) {
    console.error("Error writing to file:", err);
  } else {
    console.log(`Copied object written to ${outputPath}`);
  }
});
