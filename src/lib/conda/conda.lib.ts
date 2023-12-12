import { makePOSTRequest } from "../../services/api/api.js";
import { FileSystemConfig } from "@c3/types";
 
export async function get_conda_runtimes() {
    // set c3fs
    var origFSDefault = FileSystemConfig.make().getConfig().default;
    FileSystemConfig.make().setDefault(FileSystemScheme.c3fs, ConfigOverride.TAG);
    var origDefaultMount = FileSystem.mounts()['DEFAULT'];
    var origExmfilesMount = FileSystem.mounts()['EXMFILES'];
    
    // prevent config from timing out
    var config = CondaActionRuntimeConfig.make().getConfig();
    config.setConfigValue("envInstallationTimeoutSeconds", 9999);
    
    // get all Python runtimes
    var rts = TagMetadataStore.runtimes('Python');
    // install runtimes
    for (var rt in rts) {
    try {
        ActionRuntime.forName(rt).ensureInstalled();
    } catch (e) {
        console.log(e);
    }
    }
}