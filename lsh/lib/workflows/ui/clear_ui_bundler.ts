// import {UiBundler} from "c3-types";

// UiSdlConfig.getConfig({}).setConfigValue("infrastructure.webpackMode", "production");
// UiBundlerConfig.inst().setConfigValue('bundleOnProvision', false);
// UiBundler.removeAll({}, true);
// UiBundlerResult.removeAll({}, true);

// UiBundlerPerformanceProfile.removeAll({}, true);
// UiSdlMetadataFileManifest.removeAll({}, true)

// UiBundler.generateBundles();
//

Pkg.Store.clearCaches();
Pkg.File.Db.removeAll({}, true);
Py.closeAllPy4jInterpreters();
Server.restart();
