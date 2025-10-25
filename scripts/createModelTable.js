const {
  DynamoDBClient,
  CreateTableCommand,
} = require("@aws-sdk/client-dynamodb");
require("dotenv").config();

const client = new DynamoDBClient({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim(),
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.trim(),
  },
});

const params = {
  TableName: "MLModels",
  KeySchema: [
    { AttributeName: "userId", KeyType: "HASH" }, // Partition key
    { AttributeName: "modelId", KeyType: "RANGE" }, // Sort key
  ],
  AttributeDefinitions: [
    { AttributeName: "userId", AttributeType: "S" },
    { AttributeName: "modelId", AttributeType: "S" },
  ],
  BillingMode: "PAY_PER_REQUEST", // On-demand capacity
};

const createTable = async () => {
  try {
    console.log("Using credentials:", {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID?.substring(0, 5) + "...",
      region: "ap-south-1",
    });
    const command = new CreateTableCommand(params);
    const result = await client.send(command);
    console.log("Table created successfully:", result);
  } catch (error) {
    if (error.name === "ResourceInUseException") {
      console.log("Table already exists");
    } else {
      console.error("Error creating table:", error);
    }
  }
};

createTable();
