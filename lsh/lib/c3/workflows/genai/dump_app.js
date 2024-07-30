function getQueryConfigs() {
  return {
    'queryEngineConfigs': queryEngineConfigs(),
    // 'reaConfigs': reaConfigs(),
    'structuredDataConfigs': structuredDataConfigs(),
  };
}

function queryEngineConfigs() {
  var engineConfig = Genai.UnstructuredQuery.Engine.Config.inst();
  return {
    'queryEngineConfig': engineConfig,
    'modelConfig': queryEngineModelConfig(engineConfig.modelConfigName),
    'extractionModelConfig': queryEngineModelConfig(engineConfig.extractionModelConfigName),
    'questionRewritingModelConfig': queryEngineModelConfig(engineConfig.questionRewritingModelConfigName),
    'promptConfig': Genai.ConfigUtil.queryOrchestratorPromptConfig("QueryOrchestrator_default"),
  };
}

function queryEngineModelConfig(modelConfigName) {
  return modelConfigName && Genai.UnstructuredQuery.Engine.ModelConfig.forConfigKey(modelConfigName).getConfig();
}

function reaConfigs() {
  var pipelineConfig = Genai.UnstructuredQuery.Engine.REA.PipelineConfig.inst();

  var extractionConfig = contextProcessorConfig(pipelineConfig.extractionConfigName);
  var qaConfig = contextProcessorConfig(pipelineConfig.questionAnsweringConfigName);
  var questionRewriteConfig = Genai.UnstructuredQuery.Engine.REA.QuestionRewritingConfig.make(pipelineConfig.questionRewritingConfigName).getConfig();

  return {
    'reaConfig': pipelineConfig,
    'extractionConfigs': modelInferenceConfigs(extractionConfig),
    'qaConfigs': modelInferenceConfigs(qaConfig),
    'questionRewriteConfigs': modelInferenceConfigs(questionRewriteConfig),
    'retrieverConfig': Genai.UnstructuredQuery.Engine.REA.RetrieverConfig.make(pipelineConfig.retrieverConfigName).getConfig(),
    'rerankerConfig': contextProcessorConfig(pipelineConfig.rerankerConfigName),
    'attributorConfig': pipelineConfig.attributorConfigName && Genai.AttributorConfig.make(pipelineConfig.attributorConfigName).getConfig(),
  };
}

function contextProcessorConfig(configName) {
  return Genai.UnstructuredQuery.Engine.REA.ContextProcessorConfig.make(configName).getConfig();
}

function modelInferenceConfigs(config) {
  var modelInferenceConfig = Genai.UnstructuredQuery.Engine.REA.ModelInferenceConfig.make({ name: config.modelInferenceConfigName }).getConfig();
  return {
    'config': config,
    'inferenceConfig': modelInferenceConfig,
    'promptConfig': c3.Genai.ConfigUtil.queryOrchestratorPromptConfig("QueryOrchestrator_default"),
  };
}

function structuredDataConfigs() {
  var queryOrchestratorConfig = Genai.Agent.Config.make({ 'name': 'QueryOrchestrator_default' }).getConfig();
  var structuredDataConfigs = {
    'structuredDataConfig': Genai.StructuredData.Config.getConfig(),
    'queryOrchestratorConfig': queryOrchestratorConfig,
    'queryOrchestratorModelConfig': queryEngineModelConfig(queryOrchestratorConfig.llmConfigName),
    'queryOrchestratorPromptConfig': queryOrchestratorPromptConfig('QueryOrchestrator_default'),
  };
  var orchestratorToolkit = Genai.Agent.Toolkit.forName(queryOrchestratorConfig.toolkitName);
  var tools = orchestratorToolkit.tools.map(tool => Genai.Agent.Tool.forId(tool.id));
  tools.each(tool => structuredDataConfigs[tool.id] = tool.config());
  return structuredDataConfigs;
}

function queryOrchestratorPromptConfig(queryOrchestratorName) {
  var promptConfigName =
    Genai.Agent.Config.forConfigKey(queryOrchestratorName).getConfig().promptConfigName;
  return Genai.Agent.QueryOrchestrator.Prompt.Config.forConfigKey(promptConfigName).getConfig();
}

function exportAppState() {
  var appState = dumpAppState();
  var downloadFileName = 'genai_app_state_' + C3.app().id + '_' + DateTime.now() + '.json';
  c3DL(appState, 'json', downloadFileName);
  return appState;
}

function dumpAppState() {
  var queryConfigs = getQueryConfigs();
  return Object.assign({}, queryConfigs, {
    'environmentInfo': environmentInfo(),
    'retrieverInfo': retrieverInfo(),
    'projectConfigs': projectConfigs(),
  });
}

function environmentInfo() {
  var app = C3.app();
  return {
    'applicationInfo': app,
    'nodes': app.nodes(),
    'nodePoolConfigs': app.nodePools().map(nodePool => nodePool.config()),
  };
}

function retrieverInfo() {
  var colbertRetrievers = Genai.Retriever.ColBERT.fetch().objs;
  return {
    'colbertRetrievers': colbertRetrievers,
    'colbertDataConfigs': colbertRetrievers.map(retriever => Genai.Retriever.ColBERT.DataConfig.forConfigKey(retriever.name)),
    'sourceCollections': Genai.SourceCollection.fetch().objs,
    'chunkerConfig': Genai.SourceFile.Chunker.UniversalChunker.Config.inst(),
  };
}

function projectConfigs() {
  var projects = Genai.Project.fetch().objs;
  return {
    'projectSettings': Genai.Project.Settings.fetch().objs,
    'projects': projects,
    'unstructuredQueryEngineConfigs': projects.map(project => Genai.UnstructuredQuery.Engine.REA.PipelineConfig.forConfigKey(project.unstructuredQueryEngineConfigName)),
    'chunkerConfigs': projects.map(project => Genai.SourceFile.Chunker.UniversalChunker.Config.forConfigKey(project.chunkerConfig.name)),
  };
}

var result = exportAppState();

// Get the home directory of the executing user
const homeDir = os.homedir();

// Define the output file path
const outputPath = path.join(homeDir, 'result.json');

// Write the copied object to the file
fs.writeFile(outputPath, JSON.stringify(result, null, 2), (err) => {
  if (err) {
    console.error('Error writing to file:', err);
  } else {
    console.log(`Copied object written to ${outputPath}`);
  }
});

