const express = require("express");
const router = express.Router();
const multer = require("multer");
const { s3Client, BUCKET_NAME } = require("../config/aws/s3Config");
const { Upload } = require("@aws-sdk/lib-storage");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const modelOperations = require("../models/modelOperations");
const authMiddleware = require("../middleware/authMiddleware");

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
      const { name, description, modelType, framework, inputs, outputType } =
        req.body;

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

module.exports = router;
