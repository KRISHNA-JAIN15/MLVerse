const dbRoutes = require("./dbRoutes");
const authRoutes = require("./authRoutes");
const userOperations = require("../models/userOperations");

module.exports = (db) => {
  const userOps = userOperations(db);

  const routes = {
    db: dbRoutes(db),
    auth: authRoutes(userOps),
  };

  return routes;
};
