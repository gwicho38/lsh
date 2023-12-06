var userGroups = ["C3.AppAdmin", "Genai.AdminUser"];
var users = User.fetch({ include: "this" }).objs;

users.forEach(user => {
  User.make({
    id: user.id,
    name: user.name,
    email: user.email,
  }).withC3Groups(userGroups).upsert();
})

