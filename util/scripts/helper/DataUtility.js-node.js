const tokml = require("@maphubs/tokml");
const togeojson = require("@tmcw/togeojson");
const xmldom = require("xmldom");
const mgrs = require("mgrs");

function toKml(geoJson, options) {
  return tokml(geoJson, options);
}

function fromKmlToGeoJson(kmlString) {
  const kml = new xmldom.DOMParser().parseFromString(kmlString);
  return togeojson.kml(kml);
}

function convertLongLatToMgrs(long, lat, accuracy) {
  const mgrsString = mgrs.forward([long, lat], accuracy);
  const gzdLength = mgrsString.length - (2 * accuracy) - 2;
  const mgrsType = {
    gridZoneDesignator: mgrsString.substring(0, gzdLength),
    gridSquareId: mgrsString.substring(gzdLength, gzdLength + 2),
    easting: mgrsString.substring(gzdLength + 2, gzdLength + 2 + accuracy),
    northing: mgrsString.substring(gzdLength + 2 + accuracy),
  };
  mgrsType.coordinate = [
    mgrsType.gridZoneDesignator || "",
    mgrsType.gridSquareId || "",
    ("00000" + mgrsType.easting).slice(-5) || "",
    ("00000" + mgrsType.northing).slice(-5) || "",
  ].join(" ");
  return mgrsType;
}
