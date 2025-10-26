const express = require("express");

module.exports = (userOps) => {
  const router = express.Router();

  const {
    getKey,
    paymentVerification,
    processPayment,
  } = require("./productController.js");

  router.route("/payment/process").post(processPayment);
  router.route("/getKey").get(getKey);
  router
    .route("/paymentVerification")
    .post((req, res) => paymentVerification(req, res, userOps));

  return router;
};
