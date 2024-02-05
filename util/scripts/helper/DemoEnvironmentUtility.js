/*
 * Copyright 2009-2024 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

function masterRefresh(appId) {
  const currentAppId = C3.app().id;
  if (appId != currentAppId) {
    throw Error("Provided appId '" + appId + "' does not match current environment application '" + currentAppId + "'.");
  }

  // Wipe data
  DemoEnvironmentUtility.wipeData(appId);

  // Load necessary seed data
  DemoEnvironmentUtility.loadSeedData();

  // Assign all Users to a ManagingUnit
  DemoEnvironmentUtility.assignUsersToUnits();

  // Clear auto-generated notifications from seed data
  DemoEnvironmentUtility.clearNotifications();
}

function getTypeRefs() {
  return [
    AnnexL,
    AssetAssignment,
    AssetAssignmentToSpecificIntelReqRelation,
    Cocom,
    DaArmament,
    DaEmitter,
    DaNotification,
    DaNotificationAnnexL,
    DaNotificationCriterion,
    DaNotificationStatusHistory,
    DaRequestCustomField,
    DaRequestCustomFieldValue,
    DaUser,
    DecisionPointMarker,
    GridColumnMetadata,
    HighPriorityTarget,
    HighPriorityTargetToIndicatorRelation,
    HighPriorityTargetToPriorityIntelReqRelation,
    HostileOrFriendlyMarker,
    IcMapLine,
    IcMapMarker,
    IcMapOverlay,
    IcMapShape,
    Indicator,
    InformationCollectionAsset,
    InformationCollectionAssetToInformationCollectionDeviceRelation,
    InformationCollectionDevice,
    InformationCollectionOptimizationRun,
    ManagingUnit,
    MapSymbol,
    MilTimeZone,
    NamedAreaInterest,
    Operation,
    OperationPhase,
    OperationRevision,
    OtherMarker,
    PriorityIntelReq,
    RequestForCollection,
    RequestForInformation,
    SensingLimitation,
    SensingLimitationToInformationCollectionDevice,
    SirHistory,
    SpecificIntelReq,
    SpecificIntelReqToNamedAreaInterestRelation,
    SpecificIntelReqToRequestForCollectionRelation,
    TargetAreaInterest,
    TargetAreaInterestToHighPriorityTargetRelation,
    TargetAreaInterestToNamedAreaInterestRelation,
    UserPreferences,
  ];
}

function countData() {
  const typeRefs = getTypeRefs();
  const objCounts = [];
  typeRefs.forEach((typeRef) => {
    objCounts.push({
      name: typeRef.name(),
      count: typeRef.fetchCount(),
    });
  });
  return objCounts;
}

function wipeData(appId) {
  const currentAppId = C3.app().id;
  if (appId != currentAppId) {
    throw Error("Provided appId '" + appId + "' does not match current environment application '" + currentAppId + "'.");
  }

  const typeRefs = getTypeRefs();
  typeRefs.forEach((typeRef) => {
    typeRef.removeAll(null, true);
  });
}

function loadSeedData() {
  C3.Pkg.upsertAllSeed();
}

function assignUsersToUnits(filter) {
  const users = User.fetch({
    filter: filter || "1 == 1",
  }).objs;
  const managingUnits = ManagingUnit.fetch().objs;
  const mod = Math.min(users.length, managingUnits.length);
  const daUsers = _.map(users, (u, i) => DaUser.make({
    id: u.id,
    user: u,
    managingUnit: managingUnits[i % mod]
  }));
  return DaUser.mergeBatch(daUsers);
}

function clearNotifications() {
  return DaNotification.removeAll(null, true);
}
