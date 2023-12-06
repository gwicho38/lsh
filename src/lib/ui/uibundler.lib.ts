export async function cleanUiBundler() {
    UiSdlConfig.getConfig({}).setConfigValue("infrastructure.webpackMode", "production");  
    UiBundlerConfig.inst().setConfigValue('bundleOnProvision', false);  
    UiBundler.removeAll();  
    UiBundlerResult.removeAll();       
    
    UiBundlerPerformanceProfile.removeAll();  
    UiSdlMetadataFileManifest.removeAll()
    
    UiBundler.generateBundles();
}