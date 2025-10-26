const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

module.exports = (userOps) => {
  const authController = require("../controllers/authController");
  const controller = authController(userOps);

  // Public routes
  router.post("/signup", controller.signup);
  router.post("/login", controller.login);

  // Protected routes
  router.post("/logout", authMiddleware.verifyToken, controller.logout);
  router.get("/me", authMiddleware.verifyToken, controller.getCurrentUser);
  router.put(
    "/update-profile",
    authMiddleware.verifyToken,
    controller.updateProfile
  );
  router.post(
    "/regenerate-api-key",
    authMiddleware.verifyToken,
    controller.regenerateApiKey
  );

  return router;
};
