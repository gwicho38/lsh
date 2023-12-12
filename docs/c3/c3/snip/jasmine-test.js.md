# Jasmine Test Snippets


```js

// Running Jasmine Test
var fileName = "${TestName}.js";
console.log('start testing ' + filename);
var tesResult = TestRunner.testPath(MetadataStore.tag().files({isTest: true, path: '**/time/calendar/' + filename,})[0]) // note this is path from test dir
console.log('Done...')
console.log(testResult)
c3Grid(testResult)

```

## C3 Context

```js

var context = TestApi.createContext("console_test.js", null, [
	AnalyticsQueue,
    BatchQueue,
    CronQueue,
    CalcFieldsQueue,
    MetricDepsQueue
])

var adminGroup1 = AdminGroup.make({
      id: 'PTS.Group.OpenData.ThreatEngineerTest',
      name: 'PTS.Group.OpenData.ThreatEngineerTest',
      roles: [{ id: 'C3.Role.Console' }, 
		      { id: 'C3.Role.UiSdlAccessRole' }, 
		      { id: 'PTS.Role.OpenData.ThreatEngineer' }]
});

var testEntity = TestApi.createBatchEntity(context, 'AdminGroup', [adminGroup1])

var testUser = TestApi.upsertEntity(context, 'User', {
      id: 'test-user-threat-engineer'
});

TestApi.upsertBatchEntity(context, 'AdminGroup', [adminGroup1]);

TestApi.waitForSetup(context, null, 1, 60);

// before each
var groups = User.get(testUser.id).allGroups();
groups.forEach((group) => IdentityManager.removeUserFromGroup(testUser.id, group.id));

var expectedGroupsAdded = [adminGroup1.id];

expectedGroupsAdded.forEach((expectedGroupAdded) => {
	IdentityManager.addUserToGroup(testUser.id, expectedGroupAdded);
});

var groupsAdded = MDAUser.allGroupsForUser(testUser.id);
var groupsAddedIds = groupsAdded.map((group) => group.id);

var adminGroups = User.get(testUser.id).groups;
var adminGroupIds = adminGroups.map((adminGroup) => adminGroup.id);


```
