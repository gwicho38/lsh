## ENV

```
https://gkev8genai.c3-e.com/gurudev/gurusearchui/
```

## TEST

```
can you try just modifying one of the metadata files and seeing if it changed? Like maybe tracktool drop a bunch of the columns and see if that change is reflected in the return
```

## FILE

	cornea/guruSearch/metadata/Genai.TrackTool/track.json


## PROCESS

```typescript

// fetch all Genai.TrackTools
var trks = Genai.TrackTool.fetch().objs;

```