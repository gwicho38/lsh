function start_c3_env() {
  // For Armada it should be "prod" but for CTester it should be "dev"
  var mode = "prod";

  // Start the app
  var app = C3.env().startApp({
    "name": appName,
    "rootPkg": packageName,
    "mode": mode
  });
}
