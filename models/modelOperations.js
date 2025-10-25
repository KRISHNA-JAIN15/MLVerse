const { dynamodb, TABLE_NAME } = require("../config/aws/dynamoConfig");

const modelOperations = {
  createModel: async (modelData) => {
    const { v4: uuidv4 } = await import("uuid");
    const modelId = uuidv4();
    const params = {
      TableName: TABLE_NAME,
      Item: {
        modelId,
        userId: modelData.userId,
        name: modelData.name,
        description: modelData.description,
        modelType: modelData.modelType,
        framework: modelData.framework,
        fileFormat: modelData.fileFormat,
        inputs: modelData.inputs,
        outputType: modelData.outputType,
        s3Key: modelData.s3Key,
        createdAt: new Date().toISOString(),
      },
    };

    try {
      await dynamodb.put(params).promise();
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
        ":userId": userId,
      },
    };

    try {
      const result = await dynamodb.query(params).promise();
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
      const result = await dynamodb.get(params).promise();
      return result.Item;
    } catch (error) {
      console.error("Error getting model:", error);
      throw error;
    }
  },
};

module.exports = modelOperations;
