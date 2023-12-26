https://community.c3.ai/t/how-to-increase-env-limit-for-a-specific-user/13401

// Thanks @c3-sethtilliss for sending over this command:

StudioUserConfig.forId(id).setConfigValue('maxSingleNodeEnvPerStudioUser', 2)

// And for MNE:

StudioUserConfig.forId(id).setConfigValue('maxNonSingleNodeEnvPerStudioUser', 2)