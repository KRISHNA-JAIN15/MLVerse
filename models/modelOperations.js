const { dynamodb, TABLE_NAME } = require("../config/aws/dynamoConfig");
const {
  PutCommand,
  QueryCommand,
  GetCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");

const modelOperations = {
  createModel: async (modelData) => {
    const { v4: uuidv4 } = await import("uuid");
    const modelId = uuidv4();
    const version = "v1"; // First version is always v1
    const versionNumber = 1;

    const params = {
      TableName: TABLE_NAME,
      Item: {
        userId: String(modelData.userId),
        modelId,
        baseModelId: modelId, // For the first version, baseModelId is the same as modelId
        version, // Sort key for versioning
        versionNumber,
        name: modelData.name,
        description: modelData.description,
        modelType: modelData.modelType,
        framework: modelData.framework,
        fileFormat: modelData.fileFormat,
        inputs: modelData.inputs,
        outputType: modelData.outputType,
        s3Key: modelData.s3Key,
        pricingType: modelData.pricingType || "free",
        creditsPerCall: modelData.creditsPerCall || 0,
        isActive: true, // First version is active by default
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    try {
      await dynamodb.send(new PutCommand(params));
      return { modelId, version, ...params.Item };
    } catch (error) {
      console.error("Error creating model metadata:", error);
      throw error;
    }
  },

  // Create a new version of an existing model
  createModelVersion: async (modelId, userId, versionData) => {
    try {
      // First, get all existing versions to determine the next version number
      const existingVersions = await modelOperations.getModelVersions(
        modelId,
        userId
      );

      if (existingVersions.length === 0) {
        throw new Error("Base model not found");
      }

      const latestVersion = Math.max(
        ...existingVersions.map((v) => v.versionNumber)
      );
      const newVersionNumber = latestVersion + 1;
      const newVersion = `v${newVersionNumber}`;

      // Create a unique record ID for this version (using original modelId + version suffix)
      const versionModelId = `${modelId}-${newVersion}`;

      console.log("Creating model version:", {
        modelId,
        userId,
        newVersion,
        inputsFromVersionData: versionData.inputs,
        inputsFromExisting: existingVersions[0].inputs,
        inputsCondition: versionData.inputs !== undefined,
        finalInputs:
          versionData.inputs !== undefined
            ? versionData.inputs
            : existingVersions[0].inputs,
      });

      const params = {
        TableName: TABLE_NAME,
        Item: {
          userId: String(userId),
          modelId: versionModelId, // Unique ID for this version
          baseModelId: modelId, // Reference to the original model
          version: newVersion,
          versionNumber: newVersionNumber,
          name: versionData.name || existingVersions[0].name,
          description:
            versionData.description || existingVersions[0].description,
          modelType: versionData.modelType || existingVersions[0].modelType,
          framework: versionData.framework || existingVersions[0].framework,
          fileFormat: versionData.fileFormat || existingVersions[0].fileFormat,
          inputs:
            versionData.inputs !== undefined
              ? versionData.inputs
              : existingVersions[0].inputs,
          outputType: versionData.outputType || existingVersions[0].outputType,
          s3Key: versionData.s3Key,
          pricingType:
            versionData.pricingType || existingVersions[0].pricingType,
          creditsPerCall:
            versionData.creditsPerCall || existingVersions[0].creditsPerCall,
          isActive: false, // New versions start as inactive
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      await dynamodb.send(new PutCommand(params));
      return { modelId: versionModelId, version: newVersion, ...params.Item };
    } catch (error) {
      console.error("Error creating model version:", error);
      throw error;
    }
  },

  getModelsByUser: async (userId) => {
    // Using Scan with FilterExpression since the table structure uses composite keys
    // Only return active versions for the user's model list
    const params = {
      TableName: TABLE_NAME,
      FilterExpression: "userId = :userId AND isActive = :isActive",
      ExpressionAttributeValues: {
        ":userId": String(userId),
        ":isActive": true,
      },
    };

    try {
      const result = await dynamodb.send(new ScanCommand(params));
      return result.Items;
    } catch (error) {
      console.error("Error getting models:", error);
      throw error;
    }
  },

  // Get all versions of a specific model
  getModelVersions: async (modelId, userId = null) => {
    // Always use Scan operation to search for baseModelId or direct modelId matches
    const params = {
      TableName: TABLE_NAME,
      FilterExpression: "(baseModelId = :modelId OR modelId = :modelId)",
      ExpressionAttributeValues: {
        ":modelId": modelId,
      },
    };

    // If userId provided, add user filter
    if (userId) {
      params.FilterExpression += " AND userId = :userId";
      params.ExpressionAttributeValues[":userId"] = String(userId);
    }

    try {
      const result = await dynamodb.send(new ScanCommand(params));
      return result.Items || [];
    } catch (error) {
      console.error("Error getting model versions:", error);
      throw error;
    }
  },

  // Get a specific version of a model
  getModelVersion: async (modelId, version, userId = null) => {
    // For version "v1", use the original modelId
    // For other versions, construct the versioned modelId
    const versionedModelId =
      version === "v1" ? modelId : `${modelId}-${version}`;

    const params = {
      TableName: TABLE_NAME,
      Key: {
        userId: String(userId),
        modelId: versionedModelId,
      },
    };

    try {
      const result = await dynamodb.send(new GetCommand(params));
      return result.Item;
    } catch (error) {
      console.error("Error getting model version:", error);
      throw error;
    }
  },

  // Get the active version of a model
  getActiveModelVersion: async (modelId) => {
    const params = {
      TableName: TABLE_NAME,
      FilterExpression:
        "(baseModelId = :modelId OR modelId = :modelId) AND isActive = :isActive",
      ExpressionAttributeValues: {
        ":modelId": modelId,
        ":isActive": true,
      },
    };

    try {
      const result = await dynamodb.send(new ScanCommand(params));
      return result.Items && result.Items.length > 0 ? result.Items[0] : null;
    } catch (error) {
      console.error("Error getting active model version:", error);
      throw error;
    }
  },

  // Set which version is active
  setActiveVersion: async (modelId, userId, activeVersion) => {
    try {
      // First, deactivate all versions
      const allVersions = await modelOperations.getModelVersions(
        modelId,
        userId
      );

      for (const version of allVersions) {
        const updateParams = {
          TableName: TABLE_NAME,
          Key: {
            userId: String(userId),
            modelId: version.modelId, // This will be either original modelId or modelId-vX
          },
          UpdateExpression: "SET isActive = :isActive, updatedAt = :updatedAt",
          ExpressionAttributeValues: {
            ":isActive": version.version === activeVersion,
            ":updatedAt": new Date().toISOString(),
          },
        };

        await dynamodb.send(new UpdateCommand(updateParams));
      }

      return true;
    } catch (error) {
      console.error("Error setting active version:", error);
      throw error;
    }
  },

  getModelById: async (modelId, userId) => {
    // For backward compatibility, get the active version
    const activeModel = await modelOperations.getActiveModelVersion(modelId);

    if (!activeModel) {
      return null;
    }

    // Verify ownership if userId provided
    if (userId && activeModel.userId !== String(userId)) {
      return null;
    }

    return activeModel;
  },

  // Get model by modelId only (for public access) - returns active version
  getModelByIdOnly: async (modelId) => {
    try {
      const activeModel = await modelOperations.getActiveModelVersion(modelId);
      return activeModel;
    } catch (error) {
      console.error("Error getting model by ID only:", error);
      throw error;
    }
  },

  // Get all models for marketplace (public access)
  getAllModels: async () => {
    const params = {
      TableName: TABLE_NAME,
      ProjectionExpression:
        "modelId, #n, description, inputs, framework, outputType, pricingType, creditsPerCall, createdAt, userId",
      ExpressionAttributeNames: {
        "#n": "name",
      },
    };

    try {
      const result = await dynamodb.send(new ScanCommand(params));
      return result.Items || [];
    } catch (error) {
      console.error("Error getting all models:", error);
      throw error;
    }
  },

  // Delete a model and all its versions
  deleteModel: async (modelId, userId) => {
    try {
      // First, get all versions of the model to verify ownership and get items to delete
      const allVersions = await modelOperations.getModelVersions(
        modelId,
        userId
      );

      if (allVersions.length === 0) {
        throw new Error("Model not found or not owned by user");
      }

      // Delete each version
      for (const version of allVersions) {
        const deleteParams = {
          TableName: TABLE_NAME,
          Key: {
            userId: String(userId),
            modelId: version.modelId, // This will be either original modelId or modelId-vX
          },
        };

        await dynamodb.send(new DeleteCommand(deleteParams));
      }

      return true;
    } catch (error) {
      console.error("Error deleting model:", error);
      throw error;
    }
  },
};

module.exports = modelOperations;
