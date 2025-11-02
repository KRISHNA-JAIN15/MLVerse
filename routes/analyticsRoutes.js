const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");

module.exports = (db) => {
  const router = express.Router();

  // Get analytics data for the authenticated user
  router.get("/", authMiddleware.verifyToken, async (req, res) => {
    try {
      const { timeRange = "30" } = req.query;
      const userId = req.user.userId;

      // Import analytics operations with database connection
      const analyticsOperations = require("../models/analyticsOperations")(db);

      // Get analytics data
      const analyticsData = await analyticsOperations.getUserAnalytics(
        userId,
        parseInt(timeRange)
      );

      res.json(analyticsData);
    } catch (error) {
      console.error("Error getting analytics:", error);
      res.status(500).json({
        error: "Failed to get analytics data",
        message: error.message,
      });
    }
  });

  // Get detailed model analytics
  router.get(
    "/model/:modelId",
    authMiddleware.verifyToken,
    async (req, res) => {
      try {
        const { modelId } = req.params;
        const { timeRange = "30" } = req.query;
        const userId = req.user.userId;

        // Import analytics operations with database connection
        const analyticsOperations = require("../models/analyticsOperations")(
          db
        );

        const modelAnalytics = await analyticsOperations.getModelAnalytics(
          userId,
          modelId,
          parseInt(timeRange)
        );

        res.json(modelAnalytics);
      } catch (error) {
        console.error("Error getting model analytics:", error);
        res.status(500).json({
          error: "Failed to get model analytics",
          message: error.message,
        });
      }
    }
  );

  return router;
};
