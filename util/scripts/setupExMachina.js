/*
 * Copyright 2009-2022 C3 (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

c3ImportAll();

var usingDocker = true;
var mailSendMode = "local"; // Use "null" if you're only doing backend development. "local" will forward emails to port 1025 (MailCatcher)
var uploadFilesLocally = true;
var password = 'Password1';

function validateProvisionSuccess() {
  if (Console.summarizeIssues().hasError) {
    throw new Error('Did not provision successfully');
  }
}

function setupVanityUrl(tenant) {
  VanityUrl.upsert({
    id: 'exmachina.local',
    name: 'exmachina.local',
    tenant: tenant,
    anonymousUser: true,
    tag: 'test',
    defaultContent: 'index.html'
  });
}

function setupEmail() {
  TenantConfig.upsert({ id: "EmailSendMode", value: mailSendMode });
}

var createProject = function(id, graph) {
  var project = ExMachinaProjectRoot.get(id);

  if (!project) {
    var fakeGraph = { nodeDefinitions:[], groups:[], graphMigrationVersion:1 };
    var id = ExMachinaProjectRoot.create({
      id: id,
      name: id,
      kind: ExMachinaProjectKind.STANDARD,
      account: ExMachinaAccount.fetch().first().id,
    }).id;

    var project = ExMachinaProject.create({
      root: { id: id },
      definition: graph || fakeGraph,
    });

    ExMachinaProjectRoot.merge({
      id: id,
      currentHead: project,
    });
  }
  var url = "http://localhost:10012/exmac/ui/?project=" + id;
  console.log('Access project at', url);
}

function setupTests(tenant) {
  if (usingDocker) {
    WebDriverProtocol.setApiUrlAndAuth('http://localhost:4444/wd/hub/');
  }

  ClusterConfig.make().setConfigValue('canonicalUrlScheme', 'http');
  ClusterConfig.make().setConfigValue('canonicalUrlDomain', 'dev-local.test');
  var testDomain = 'exmachina.test.local';
  VanityUrl.upsert({
    id: testDomain,
    name: testDomain,
    tenant: tenant,
    anonymousUser: true,
    tag: 'test',
    defaultContent: 'index.html'
  });
  var ctx = TestApi.createContext('testcontext');
  TestApi.spyOn(ctx, 'TestApi', 'setupVanityUrl').returnValue('http://' + testDomain + ':8080').register();
}

function setupSharedCredential() {
  // Files uploaded via the CSV, JSON, etc nodes will be uploaded the c3server file storage
  if (uploadFilesLocally) {
    DataConnectorCredentialManagement.createSharedFileStorageCredential({
      accountId: '',
      secretKey: '',
      filePathPrefix: 'dataset-storage',
      datastore: 'c3',
    })
  }
}

function setActionResultConfiguration() {
  var mountUrl = FileSystem.mounts().DEFAULT + 'dataset-storage';
  FileSystem.setMount('EXMFILES', mountUrl);
}

function standAloneExMachinaSetup() {
  function setupStripe() {
    // Note: Below, change the URL from "exmachina.local" to "exmachina.test.local" during LukeBrowser tests:
    StripeApiConfig.make().setConfigValue('successRedirectUrl', 'http://exmachina.local:8080/exmachina/stripe-success');
    StripeApiConfig.make().setConfigValue('cancelRedirectUrl', 'http://exmachina.local:8080/exmachina/stripe-cancel');
    StripeApiConfig.make().setConfigValue('publicApiKey', "pk_test_1hnZkukLJN94fPHh6WUPIGZW");
    StripeApi.make().config().setSecretValue('auth', 'Bearer sk_test_BPkRs8aVHgPY17MXsmNS5xhj');

    VertexGenerateTokenConfig.setConfigValues('REST-API-C3.ai', '75f0dd6695921ebc06cd4194c893f294', '4d8ce4f0b0a74ef98a6d6fc75b607d6d', 't{9L%8Xw');
  }

  function setupCronJobs() {
    CronJob.mergeBatch([
      { "id": "ex-machina-cost-calculation", "inactive": false },
      { "id": "ex-machina-report-monthly-usage", "inactive": false }
    ])
  }

  function signupFreeTrialUser(email) {
    user = User.get(email);
    if (!user) {
      ExMachinaUserManagement.signup({ email, givenName: email, familyName: email, agree: true });
      token = UserRegistration.fetch({ filter: Filter.eq("email", email) }).objs[0].token;
      TestRunner.asUser(User.get('AnonymousUser'), Lambda.fromJavaScript(function (token, email, password) {
        ExMachinaUserManagement.complete({
          id: token,
          email: email,
          password: password,
          confirmPassword: password,
          agree: true,
        });
      }).partiallyCall([token, email, password]));
    }
  }

  function signupTeamUser(email) {
    user = User.get(email);
    if (!user) {
      signupFreeTrialUser(email);
      account = ExMachinaAccount.fetch({ order: 'descending(meta.created)', limit: 1 }).first();
      ExMachinaAccountPaymentCredits.addCreditsToAccount(account.id, 1000); // Upgrade a user to the Team plan without going through Stripe/Vertex
      TestRunner.asUser(User.get(email), Lambda.fromJavaScript(function (account, email) {
        ExMachinaAccount.setForCurrentUser(account);
        ExMachinaAccount.subscribe(null, 'team_plan', email);
      }).partiallyCall([account, email]));
    }
  }

  validateProvisionSuccess();
  setupVanityUrl('standAloneExMachina');
  setupEmail();
  setupStripe();
  setupCronJobs();
  setupTests('standAloneExMachina');
  signupFreeTrialUser('1@c3.ai')
  createProject('test-project');
  setupSharedCredential();
  setActionResultConfiguration();
}

function integratedExMachinaSetup() {
  function addUser(userId) {
    var user = User.get(userId);
    if (!user) {
      IdentityManager.createUser(userId, "Test", "User", userId);
      IdentityManager.addUserToGroup(userId, "ExMachinaManagement.Group.BasicUser");
      IdentityManager.setPassword(userId, password);
      ExMachinaAdmin.addTeamMember(userId, "ADMIN");
    }
  }

  validateProvisionSuccess();
  setupVanityUrl('integratedExMachina');
  setupEmail();
  setupTests('integratedExMachina');
  setupSharedCredential();
  setActionResultConfiguration();
  addUser('1@c3.ai');
}

eval(c3Context().tenant + 'Setup()');
