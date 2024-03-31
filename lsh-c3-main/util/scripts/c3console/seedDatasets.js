/*
 * Copyright 2009-2022 C3 (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

seedDatasets = function (s3AccessKey, s3SecretKey, s3Region) {
    CloudResource.setCredentials("aws", AwsCredentials.make({
      accessKey: s3AccessKey,
      secretKey: s3SecretKey,
      region: s3Region,
    }), ConfigOverride.USER);

    ExMachinaSeedDataset.seedDatasets()
}