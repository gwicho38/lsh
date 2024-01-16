import {UiBundler} from "c3-types";

UiSdlConfig.getConfig({}).setConfigValue("infrastructure.webpackMode", "production");
UiBundlerConfig.inst().setConfigValue('bundleOnProvision', false);
UiBundler.removeAll({}, true);
UiBundlerResult.removeAll({}, true);

UiBundlerPerformanceProfile.removeAll({}, true);
UiSdlMetadataFileManifest.removeAll({}, true)

UiBundler.generateBundles();