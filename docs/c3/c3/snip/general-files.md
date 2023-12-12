# File Processing General Page

## Getting Test Files

```ts

// c3Grid
c3Grid(MetadataStore.tag().files({isTest: true, path: '**'}))

var files = MetadataStore.tag().files();


/**

	opts:

		path
		pathCaseSensitive
		pathMatchBy
		repository
		package
		category
		encodedSubPath
		isTest
		targetType
		mimeType
		limit

*/

var fileSpec = MetadataFileSpec.make({});

var fileSpec = MetadataFilesSpec.make({
	repository: "mda",
	package: "mdaPTS",
	category: "Jasmine",
	isTest: true,
	encodedSubPath: "test_**.js"
});


```

