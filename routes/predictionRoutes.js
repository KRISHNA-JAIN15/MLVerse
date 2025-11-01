const express = require("express");
const router = express.Router();
const modelOperations = require("../models/modelOperations");
const userOperations = require("../models/userOperations");
const authMiddleware = require("../middleware/authMiddleware");

// Database connection - this will be injected from app.js
let userOps;

// Initialize with database connection
const initializeRoutes = (db) => {
  userOps = userOperations(db);
  return router;
};

// Predict endpoint with credit management
router.post("/:modelId/predict", async (req, res) => {
  try {
    const apiKey = req.headers["x-api-key"] || req.headers["X-Api-Key"];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: "API Key required. Send in X-Api-Key header",
      });
    }

    const apiUser = await userOps.getUserByApiKey(apiKey);

    if (!apiUser) {
      return res.status(401).json({
        success: false,
        error: "Invalid API Key",
      });
    }

    const { modelId } = req.params;
    const inputData = req.body;

    // Get model metadata
    const model = await modelOperations.getModelByIdOnly(modelId);

    if (!model) {
      return res.status(404).json({
        success: false,
        error: "Model not found",
      });
    }

    // Check if model is paid and handle credits
    if (model.pricingType === "paid") {
      const creditsRequired = model.creditsPerCall || 1;

      // Check if user has enough credits
      if (apiUser.credits < creditsRequired) {
        return res.status(402).json({
          success: false,
          error: "Insufficient credits",
          required: creditsRequired,
          available: apiUser.credits,
        });
      }

      // Deduct credits from API user
      try {
        await userOps.deductCredits(apiUser.id, creditsRequired);

        // Add credits to model owner (if different from API user)
        if (parseInt(model.userId) !== apiUser.id) {
          await userOps.addCreditsToOwner(
            parseInt(model.userId),
            creditsRequired
          );
        }
      } catch (creditError) {
        return res.status(402).json({
          success: false,
          error: creditError.message,
        });
      }
    }

    // Validate input data against model schema
    const expectedInputs = model.inputs;
    if (!expectedInputs || !Array.isArray(expectedInputs)) {
      return res.status(500).json({
        success: false,
        error: "Model configuration error: Invalid input schema",
      });
    }

    // Check for missing required inputs
    const requiredInputNames = expectedInputs.map((input) => input.name);
    const missingInputs = requiredInputNames.filter(
      (name) => inputData[name] === undefined || inputData[name] === null
    );

    if (missingInputs.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required input fields: ${missingInputs.join(", ")}`,
      });
    }

    // Validate input types
    for (const expectedInput of expectedInputs) {
      const value = inputData[expectedInput.name];

      switch (expectedInput.type.toLowerCase()) {
        case "numeric":
          if (typeof value !== "number" || isNaN(value)) {
            return res.status(400).json({
              success: false,
              error: `Invalid type for input '${
                expectedInput.name
              }'. Expected 'numeric'. Received '${typeof value}'.`,
            });
          }
          break;
        case "categorical":
        case "text":
          if (typeof value !== "string" || value.trim() === "") {
            return res.status(400).json({
              success: false,
              error: `Invalid type for input '${expectedInput.name}'. Expected non-empty string.`,
            });
          }
          break;
        case "array":
          if (!Array.isArray(value)) {
            return res.status(400).json({
              success: false,
              error: `Invalid type for input '${expectedInput.name}'. Expected 'array'.`,
            });
          }
          break;
        default:
          break;
      }
    }

    // TODO: Replace with actual model prediction logic
    // For now, return a mock prediction
    const mockPrediction = {
      result: model.modelType === "Classification" ? "Predicted_Class_A" : 42.5,
      confidence: 0.85,
      modelInfo: {
        name: model.name,
        framework: model.framework,
        outputType: model.outputType,
      },
      inputEcho: inputData,
    };

    res.json({
      success: true,
      message: "Prediction successful",
      prediction: mockPrediction,
      creditsUsed: model.pricingType === "paid" ? model.creditsPerCall : 0,
      remainingCredits:
        model.pricingType === "paid"
          ? apiUser.credits - (model.creditsPerCall || 1)
          : apiUser.credits,
    });
  } catch (error) {
    console.error("Prediction error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error during prediction",
      details: error.message,
    });
  }
});

// Get model info (public endpoint)
router.get("/:modelId/info", async (req, res) => {
  try {
    const { modelId } = req.params;

    // Get model metadata without userId filter for public access
    const model = await modelOperations.getModelByIdOnly(modelId);

    if (!model) {
      return res.status(404).json({
        success: false,
        error: "Model not found",
      });
    }

    // Return public model information
    res.json({
      success: true,
      model: {
        modelId: model.modelId,
        name: model.name,
        description: model.description,
        modelType: model.modelType,
        framework: model.framework,
        inputs: model.inputs,
        outputType: model.outputType,
        pricingType: model.pricingType,
        creditsPerCall: model.creditsPerCall,
        createdAt: model.createdAt,
      },
    });
  } catch (error) {
    console.error("Get model info error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get model information",
    });
  }
});

module.exports = initializeRoutes;
