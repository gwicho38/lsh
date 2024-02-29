/*
 * Copyright 2009-2022 C3 (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

setupExMachinaLocalStripe = function setupExMachinaLocalStripe(vanityUrlId) {
    StripeApiConfig.make().setConfigValue('successRedirectUrl', 'http://'+vanityUrlId+':8080/exmachina/stripe-success');
    StripeApiConfig.make().setConfigValue('cancelRedirectUrl', 'http://'+vanityUrlId+':8080/exmachina/stripe-cancel');
    StripeApiConfig.make().setConfigValue('publicApiKey', 'pk_test_1hnZkukLJN94fPHh6WUPIGZW');
    StripeApi.make().config().setSecretValue("auth", "Bearer sk_test_BPkRs8aVHgPY17MXsmNS5xhj");
    VertexGenerateTokenConfig.setConfigValues('REST-API-C3.ai', '75f0dd6695921ebc06cd4194c893f294', '4d8ce4f0b0a74ef98a6d6fc75b607d6d', 't{9L%8Xw');
}