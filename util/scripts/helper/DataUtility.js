function exportData(exportName) {
  const baseUrl = FileUtility.getDataExportDirectory() + exportName;

  let exportSpec, exportJob;
  const exportInfo = {
    exportName: exportName,
    jobs: {},
  };

  const typeRefs = [
    AnnexL,
    AssetAssignment,
    AssetAssignmentToSpecificIntelReqRelation,
    Cocom,
    // CustomExpressionEngineFunction,
    DaArmament,
    DaEmitter,
    // DaEntity,
    DaNotification,
    DaNotificationAnnexL,
    DaNotificationCriterion,
    DaNotificationRfc,
    DaNotificationRfi,
    DaNotificationStatusHistory,
    DecisionPointMarker,
    GridColumnMetadata,
    HighPriorityTarget,
    HighPriorityTargetToIndicatorRelation,
    HighPriorityTargetToPriorityIntelReqRelation,
    HostileOrFriendlyMarker,
    // IcMapDisplayable,
    IcMapLine,
    IcMapMarker,
    IcMapOverlay,
    IcMapShape,
    // IcmHierarchy,
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
    // RowSortable,
    SensingLimitation,
    SensingLimitationToInformationCollectionDevice,
    SirHistory,
    SpecificIntelReq,
    SpecificIntelReqToNamedAreaInterestRelation,
    SpecificIntelReqToRequestForCollectionRelation,
    TargetAreaInterest,
    TargetAreaInterestToHighPriorityTargetRelation,
    TargetAreaInterestToNamedAreaInterestRelation,
    // TriggersCascadingDeletion,
    UserPreferences,
  ];

  _.each(typeRefs, (typeRef) => {
    try {
      exportSpec = BatchExportSpec.make({
        targetType: typeRef,
        numFiles: 1,
        fileUrlOrEncodedPathPrefix: baseUrl + "/" + typeRef + ".json",
      });

      exportJob = Export.startExport(exportSpec);
      exportInfo.jobs[typeRef.name()] = exportJob;
    } catch (e) {
      exportInfo.jobs[typeRef.name()] = e;
    }
  });

  return exportInfo;
}

function generateExportZipFile(exportName) {
  // Retrieve export files
  const fs = FileSystem.inst();
  const exportUrl = FileUtility.getDataExportDirectory() + exportName;
  const exportFiles = fs.listFiles(exportUrl).files;

  // Generate ZIP file
  const zipFileName = exportUrl + ".zip";
  const zipFile = fs.zipFiles(zipFileName, exportFiles);
  return GcsFile.make(zipFile.url).apiEndpoint("GET", true);
}

function deleteExport(exportName) {
  // Find and delete all export files
  const fs = FileSystem.inst();
  const exportUrl = FileUtility.getDataExportDirectory() + exportName;
  return fs.deleteFiles(exportUrl, true);
}

function importData(exportName) {
  // Retrieve export zip
  const fs = FileSystem.inst();
  const importDir = FileUtility.getDataImportDirectory();
  const zipFileName = importDir + exportName + ".zip";
  const exportZipFile = fs.listFiles(zipFileName).files[0];

  if (!exportZipFile) throw zipFileName + "not found";

  let typeName, importSpec, importJob;
  const importInfo = {
    exportName: exportName,
    jobs: {},
  };

  // Unzip file and retrieve JSON files
  exportZipFile.unzip();
  const exportFiles = fs
    .listFiles(importDir)
    .files.filter((f) => f.url.endsWith(".json"));

  _.each(exportFiles, (exportFile) => {
    try {
      typeName = exportFile.url.split("/").pop().replace(".json", "");
      importSpec = BatchImportSpec.make({
        targetType: typeName,
        fileUrlOrEncodedPathPrefix: exportFile.url,
      });
      importJob = Import.startImport(importSpec);
      importInfo.jobs[typeName] = importJob;
    } catch (e) {
      importInfo.jobs[typeName] = e;
    }
  });

  return importInfo;
}

function importICO(name, content, operationId) {
  var icoImportDir = FileUtility.getMapImportDirectory();
  var file = C3.File.createFile(
    icoImportDir + name.split(" ").join(""),
    content,
  );

  const format = file.url.split(".").pop();
  if (format === "kmz") {
    const unzipped = file.unzip();
    const kmlFile = unzipped
      .filter((file) => file.url.split(".").pop() === "kml")
      .first();
    file = C3.File.make(kmlFile);
  }
  const kmlString = file.readString();
  const geoJson = DataUtility.fromKmlToGeoJson(kmlString);

  // Unpack GeometryCollections
  let features = Array.from(geoJson.features) || [geoJson];
  features.forEach((feature) => {
    if (feature.geometry.type === "GeometryCollection") {
      try {
        const geometries = Array.from(feature.geometry.geometries);
        geometries.forEach((geometry, index) => {
          let newFeature = Object.assign({}, feature);
          newFeature = Object.assign(newFeature, {
            geometry: geometry,
            properties: {
              name: feature.properties.name + " - Part " + (index + 1),
            },
          });
          features.push(newFeature);
        });
      } catch (e) {
        /* empty */
      }
    }
  });

  return IcMapOverlay.upsertOverlay({
    name: name.split("." + format)[0],
    operation: operationId,
    notes: "This ICO was imported via the UI.",
    items: _.compact(
      features.map((feature, index) => {
        try {
          const payload = {
            name: feature.properties?.name || "Feature " + (index + 1),
            notes: feature.properties?.documentDescription,
            geoJson: feature,
            operation: operationId,
            description: "This feature was imported via the UI.",
          };
          if (feature.geometry.type === "Polygon") {
            const shapeType = getShapeType(payload.name);
            return IcMapShape.upsertShape(
              Object.assign({ kind: shapeType }, payload),
            );
          }
          if (feature.geometry.type === "Point") {
            const markerType = getMarkerType(payload.name);
            return IcMapMarker.upsertMarker(
              Object.assign(
                {
                  kind: markerType,
                  decisionOutputs: "This decision point was imported via the UI.",
                  location: DataUtility.convertLongLatToMgrs(
                    feature.geometry.coordinates[0],
                    feature.geometry.coordinates[1],
                  ),
                },
                payload,
              ),
            );
          }
          if (feature.geometry.type === "LineString") {
            return IcMapLine.upsertLine(payload);
          }
        } catch (e) {
          return null;
        }
      }),
    ),
    imported: true,
  });
}

function getShapeType(name) {
  if (name.includes(ShapeTypeEnum.NAI) || name.includes("Named"))
    return ShapeTypeEnum.NAI;
  if (
    name.includes(ShapeTypeEnum.TAI) ||
    name.includes("Target") ||
    name.includes("Objective")
  )
    return ShapeTypeEnum.TAI;
  return ShapeTypeEnum.OTHER;
}

function getMarkerType(name) {
  if (name.includes(MarkerTypeEnum.DECISION_POINT) || name.includes("Decision"))
    return MarkerTypeEnum.DECISION_POINT;
  return MarkerTypeEnum.OTHER;
}

function exportICO(type, id, exportFormat) {
  const c3typ = C3.pkg().typeMeta(type).toType();
  const ico = c3typ.fetch({
    filter: Filter.eq("id", id),
    include: "name, notes, geoJson, items.this",
  }).first();
  if (!ico) {
    return null;
  }
  const geoJson = ico.getGeoJson();

  if (exportFormat === "kml" || exportFormat === "kmz") {
    const kml = DataUtility.toKml(geoJson, {
      documentName: ico.name,
      documentDescription: ico.notes || "",
    });
    const file = writeKmlToFile(kml, ico.name);
    if (exportFormat === "kmz") {
      const fs = FileSystem.inst();
      const kmzFile = fs.zipFiles(file.url.replace(".kml", ".kmz"), [file]);
      return kmzFile.apiEndpoint("GET", true);
    }
    return file.apiEndpoint("GET", true);
  }
  return null;
}

function writeKmlToFile(kml, filename) {
  if (!filename) filename = "export";
  const filepath = FileUtility.getMapExportDirectory() +
    filename.split(" ").join("") +
    ".kml";
  const file = C3.File.make(filepath);
  const binary = C3.File.encode(kml, "application/vnd.google-earth.kml+xml");
  return file.write(binary);
}

function deleteMapImports() {
  const importUrl = FileUtility.getMapImportDirectory();
  return fs.deleteFiles(importUrl, true);
}

function deleteMapExports() {
  const exportUrl = FileUtility.getMapExportDirectory();
  return fs.deleteFiles(exportUrl, true);
}

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
      bytes /= 1024;
      i++;
  }
  return bytes.toFixed(2) + ' ' + units[i];
}
