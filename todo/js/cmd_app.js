function set_app_permissions() {
  App.forId('<target-app-id>').callJson('User', 'upsert', User.myUser().toJson())
}

function terminate_app() {
  var app = App.forName("gurusearch")
C3.env().terminateApp(app, true)
}
