C3.app().nodePool("leader").nodes().forEach(node => {
    node.callJson('Lambda', 'apply', () => {
      indexZipUrl = 's3://837215289271--c3awsgenaimp/navyfrc/vector-store/vectorStoreGPU-10-25.zip';
      Genai.Retriever.ColBERT.DataConfig.make({"name": 'navyfrc'}).getConfig().setConfigValue("indexZipUrl", indexZipUrl);
      Py.closeAllPy4jInterpreters()
    })
});