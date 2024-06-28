// pkgname & version come from build in studio, e.g.
// https://gkev8c3apps.c3-e.com/blitztest/studio/branches/github-c3-e-c3fed-guru-cornea--feature%2Frps%2FCOR-772/1/guruSearchUI
var pkgName = "guruSearchUI";
var semVer = '8.3.2+develop.135.c0d8a7ee8c8cb63810800e93f544275105ab580c";

//See all the artifacts avaliable and semantic verions
// c3Grid(ArtifactHubService.Artifact.fetch())

//See all the artifacts for a specific package
// c3Grid(ArtifactHubService.Artifact.fetch({filter: Filter.inst().eq('name', pkgName)}));

//See all the artifacts for a specific package, sorted from newest to oldest
// c3Grid(ArtifactHubService.Artifact.fetch({filter: Filter.inst().eq('name', pkgName), order : 'descending(meta.updated)'}))

//See all the artifacts for a specific version 
// c3Grid(ArtifactHubService.Artifact.fetch({filter: Filter.inst().eq('semanticVersion', semVer)}));

// artifact
function download(artifact) {
    var contentLocation = ArtifactHubService.Artifact.make(artifact.id).get().content.get().contentLocation;
    var fileUrl = C3.File.make(contentLocation).apiEndpoint("GET", true);
    var downloadName = artifact.name + artifact.semanticVersion + '.zip';

    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = downloadName;
    link.click();
}
var artifact = ArtifactHub.artifactForVersion(pkgName, semVer);
download(artifact);

// metadata
artifact = artifact.withoutDependencies()
  .withoutFlattenedDependencies()
  .withoutResolvedDependencies()
  .withContent({ id: artifact.content.id.split('/').pop() });

// Copy JSON to clipboard
copy(artifact.toJson());
console.log("Done!");