var u = db.users.findOne({},{password:1,name:1,role:1,phone:1});
print(JSON.stringify(u));
