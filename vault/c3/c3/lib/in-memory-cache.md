## Source Repo

https://github.com/c3-e/c3oilandgas/blob/v7.13-support/c3oilandgas/prodOptExt/src/kvstore/OilGasSensorLatestMeasurementStore.js

```js
/*
 * Copyright 2009-2021 C3 (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

/**
 * Global, thus far, hard-coded state for lambda definitions and "table name" for the in-mem store
 */
var keyStoreTableName = "OGSNSRLMS";
var logger = C3.logger('OGSNSRLMS_Log');

var logDebugMessage = function(message, verbosity) {
  if(OilGasSensorLatestMeasurementStoreConfig.inst().logDebugMessages && verbosity<=OilGasSensorLatestMeasurementStoreConfig.inst().debugMessageVerbosity) {
    if(OilGasSensorLatestMeasurementStoreConfig.inst().maximumDebugMessageLength>=0) {
      message = message.substr(0,OilGasSensorLatestMeasurementStoreConfig.inst().maximumDebugMessageLength-1);
    }
    logger.info(message);
  }
};

function getNodeNumberForTag(piTag) {

    var hash = 0;
    if (piTag.length == 0) {
        return hash;
    }
    for (var i = 0; i < piTag.length; i++) {
        var char = piTag.charCodeAt(i);
        hash = ((hash<<5)-hash)+char;
        hash = hash & hash; // Convert to 32bit integer
    }
    var size = OilGasSensorLatestMeasurementStore.nodeNames.length;
    logDebugMessage("nodeNames.length="+size,3);

    // AND-out the sign...
    return (hash & 0x7FFFFFFF)%size;
}

function getHannibalThreadNumber() {
  return JS.exec('java.lang.Thread.currentThread().getName().split("-")[1];');
}

function executeActionOnNode(typeName, actionName, bodyAsJSONString, nodeId, timeoutInSeconds) {
  var ipAddress = OilGasSensorLatestMeasurementStore.nodeAddresses[nodeId];
  return executeActionOnNodeByIP(typeName, actionName, bodyAsJSONString, ipAddress, timeoutInSeconds);
}

function reinitializeStoreIfNeeded() {
  if(!OilGasSensorLatestMeasurementStore.nodeNames || OilGasSensorLatestMeasurementStore.nodeNames.length == 0 || !OilGasSensorLatestMeasurementStore.kvStore) {
    localInitializeStore();
  }
}

function executeActionOnNodeByIP(typeName, actionName, bodyAsJSONString, ipAddress, timeoutInSeconds) {
  var context = c3Context();
  var tenant = context.tenant;
  var tag = context.tag;
  var numRetriesLeft = OilGasSensorLatestMeasurementStoreConfig.inst().numberRetriesPerExecuteActionCall;
  var defaultRESTTimeoutInSeconds = (timeoutInSeconds > 0 ? timeoutInSeconds : OilGasSensorLatestMeasurementStoreConfig.inst().defaultRESTTimeoutInSeconds);
  while(numRetriesLeft>0) {
      if(ipAddress) {
        var httpRequest = {
          method:'POST',
          uri:['http://',ipAddress,':8080/api/1/',tenant,'/',tag,'/',typeName,'?action=',actionName].join(''),
          headers:{
              "Cookie": ['"c3canonical=false; c3auth=',Authenticator.generateC3AuthToken(),'; c3tenant=',tenant,'; c3tag=',tag].join(''),
              "Accept": 'application/json',
              "Content-Type": 'application/json'},
          entity: bodyAsJSONString};
        logDebugMessage("[executeActionOnNode|HTTP Request]: uri=" + httpRequest.uri + ", entity=" + JSON.stringify(httpRequest.entity),3);
        try {
          var response = HttpInvoker.invoke(httpRequest,defaultRESTTimeoutInSeconds);
          logDebugMessage("[executeActionOnNode|HTTP Response]: StatusCode=" + response.statusCode + ", Entity=" + response.entity,3);
          if(response.statusCode>=400 && response.statusCode<500) {
            localInitializeStore();
          } else if(response.statusCode==200) {
            if(response.entity) {
              return JSON.parse(response.entity);
            } else {
              return;
            }
          }
        } catch(e) {
          logDebugMessage("[executeActionOnNode|HTTP Response]: EXCEPTION=" + e,2);
        }
      }
      logDebugMessage("[executeActionOnNode]: Retrying. numRetriesLeft=" + numRetriesLeft,3);
      numRetriesLeft-=1;
  }
  // If we got here then we ran out of retries. Let's assume that maybe our state of where the hash map nodes
  // are is now wrong (maybe some of them crashed?) and so we will reinitialize the local state to be safe
  //localInitializeStore();
}

function initializeStore() {
  Cluster.hosts(true).forEach(x=>{
    logDebugMessage('[initializeStore]: localInitializeStore on ' + x.nodeId + " with IP: " + x.ipAddress,2 );
    executeActionOnNodeByIP('OilGasSensorLatestMeasurementStore','localInitializeStore','',(x.ipAddress ? x.ipAddress : x.id),30);
  });
}

function localInitializeStore() {
  getKvStore();
  OilGasSensorLatestMeasurementStore.kvStore.upsertCollection(keyStoreTableName);
  logDebugMessage("[localInitializeStore]: (Thread number=" + getHannibalThreadNumber() + "]: Initializing ...",1);
  var hosts = {};
  OilGasSensorLatestMeasurementStore.nodeAddresses = {};
  OilGasSensorLatestMeasurementStore.nodeNames = [];
  Cluster.hosts(true).forEach(x=>{hosts[x.nodeId] = (x.ipAddress ? x.ipAddress : x.id);});
  OilGasSensorLatestMeasurementStoreNode.fetch({order: 'ascending(nodeOrder)'}).objs.forEach(x => {
    OilGasSensorLatestMeasurementStore.nodeAddresses[x.participatingNode] = hosts[x.participatingNode];
    OilGasSensorLatestMeasurementStore.nodeNames.push(x.participatingNode);
  });
  OilGasSensorLatestMeasurementStore.lastUpdateTimeStamp = 0;
  OilGasSensorLatestMeasurementStore.numberQueuedPuts = 0;
  OilGasSensorLatestMeasurementStore.putMapArray = [];
  logDebugMessage("[localInitializeStore]: Complete",2);
}

function getKvStore() {
  OilGasSensorLatestMeasurementStore.kvStore = InMemoryKvStore.inMemory({singleNode: true, maxSize: OilGasSensorLatestMeasurementStoreConfig.inst().maxNumberOfKeysInMap});
  return OilGasSensorLatestMeasurementStore.kvStore;
}

function localUpdateMeasurement(objArray) {
  logDebugMessage("[localUpdateMeasurement]: Called with objArray=" + JSON.stringify(objArray),3);
  reinitializeStoreIfNeeded();
  var b=objArray.map(x=>{return {id:x[0],updatedColumns:{value:x[1],timestamp:x[2]}};});
  var returnValue;
  try {
    logDebugMessage("[localUpdateMeasurement]: batch=" + JSON.stringify(b),3);
    returnValue = OilGasSensorLatestMeasurementStore.kvStore.putBatch(keyStoreTableName, b);
  } catch(e) {
    logDebugMessage("[localUpdateMeasurement]: Caught exception (" + e + "), trying again.",2);
    OilGasSensorLatestMeasurementStore.kvStore.upsertCollection(keyStoreTableName);
    returnValue = OilGasSensorLatestMeasurementStore.kvStore.putBatch(keyStoreTableName, b);
  }
  return returnValue;
}

function localGetMeasurements(sensorIds) {
  var result = [];
  reinitializeStoreIfNeeded();
  logDebugMessage("[localGetMeasurements]: sensorIds=" + JSON.stringify(sensorIds),3);
  sensorIds.forEach(x => {
    var r;
    try {
      r = OilGasSensorLatestMeasurementStore.kvStore.get(keyStoreTableName, x);
    } catch(e) {
      OilGasSensorLatestMeasurementStore.kvStore.upsertCollection(keyStoreTableName);
      r = OilGasSensorLatestMeasurementStore.kvStore.get(keyStoreTableName, x);
    }
    if(r){
      result.push([r.id,r.cols[0].value,r.cols[1].value]);
    }
  });
  logDebugMessage("[localGetMeasurements]: result=" + JSON.stringify(result),3);
  return result;
}

function updateMeasurement(sensorId, value, timestamp) {
  var nodeNumberForTag = getNodeNumberForTag(sensorId);
  var obj = [sensorId, value, timestamp];
  var config = OilGasSensorLatestMeasurementStoreConfig.inst();
  reinitializeStoreIfNeeded();
  //////////////////////////////////////////////
  OilGasSensorLatestMeasurementStore.numberQueuedPuts++;
  var sensorId = obj[0];
  logDebugMessage("putMapArray[" + nodeNumberForTag + "][" + sensorId + "] = " + obj,2);
  var putMapArray = OilGasSensorLatestMeasurementStore.putMapArray;
  if(!putMapArray[nodeNumberForTag]) {
    putMapArray[nodeNumberForTag] = {};
  }
  putMapArray[nodeNumberForTag][sensorId] = obj;
  logDebugMessage("numQueuedPuts=" + OilGasSensorLatestMeasurementStore.numberQueuedPuts +', maxPuts=' + config.maxPutCallsBeforeFlush,2);
  logDebugMessage("currentTime=" + DateTime.now().getMillis() +', lastUpdate=' + OilGasSensorLatestMeasurementStore.lastUpdateTimeStamp + ', maxTime=' + config.maxTimeBeforeFlushInMilliseconds,2);
  if(OilGasSensorLatestMeasurementStore.numberQueuedPuts>=config.maxPutCallsBeforeFlush || DateTime.now().getMillis()>=OilGasSensorLatestMeasurementStore.lastUpdateTimeStamp+config.maxTimeBeforeFlushInMilliseconds) {
    var putMapArrayCopy = [];
    logDebugMessage("putMapArray.length=" + putMapArray.length,2);
    for(var i=0;i<putMapArray.length;i++) {
      var tempArray = [];
      for(var sensorId in putMapArray[i]) {
        tempArray.push(putMapArray[i][sensorId]);
      }
      putMapArrayCopy.push(tempArray);
      if(tempArray.length>0) {
        executeActionOnNode('OilGasSensorLatestMeasurementStore','localUpdateMeasurement',JSON.stringify({objArray: tempArray}),OilGasSensorLatestMeasurementStore.nodeNames[i],OilGasSensorLatestMeasurementStoreConfig.inst().defaultRESTTimeoutInSeconds);
      } else {
        logDebugMessage("[updateMeasurement]: tempArray is empty (length is 0). THIS SHOULD NOT HAPPEN AND MEANS CONCURRENCY CONTROL IS FAILING",0);
      }
      putMapArray[i] = {};
    }

    logDebugMessage("Setting numberQueuedPuts to zero",2);
    OilGasSensorLatestMeasurementStore.numberQueuedPuts = 0;
    OilGasSensorLatestMeasurementStore.lastUpdateTimeStamp = DateTime.now().getMillis();
  }
}

function updateMeasurements(measurements) {
  var putMapArray = [];
  var config = OilGasSensorLatestMeasurementStoreConfig.inst();
  reinitializeStoreIfNeeded();
  for(var i=0;i<measurements.length;i++) {
    var measurement = measurements[i];
    var sensorId = measurement[0];
    var nodeNumberForTag = getNodeNumberForTag(sensorId);
    logDebugMessage("putMapArray[" + nodeNumberForTag + "][" + sensorId + "] = " + measurement,2);
    if(!putMapArray[nodeNumberForTag]) {
      putMapArray[nodeNumberForTag] = {};
    }
    putMapArray[nodeNumberForTag][sensorId] = measurement;
    logDebugMessage("putMapArray.length=" + putMapArray.length,2);
  }
  for(var i=0;i<putMapArray.length;i++) {
    var tempArray = [];
    for(var sensorId in putMapArray[i]) {
      tempArray.push(putMapArray[i][sensorId]);
    }
    if(tempArray.length>0) {
      executeActionOnNode('OilGasSensorLatestMeasurementStore','localUpdateMeasurement',JSON.stringify({objArray: tempArray}),OilGasSensorLatestMeasurementStore.nodeNames[i],OilGasSensorLatestMeasurementStoreConfig.inst().defaultRESTTimeoutInSeconds);
    }
  }

}

function getMeasurements(sensorIds) {
  var callMap = {};
  reinitializeStoreIfNeeded();
  for(var i=0;i<OilGasSensorLatestMeasurementStore.nodeNames.length;i++) {
    //TODO: Remove once we get comfortable that this implementation is stable
    logDebugMessage("callMap[" + i + "] = []",2);
    callMap[i] = [];
  }
  sensorIds.forEach(id => {
    logDebugMessage("callMap["+getNodeNumberForTag(id)+"].push("+id+")",2);
    var nodeNumberForTag = getNodeNumberForTag(id);
    logDebugMessage("[getMeasurements]: nodeNumber for Tag \"" + id + "\" is: " + nodeNumberForTag,1);
    callMap[nodeNumberForTag].push(id);
  });
  var result = {};
  for(var node in callMap) {
    if(callMap[node].length>0) {
      var array = callMap[node];
      var response = executeActionOnNode('OilGasSensorLatestMeasurementStore','localGetMeasurements',JSON.stringify({sensorIds: array}),OilGasSensorLatestMeasurementStore.nodeNames[node],OilGasSensorLatestMeasurementStoreConfig.inst().defaultRESTTimeoutInSeconds);
      if(response != undefined && response.value != undefined) {
        response.value.forEach(x=>{
          var measurementResult = SimpleSensorMeasurement.make({sensorId: x[0], value: x[1], timestamp: x[2]});
          result[measurementResult.sensorId] = measurementResult;
        });
      }
    }
  }
  var resultArray = sensorIds.map(x=>{return result[x];});
  return resultArray;
}
```
