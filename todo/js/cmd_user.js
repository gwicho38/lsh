function set_user_access() {
  var otherUserId = "<user hash>";
  var person_name = "<user name>";
  var group = UserGroup.forId('C3.EnvAdmin'); // C3.EnvAdmin can be replaced with desired role
  C3.app().callJson("User", "upsert", User.make(otherUserId).withName(person_name).withC3Groups([group]))
  App.forName('<app name>').callJson("User", "upsert", User.make(otherUserId).withName(person_name).withC3Groups([group]))
}
