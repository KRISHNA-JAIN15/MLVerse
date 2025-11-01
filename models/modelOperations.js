const { dynamodb, TABLE_NAME } = require("../config/aws/dynamoConfig");
const {
  PutCommand,
  QueryCommand,
  GetCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

const modelOperations = {
  createModel: async (modelData) => {
    const { v4: uuidv4 } = await import("uuid");
    const modelId = uuidv4();
    const params = {
      TableName: TABLE_NAME,
      Item: {
        modelId,
        userId: String(modelData.userId), // Convert userId to string
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
        createdAt: new Date().toISOString(),
      },
    };

    try {
      await dynamodb.send(new PutCommand(params));
      return { modelId, ...params.Item };
    } catch (error) {
      console.error("Error creating model metadata:", error);
      throw error;
    }
  },

  getModelsByUser: async (userId) => {
    const params = {
      TableName: TABLE_NAME,
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": String(userId), // Convert userId to string
      },
    };

    try {
      const result = await dynamodb.send(new QueryCommand(params));
      return result.Items;
    } catch (error) {
      console.error("Error getting models:", error);
      throw error;
    }
  },

  getModelById: async (modelId, userId) => {
    const params = {
      TableName: TABLE_NAME,
      Key: {
        modelId,
        userId,
      },
    };

    try {
      const result = await dynamodb.send(new GetCommand(params));
      return result.Item;
    } catch (error) {
      console.error("Error getting model:", error);
      throw error;
    }
  },

  // Get model by modelId only (for public access)
  getModelByIdOnly: async (modelId) => {
    const params = {
      TableName: TABLE_NAME,
      IndexName: "modelId-index", // Requires GSI on modelId
      KeyConditionExpression: "modelId = :modelId",
      ExpressionAttributeValues: {
        ":modelId": modelId,
      },
      Limit: 1,
    };

    try {
      const result = await dynamodb.send(new QueryCommand(params));
      return result.Items && result.Items.length > 0 ? result.Items[0] : null;
    } catch (error) {
      console.error("Error getting model by ID only:", error);
      // If GSI doesn't exist, fall back to scan (not recommended for production)
      console.log("Falling back to scan operation...");
      try {
        const scanParams = {
          TableName: TABLE_NAME,
          FilterExpression: "modelId = :modelId",
          ExpressionAttributeValues: {
            ":modelId": modelId,
          },
        };
        const scanResult = await dynamodb.send(new ScanCommand(scanParams));
        return scanResult.Items && scanResult.Items.length > 0
          ? scanResult.Items[0]
          : null;
      } catch (scanError) {
        console.error("Error in fallback scan:", scanError);
        throw scanError;
      }
    }
  },
};

module.exports = modelOperations;
