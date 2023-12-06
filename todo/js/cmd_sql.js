// switch to shared postgres environment
function v8_set_pg_shared() {
  Js.exec(`JdbcStoreConfig.forName("sql").clearConfigAndSecretOverride("ENV"); Server.restart();`)
}

function v8_validate_pg_data_store() {
  JdbcStoreConfig.forName("sql").credentials.datastore;
}
