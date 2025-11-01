const dbRoutes = require("./dbRoutes");
const authRoutes = require("./authRoutes");
const modelRoutes = require("./modelRoutes");
const predictionRoutes = require("./predictionRoutes");
const userOperations = require("../models/userOperations");

module.exports = (db) => {
  const userOps = userOperations(db);

  const routes = {
    db: dbRoutes(db),
    auth: authRoutes(userOps),
    models: modelRoutes,
    predictions: predictionRoutes,
  };

  return routes;
};
