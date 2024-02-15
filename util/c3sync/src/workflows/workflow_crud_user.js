function setUsersFromEmail(email) {
    var user = User.fetch({include: "this, c3Groups, email, name", filter: `email == '${email}'`}).objs;
    var cuser = User.fetch({include: "this, c3Groups, email, name", filter: `email != '${email}' && name != 'worker'`}).objs;
    try {
        cuser.forEach(u => User.make({id: u.id, name: u.name, email: u.email, c3Groups: user.c3Groups}).upsert());
    } catch (e) {
        console.log(e);
    }

}

var userGroups = ["C3.AppAdmin", "Genai.AdminUser"];

var users = User.fetch({include: "this"}).objs;

users.forEach( function (u) {User.make({ id: u.id, name: u.name, email: u.email, c3Groups: userGroups}).upsert()})