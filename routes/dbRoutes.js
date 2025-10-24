const express = require("express");
const router = express.Router();

module.exports = (db) => {
  const dbController = require("../controllers/dbController")(db);

  router.get("/tables", dbController.listTables);
  router.post("/users/create-table", dbController.createUsersTable);

  return router;
};
