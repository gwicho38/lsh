function set_app_permissions() {
  App.forId('<target-app-id>').callJson('User', 'upsert', User.myUser().toJson())
}

function terminate_app() {
  var app = App.forName("gurusearch")
C3.env().terminateApp(app, true)
}


function start_c3_app() {
  // For Armada it should be "prod" but for CTester it should be "dev"
  var mode = "prod";
  var packageName = "guruSearchUI";
  var mode = "DEV";

  // Start the app
  var app = C3.env().startApp({
    "name": appName,
    "rootPkg": packageName,
    "mode": mode
  });
}

AppUrl.make({'id': 'myfqdn.company.com', 'env': 'myenv', 'app': 'myapp'}).upsert()