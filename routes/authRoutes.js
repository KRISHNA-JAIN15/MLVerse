const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

module.exports = (userOps) => {
  const authController = require("../controllers/authController")(userOps);

  // Public routes
  router.post("/signup", authController.signup);
  router.post("/login", authController.login);

  // Protected routes
  router.post("/logout", authMiddleware.verifyToken, authController.logout);
  router.get("/me", authMiddleware.verifyToken, authController.getCurrentUser);
  router.put(
    "/update-profile",
    authMiddleware.verifyToken,
    authController.updateProfile
  );

  return router;
};
