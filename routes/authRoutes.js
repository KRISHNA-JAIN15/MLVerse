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

  // Get user credits
  router.get("/credits", authMiddleware.verifyToken, async (req, res) => {
    try {
      const user = await userOps.getUserById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      res.json({
        success: true,
        credits: user.credits || 0,
      });
    } catch (error) {
      console.error("Error getting user credits:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get credits",
      });
    }
  });

  return router;
};
