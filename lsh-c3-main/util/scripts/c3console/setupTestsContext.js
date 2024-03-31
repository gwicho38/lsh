/*
 * Copyright 2009-2022 C3 (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

setupTestsContext = function (usingDocker, testDomain, tenant, tag) {
    if (usingDocker) {
      WebDriverProtocol.setApiUrlAndAuth('http://localhost:4444/wd/hub/');
    }

    ClusterConfig.make().setConfigValue('canonicalUrlScheme', 'http');
    ClusterConfig.make().setConfigValue('canonicalUrlDomain', 'dev-local.test');

    TenantConfig.upsert(TenantConfig.make({
      'id': 'Skywalker_Supported_Browsers',
      'jsonValue': [ 'chrome' ]
    }));

    TenantConfig.upsert(TenantConfig.make({
      'id': 'Skywalker_SaveScreenShot',
      'value': 'true'
    }));

    VanityUrl.upsert({
      id: testDomain,
      name: testDomain,
      tenant: tenant,
      anonymousUser: true,
      tag: tag,
      defaultContent: 'index.html'
    });
    var ctx = TestApi.createContext('testcontext');
    TestApi.spyOn(ctx, 'TestApi', 'setupVanityUrl').returnValue('http://' + testDomain + ':8080').register();
}