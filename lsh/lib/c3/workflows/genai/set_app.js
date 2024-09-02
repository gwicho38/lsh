/*
 * Copyright 2009-2024 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

// script of config changes to make when using an environment in the gkev8genai cluster
// Assumes you'll be using zephyr on the existing MIS deployment in gkev8genai

// changing GenAI configs back to zephyr since that is what's available in this cluster

// UPDATE 07/23/24 - mixtral is deployed on gkev8genai, this script should no longer be needed but will be kept for now for posterity

newModel = "zephyr";
newRoute = "zephyr_alpha_mis_central";
oldModel = "mixtral";

Microservice.Config.forName("ModelInference").setConfigValue(
  "appId",
  "gkev8genai-centralmis-service"
);

modelRelations = Genai.PromptModelRelation.fetch().objs;
modelRelationsToMerge = [];
modelRelations
  .filter((obj) => obj.modelConfigName.includes(oldModel))
  .forEach((mr) => {
    modelRelationsToMerge.push(
      mr.withModelConfigName(mr.modelConfigName.replace(oldModel, newModel))
    );
  });
console.log("Merging Genai.PromptModelRelations");
Genai.PromptModelRelation.mergeBatch(modelRelationsToMerge);

console.log("Updating Genai.Agent.Config.llmConfigName");
qoLlm = Genai.Agent.Config.forConfigKey("QueryOrchestrator_default").getConfig()
  .llmConfigName;
Genai.Agent.Config.forConfigKey("QueryOrchestrator_default").setConfigValue(
  "llmConfigName",
  qoLlm.replace(oldModel, newModel)
);

console.log("Genai.UnstructuredQuery.Engine.ModelConfig routes");
Genai.UnstructuredQuery.Engine.ModelConfig.listConfigKeys()
  .collect()
  .filter((obj) => obj.includes("zephyr"))
  .forEach((key) => {
    conf = Genai.UnstructuredQuery.Engine.ModelConfig.forConfigKey(key);
    newLlmKwargs = {
      route: newRoute,
      completionKwargs: conf.llmKwargs.completionKwargs,
    };
    conf.setConfigValue("llmKwargs", newLlmKwargs);
  });

Genai.Agent.Tool.Config.listConfigKeys()
  .collect()
  .forEach((key) => {
    conf = Genai.Agent.Tool.Config.forConfigKey(key);
    if (
      conf.textAnswerFromDataModelConfigName &&
      conf.textAnswerFromDataModelConfigName.includes(oldModel)
    ) {
      console.log(
        "Swapping Genai.Agent.Tool.Config.textAnswerFromDataModelConfigName on key = " +
          key
      );
      conf.setConfigValue(
        "textAnswerFromDataModelConfigName",
        conf.textAnswerFromDataModelConfigName.replace(oldModel, newModel)
      );
    }
  });

subTypes = Genai.Agent.Tool.Config.meta().subTypes();
subTypes.forEach((subType) => {
  subType
    .listConfigKeys()
    .collect()
    .forEach((key) => {
      conf = subType.forConfigKey(key);
      if (
        conf.textAnswerFromDataModelConfigName &&
        conf.textAnswerFromDataModelConfigName.includes(oldModel)
      ) {
        console.log(
          "Swapping " +
            subType.name() +
            " textAnswerFromDataModelConfigName on key = " +
            key
        );
        conf.setConfigValue(
          "textAnswerFromDataModelConfigName",
          conf.textAnswerFromDataModelConfigName.replace(oldModel, newModel)
        );
      }
    });
});

console.log(
  "Updating model on Genai.UnstructuredQuery.Engine.REA.PipelineConfig"
);
conf =
  Genai.UnstructuredQuery.Engine.REA.PipelineConfig.forConfigKey(
    "cornea_mixtral"
  );
conf.setConfigValue(
  "questionAnsweringConfigName",
  conf.questionAnsweringConfigName.replace(oldModel, newModel)
);
conf.setConfigValue(
  "questionRewritingConfigName",
  conf.questionRewritingConfigName.replace(oldModel, newModel)
);
conf.setConfigValue(
  "retrieverConfigName",
  conf.retrieverConfigName.replace(oldModel, newModel)
);

console.log("Updating nextToolModelConfigName");
conf = Genai.Agent.QueryOrchestrator.Prompt.Config.forConfigKey("cornea");
conf.setConfigValue(
  "nextToolModelConfigName",
  conf.nextToolModelConfigName.replace(oldModel, newModel)
);

console.log("Updating Genai.UnstructuredQuery.Engine");
conf = Genai.UnstructuredQuery.Engine.DefaultConfig.inst();
conf.setConfigValue(
  "queryEngineConfigName",
  conf.queryEngineConfigName.replace(oldModel, newModel)
);

conf = Genai.Llm.Guide.Config.inst().getConfig();
conf.setConfigValue(
  "modelConfigName",
  conf.modelConfigName.replace(oldModel, newModel)
);

Genai.UnstructuredQuery.Engine.REA.ModelInferenceConfig.listConfigKeys()
  .collect()
  .filter((obj) => obj.includes(newModel))
  .forEach((key) => {
    conf =
      Genai.UnstructuredQuery.Engine.REA.ModelInferenceConfig.forConfigKey(key);
    conf.setConfigValue("route", newRoute);
  });

const relations = Genai.PromptModelRelation.fetch().objs;

relations.forEach((relation) => {
  const modelConfigName = relation.modelConfigName.replace(
    new RegExp(oldModel, "g"),
    newModel
  );
  relation.withField("modelConfigName", modelConfigName).upsert();
});
