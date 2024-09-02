/*
 * Copyright 2009-2024 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

// script of config changes to make when using an environment in the gkev8c3apps cluster - adjusts airgap file URLs,
// ModelInference config, and model routes
//
// This script should not be needed for environments created after the PR containing this script is merged in, as our
// config seed files have been changed.

modelName = "mixtral";
newRoute = "qa_mixtral_mis_central";

// Update airgap URLs
var airGapConfig = Genai.App.AirGapConfig.inst();

var keys = Object.keys(airGapConfig);
keys.forEach((key) => {
  airGapConfig.setConfigValue(
    key,
    airGapConfig[key].replace("c3--gkev8genai", "c3--gkev8c3apps")
  );
});

// This file URL has changed more than just replacing the cluster name, so we set it separately
airGapConfig.setConfigValue(
  "nltkSentenceTokenizerModelFilePath",
  "gcs://c3--gkev8c3apps/datasets/guru/punkt/PY3/english.pickle"
);

// Clear app's ModelInference config to default to cluster's config, which points to stggkemis
var modelInferenceConfig = Microservice.Config.forName("ModelInference");
modelInferenceConfig.clearConfigAndSecretOverride("APP");
modelInferenceConfig.clearConfigAndSecretOverride("ENV");

// Update model routes
console.log("Genai.UnstructuredQuery.Engine.ModelConfig routes");
Genai.UnstructuredQuery.Engine.ModelConfig.listConfigKeys()
  .collect()
  .filter((obj) => obj.includes(modelName))
  .forEach((key) => {
    conf = Genai.UnstructuredQuery.Engine.ModelConfig.forConfigKey(key);
    newLlmKwargs = {
      route: newRoute,
      completionKwargs: conf.llmKwargs.completionKwargs,
    };
    conf.setConfigValue("llmKwargs", newLlmKwargs);
  });

Genai.UnstructuredQuery.Engine.REA.ModelInferenceConfig.listConfigKeys()
  .collect()
  .filter((obj) => obj.includes(modelName))
  .forEach((key) => {
    conf =
      Genai.UnstructuredQuery.Engine.REA.ModelInferenceConfig.forConfigKey(key);
    conf.setConfigValue("route", newRoute);
  });
