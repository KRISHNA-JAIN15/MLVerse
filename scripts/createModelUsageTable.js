const AWS = require("aws-sdk");

// Configure AWS
AWS.config.update({
  region: "ap-south-1", // Changed from "us-east-1" to match your Lambda region
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const dynamodb = new AWS.DynamoDB();

const createModelUsageTable = async () => {
  const params = {
    TableName: "ModelUsage",
    KeySchema: [
      {
        AttributeName: "usageId", // Changed from "id" to match Lambda handler
        KeyType: "HASH", // Partition key
      },
    ],
    AttributeDefinitions: [
      {
        AttributeName: "usageId", // Changed from "id"
        AttributeType: "S",
      },
      {
        AttributeName: "ownerId", // Changed from "modelOwnerId" to match Lambda
        AttributeType: "S",
      },
      {
        AttributeName: "timestamp",
        AttributeType: "S", // Changed from "N" to "S" to match Lambda (string timestamps)
      },
      {
        AttributeName: "modelId",
        AttributeType: "S",
      },
      {
        AttributeName: "userId",
        AttributeType: "S",
      },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "OwnerIdIndex", // Changed from "ModelOwnerIndex" to match Lambda
        KeySchema: [
          {
            AttributeName: "ownerId", // Changed from "modelOwnerId"
            KeyType: "HASH",
          },
          {
            AttributeName: "timestamp",
            KeyType: "RANGE",
          },
        ],
        Projection: {
          ProjectionType: "ALL",
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
      {
        IndexName: "ModelIndex",
        KeySchema: [
          {
            AttributeName: "modelId",
            KeyType: "HASH",
          },
          {
            AttributeName: "timestamp",
            KeyType: "RANGE",
          },
        ],
        Projection: {
          ProjectionType: "ALL",
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
      {
        IndexName: "UserIndex",
        KeySchema: [
          {
            AttributeName: "userId",
            KeyType: "HASH",
          },
          {
            AttributeName: "timestamp",
            KeyType: "RANGE",
          },
        ],
        Projection: {
          ProjectionType: "ALL",
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
    ],
    BillingMode: "PROVISIONED",
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
  };

  try {
    console.log("Creating ModelUsage table...");
    const result = await dynamodb.createTable(params).promise();
    console.log("ModelUsage table created successfully!");
    console.log(
      "Table Description:",
      JSON.stringify(result.TableDescription, null, 2)
    );

    // Wait for table to become active
    console.log("Waiting for table to become active...");
    await dynamodb
      .waitFor("tableExists", { TableName: "ModelUsage" })
      .promise();
    console.log("ModelUsage table is now active and ready to use!");
  } catch (error) {
    if (error.code === "ResourceInUseException") {
      console.log("ModelUsage table already exists!");
    } else {
      console.error("Error creating ModelUsage table:", error);
      throw error;
    }
  }
};

// Run the function
createModelUsageTable()
  .then(() => {
    console.log("Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
