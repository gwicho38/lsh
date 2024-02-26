> 20231121

02:09:19

## Package Errors When Syncing

12:57:48

[Simon Rosenberg: Package errors when syncing](https://teams.microsoft.com/l/message/19:BWjjHyrmiKLTgVczctSzFhuJOGQJmurijuAkQ3KEQXk1@thread.tacv2/1700231239041?tenantId=53ad779a-93e7-485c-ba20-ac8290d7252b&groupId=e1b2ebb6-f939-404e-b156-c1c79cd16b99&parentMessageId=1700231239041&teamName=Generative%20AI&channelName=General&createdTime=1700231239041 "https://teams.microsoft.com/l/message/19:BWjjHyrmiKLTgVczctSzFhuJOGQJmurijuAkQ3KEQXk1@thread.tacv2/1700231239041?tenantId=53ad779a-93e7-485c-ba20-ac8290d7252b&groupId=e1b2ebb6-f939-404e-b156-c1c79cd16b99&parentMessageId=1700231239041&teamName=Generative%20AI&channelName=General&createdTime=1700231239041")

posted in Generative AI / General on November 17, 2023 9:27 AM

## UiSdlMetadataLoader.produceC3SdlReactNpmModule Fails

```javascript

 Error: Error downloading @c3_sdl-react.tar.gz, not a valid gzip file! Server responded: {"message":"Wrapped c3.platform.err.C3RuntimeException: Error invoking Java method Array<File>#fold: org.mozilla.javascript.WrappedException: Wrapped c3.platform.err.C3RuntimeException: Error invoking Java method Pkg.File#toContentValue: java.lang.NullPointerException: Cannot invoke \"c3.platform.typesys.value.Pair.snd()\" because the return value of \"c3.platform.file.Content.encodedStream()\" is null (UiSdlMetadataLoader.js#530) (UiSdlMetadataLoader.js#523)","cause":{"message":"Internal Java error: Wrapped c3.platform.err.C3RuntimeException: Error invoking Java method Pkg.File#toContentValue: java.lang.NullPointerException: Cannot invoke \"c3.platform.typesys.value.Pair.snd()\" because the return value of \"c3.platform.file.Content.encodedStream()\" is null (UiSdlMetadataLoader.js#530)!","httpStatusCode":500,"action":"Array<File>#fold","engine":"java-server-java"},"httpStatusCode":500,"filenameOfRootError":"UiSdlMetadataLoader.js","stackTrace":[{"fileName":"UiSdlMetadataLoader.js","lineNumber":523,"source":"  521   */\n  522  function generateSdlReactPresentationalSourceCode() {\n> 523    return UiTagMetadataStore.files({\n  524      pathGlob: 'sdl-react/src/**/*',\n  525      order: Pkg.FileOrder.REMIX,"}],"action":"UiSdlMetadataLoader#produceC3SdlReactNpmModule","engine":"js-server-rhino"}

```