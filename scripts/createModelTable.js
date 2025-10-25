const AWS = require("aws-sdk");
require("dotenv").config();

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const dynamodb = new AWS.DynamoDB();

const params = {
  TableName: "MLModels",
  KeySchema: [
    { AttributeName: "modelId", KeyType: "HASH" }, // Partition key
    { AttributeName: "userId", KeyType: "RANGE" }, // Sort key
  ],
  AttributeDefinitions: [
    { AttributeName: "modelId", AttributeType: "S" },
    { AttributeName: "userId", AttributeType: "S" },
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 5,
    WriteCapacityUnits: 5,
  },
};

const createTable = async () => {
  try {
    const result = await dynamodb.createTable(params).promise();
    console.log("Table created successfully:", result);
  } catch (error) {
    if (error.code === "ResourceInUseException") {
      console.log("Table already exists");
    } else {
      console.error("Error creating table:", error);
    }
  }
};

createTable();
