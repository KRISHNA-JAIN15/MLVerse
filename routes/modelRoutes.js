const express = require("express");
const router = express.Router();
const multer = require("multer");
const { s3Client, BUCKET_NAME } = require("../config/aws/s3Config");
const { Upload } = require("@aws-sdk/lib-storage");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const modelOperations = require("../models/modelOperations");
const authMiddleware = require("../middleware/authMiddleware");

const PREDICTION_API_BASE_URL =
  process.env.PREDICTION_API_BASE_URL ||
  "https://iiits-cc-aws-model-api.execute-api.ap-south-1.amazonaws.com/dev";

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Check allowed file types
    const allowedTypes = [".pkl", ".h5", ".joblib", ".save", ".pt", ".pth"];
    const ext = file.originalname.toLowerCase().match(/\.[^.]*$/)[0];
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only ML model files are allowed."));
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  },
});

router.post(
  "/upload",
  authMiddleware.verifyToken,
  upload.single("model"),
  async (req, res) => {
    try {
      const { file } = req;
      const {
        name,
        description,
        modelType,
        framework,
        inputs,
        outputType,
        pricingType,
        creditsPerCall,
      } = req.body;

      // Upload file to S3
      const s3Key = `models/${req.user.userId}/${Date.now()}-${
        file.originalname
      }`;

      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: BUCKET_NAME,
          Key: s3Key,
          Body: file.buffer,
          ContentType: file.mimetype,
        },
      });

      await upload.done();

      // Store metadata in DynamoDB
      const modelData = {
        userId: req.user.userId,
        name,
        description,
        modelType,
        framework,
        fileFormat: file.originalname.match(/\.[^.]*$/)[0],
        inputs: JSON.parse(inputs),
        outputType,
        s3Key,
        pricingType: pricingType || "free",
        creditsPerCall:
          pricingType === "paid" ? parseInt(creditsPerCall) || 1 : 0,
      };

      const result = await modelOperations.createModel(modelData);
      res.status(201).json({
        message: "Model uploaded successfully",
        model: result,
      });
    } catch (error) {
      console.error("Error uploading model:", error);
      res.status(500).json({ error: "Failed to upload model" });
    }
  }
);

router.get("/list", authMiddleware.verifyToken, async (req, res) => {
  try {
    const models = await modelOperations.getModelsByUser(req.user.userId);
    res.json({ models });
  } catch (error) {
    console.error("Error getting models:", error);
    res.status(500).json({ error: "Failed to get models" });
  }
});

// New route for marketplace - shows all public models
router.get("/marketplace", async (req, res) => {
  try {
    const models = await modelOperations.getAllModels();
    res.json({ models });
  } catch (error) {
    console.error("Error getting marketplace models:", error);
    res.status(500).json({ error: "Failed to get marketplace models" });
  }
});

router.get("/:modelId", authMiddleware.verifyToken, async (req, res) => {
  try {
    const model = await modelOperations.getModelById(
      req.params.modelId,
      req.user.userId
    );
    if (!model) {
      return res.status(404).json({ error: "Model not found" });
    }
    res.json({ model });
  } catch (error) {
    console.error("Error getting model:", error);
    res.status(500).json({ error: "Failed to get model" });
  }
});

// New route to generate API endpoint for a model
router.post(
  "/:modelId/generate-api",
  authMiddleware.verifyToken,
  async (req, res) => {
    try {
      const { modelId } = req.params;
      const userId = req.user.userId;

      // Verify the model belongs to the user
      const model = await modelOperations.getModelById(modelId, userId);
      if (!model) {
        return res.status(404).json({ error: "Model not found" });
      }

      // Generate the API endpoint URL
      const apiEndpoint = `${PREDICTION_API_BASE_URL}/predict/${userId}/${modelId}`;

      // Return the API endpoint and model info
      res.json({
        message: "API endpoint generated successfully",
        apiEndpoint,
        model: {
          modelId: model.modelId,
          name: model.name,
          description: model.description,
          inputs: model.inputs,
          outputType: model.outputType,
          framework: model.framework,
          fileFormat: model.fileFormat,
        },
        usage: {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${req.user.token || "YOUR_API_KEY"}`,
          },
          body: {
            // Example based on model's input schema
            ...model.inputs.reduce((acc, input) => {
              acc[input.name] = `example_${input.type}`;
              return acc;
            }, {}),
          },
        },
      });
    } catch (error) {
      console.error("Error generating API endpoint:", error);
      res.status(500).json({ error: "Failed to generate API endpoint" });
    }
  }
);

module.exports = router;
