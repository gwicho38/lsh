const prepareMetadata = function (passageContent, sourceFile) {
    sourceFile = sourceFile.getMissing({include: "metadata"});
    if (sourceFile.metadata && sourceFile.metadata.tags) {
        if (sourceFile.metadata.tags.length > 1) {
            var continent = sourceFile.metadata.tags[0].id;
            var country = sourceFile.metadata.tags[1].id;
            return "The following passage is relevant for " + country + ", located in " + continent + ": " + passageContent
        }
    }
    return passageContent
 }

// const indexMetadataLambda = Lambda.fromJsFunc(prepareMetadata);
// const sc = Genai.SourceCollection.forId("default");
// sc.withField('indexedContentProvider', indexMetadataLambda).merge();