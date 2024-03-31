import c3Post from "../../api";

async function postToRootPkg() {
  try {
    const typeName = 'Pkg'; // Replace with your type name
    const method = 'inst'; // Replace with your method name
    const data = {}; // Your data object

    const responseBody = await c3Post(typeName, method, data);
    // const responseString = JSON.stringify(responseBody); // Optionally convert the response body to a string
    // console.log("response: ", responseBody); // Use the response string as needed
    return responseBody;
  } catch (error) {
    // console.error('Error making POST request:', error);
    return "";
  }
}

async function sendRootRequest() {
  // Ensure getPkgId is awaited within the asynchronous context if it's an async function.
  let cachedId = await getPkgId();

  if (cachedId === "EMPTY") {
    console.log("In loop");
    try {
      const res = await postToRootPkg(); // Assuming this is correctly defined to return a promise.
      console.log(res); // This will log the actual response from postToRootPkg.
      return res;
    } catch (error) {
      console.error("Error in postToRootPkg:", error);
      // Consider re-throwing the error or handling it appropriately
      throw error;
    }
  } else {
    console.log("Cached ID:", cachedId);
    // If needed, return or handle the non-EMPTY cachedId case
  }
}

async function downloadPkgArtifact(pkgName, pkgSemVersion) {
  // var pkgName = "guruSearch";
  // var semVer = "8.3.2+develop.27.f8ba22a2563f1664f89d1708f06cc374e53f60b4";

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
  var artifact = ArtifactHub.artifactForVersion(pkgName, pkgSemVersion);
  download(artifact);
}

export default { postToRootPkg, sendRootRequest };
