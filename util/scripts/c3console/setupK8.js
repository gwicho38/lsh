/*
 * Copyright 2009-2022 C3 (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

setupK8 = function (apiServer, authToken, vadImage) {
    k8sAuth = "Bearer " + authToken
    K8sApiServer.setApiUrlAndAuth(apiServer, k8sAuth, ConfigOverride.CLUSTER)
    CloudConfig.inst().setConfigValue('k8sConfig.k8sNamespace', "local-env", ConfigOverride.CLUSTER)
    ExMachinaServiceConfig.inst().setConfigValue('exmacDriverImage', vadImage, ConfigOverride.CLUSTER)
}