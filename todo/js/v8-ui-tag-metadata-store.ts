Type UiTagMetadataStore
A wrapper on top of TagMetadataStore to make v7 -> v8 migration smoother.this type abstracts the following methods from TagMetadataStore.

Mixes Value

Declaration

Methods
files(spec): [File] static
A function to return all files accessible by this MetadataStore based on the Pkg.FilesSpec.

  Parameters:
spec: Pkg.FilesSpec
The Pkg.FilesSpec that will be used to retrive the Pkg.File.

  Returns[File]
Declaration

allFiles(): [File] static
Returns[File]
Declaration

typeMetasThatMixin(mixinType, deep): [TypeMeta] static
Get all types that mixin a specified type.

  Parameters:
mixinType: string required
deep: boolean
If true, return types that mixin other types that mixin the specified type.

  Returns[TypeMeta]
Declaration

typesWithAnnotation(annName, annField, declaredOnly): [Type] static
Get all types that specify a given annotation.

  Parameters:
annName: string required
Name of the annotation to search for on the type.E.g.If the annotation is Ann.Deprecated, just provide "deprecated" as the annName(as it would appear on the type definition).

  annField: string
Name of the field on the annotation that is set while searching for types.E.g.If annotation is Ann.Deprecated, and you want types that have the field Ann.Deprecated#finalVersion set, then use this field.If not set, then filtering based on annField is not applied.

  declaredOnly: boolean
If true, return types where the given annotation has been declared on the type itself.If false(default ), it returns types even if the annotation occurs on the mixin types.

  Returns[Type]
Declaration

rootPackage(): Pkg.Decl static
Returns Pkg.Decl
root package in this metadata store.

  Declaration

updateMetadata(upsert, remove, doNotRevertStateOnError): Pkg.ResultWithIssues static
Updates metadata in this store.

  Parameters:
upsert: map<string, Obj | [Obj] | binary>
Map of metadata file path to a single metadata instance(e.g.type of single object seed data), list of metadata objects, or encoded binary content of the metadata file.

  remove: [string]
List of metedata file urls to remove.

  doNotRevertStateOnError: boolean
Returns Pkg.ResultWithIssues required
Any potential metadata issues after this update.

  Declaration

emptyFileCache() static
Clears the file cache for this metadata store.

  Declaration

makeMetadataFile(category, subPath, isTest): Pkg.File static
With current Pkg, returns a Pkg.File made using root package and given category and subPath.

  Parameters:
    category: string requiredenum
Category for this metadata.

  subPath: string required
The sub path of the file excluding repository, package and category information.Note this should not be URL encoded. { @see Pkg.Path.subPath }.

isTest: boolean
If true, will make test file with given category subPath.

Returns Pkg.File required
File made in root package for current Pkg.

  Declaration

typesByPackage(package, declaredOrMixes): [Type] static
Get all types from a specified package.

  Parameters:
package: string
Name of the existing package.

  declaredOrMixes: boolean
If true will also return types that mixin a type declared in the provided package.

  Returns[Type]
An array of TypeRef from the specified package.

  Declaration
