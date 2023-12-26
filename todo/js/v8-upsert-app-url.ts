var domainName = "localhost";
var appUrl = AppUrl.builder().id(domainName).env(C3.env().name).app(C3.app().name).build();
appUrl.upsert();
