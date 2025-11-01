const mysql = require("mysql2/promise");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  ScanCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb"); // Added QueryCommand

// --- Configuration from Environment Variables ---
const DYNAMO_TABLE_NAME = process.env.DYNAMO_TABLE_NAME || "MLModels";
const AWS_REGION = process.env.AWS_REGION || "ap-south-1";

// Database configuration (for authentication)
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

// DynamoDB Client setup
const dynamoClient = new DynamoDBClient({ region: AWS_REGION });
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);

// --- Utility Functions ---

// Helper function for consistent API response structure
const respond = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Credentials": true,
    "Content-Type": "application/json",
    ...headers,
  },
  body: JSON.stringify(body),
});

/**
 * Fetches user data based on the API Key.
 * Manages database connection lifespan within the Lambda context.
 */
const getUserByApiKey = async (apiKey) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      "SELECT id, api_key, credits FROM users WHERE api_key = ?",
      [apiKey]
    );
    return rows[0] || null;
  } catch (e) {
    console.error("MySQL Connection or Query Error during authentication:", e);
    throw new Error(`Database error during authentication: ${e.message}`);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

/**
 * Deduct credits from user account
 */
const debitCredits = async (userId, amount) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);

    // Check current credits first
    const [userRows] = await connection.execute(
      "SELECT credits FROM users WHERE id = ?",
      [userId]
    );

    if (!userRows[0] || userRows[0].credits < amount) {
      throw new Error("Insufficient credits");
    }

    // Deduct credits
    const [result] = await connection.execute(
      "UPDATE users SET credits = credits - ? WHERE id = ? AND credits >= ?",
      [amount, userId, amount]
    );

    if (result.affectedRows === 0) {
      throw new Error("Failed to deduct credits");
    }

    return true;
  } catch (e) {
    console.error("Error debiting credits:", e);
    throw e;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

/**
 * Add credits to model owner account
 */
const creditModelOwner = async (ownerId, amount) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);

    const [result] = await connection.execute(
      "UPDATE users SET credits = credits + ? WHERE id = ?",
      [amount, ownerId]
    );

    return result.affectedRows > 0;
  } catch (e) {
    console.error("Error crediting model owner:", e);
    throw e;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// --- NEW getModelMetadata ---
/**
 * Fetches model metadata from DynamoDB using ONLY the modelId.
 * This function now queries a Global Secondary Index (GSI) to find a model
 * by its 'modelId' regardless of the user who uploaded it.
 *
 * !!! IMPORTANT !!!
 * This requires a GSI to be configured on the 'MLModels' table in DynamoDB:
 * - Index Name: 'modelId-index' (must match 'IndexName' property below)
 * - Partition Key: 'modelId' (Type: String)
 * - Projections: 'ALL'
 */
const getModelMetadata = async (modelId) => {
  const params = {
    TableName: DYNAMO_TABLE_NAME,
    IndexName: "modelId-index", // <-- THIS GSI MUST EXIST IN DYNAMODB
    KeyConditionExpression: "modelId = :mid",
    ExpressionAttributeValues: {
      ":mid": modelId,
    },
    Limit: 1, // We only expect one model with this unique ID
  };

  try {
    // This will query the GSI, not the main table's primary key
    const result = await dynamodb.send(new QueryCommand(params)); // Query returns an array of items
    return result.Items && result.Items.length > 0 ? result.Items[0] : null;
  } catch (error) {
    console.error(
      "Error getting model metadata from DynamoDB (GSI Query):",
      error
    ); // Check for common errors like "ResourceNotFoundException" if the index is wrong
    if (error.name === "ResourceNotFoundException") {
      console.error(
        "FATAL: DynamoDB IndexName 'modelId-index' not found or table is incorrect. Please create the GSI."
      );
    }
    throw new Error(`DynamoDB GSI query failed: ${error.message}`);
  }
};

/**
 * Handles API Key authentication and credit check.
 */
const authenticate = async (event) => {
  const apiKey = event.headers["x-api-key"] || event.headers["X-Api-Key"];
  if (!apiKey) {
    if (!event.path || !event.path.endsWith("/users")) {
      return {
        error: "API Key Missing (send in X-Api-Key header)",
        user: null,
      };
    }
    return { error: null, user: null };
  }

  const user = await getUserByApiKey(apiKey);
  if (!user || user.api_key !== apiKey) {
    return { error: "Invalid API Key or user not found", user: null };
  }

  return { error: null, user };
};

/**
 * Safely parses the JSON body.
 */
const parseBody = (event) => {
  try {
    if (!event.body) return null;
    return JSON.parse(event.body);
  } catch (e) {
    console.error("Failed to parse request body:", e);
    return null;
  }
};

exports.listModels = async (event) => {
  console.log("Model list request started (Public Marketplace).");
  try {
    // Scan DynamoDB for ALL models (NO userId filter) - Public Marketplace
    const scanParams = {
      TableName: DYNAMO_TABLE_NAME,
      ProjectionExpression:
        "modelId, #n, description, inputs, framework, outputType, pricingType, creditsPerCall, createdAt, userId",
      ExpressionAttributeNames: {
        "#n": "name",
      },
    };

    const scanResult = await dynamodb.send(new ScanCommand(scanParams));

    return respond(200, {
      success: true,
      models: scanResult.Items || [],
      message: "Public marketplace - all models",
    });
  } catch (error) {
    console.error("FATAL List Models Error:", error);
    return respond(500, {
      success: false,
      error: "Internal server error. Failed to retrieve models list.",
      details: error.message,
    });
  }
};

exports.listMyModels = async (event) => {
  console.log("My Models request started (User's uploaded models).");
  try {
    // 1. Authentication required for user's models
    const authResult = await authenticate(event);
    if (authResult.error) {
      return respond(401, {
        success: false,
        error: authResult.error,
      });
    }

    const user = authResult.user;
    const userId = user.id.toString();

    // 2. Query DynamoDB for models uploaded by this specific user
    const queryParams = {
      TableName: DYNAMO_TABLE_NAME,
      KeyConditionExpression: "userId = :uid",
      ExpressionAttributeValues: {
        ":uid": userId,
      },
      ProjectionExpression:
        "modelId, #n, description, inputs, framework, outputType, pricingType, creditsPerCall, createdAt, userId",
      ExpressionAttributeNames: {
        "#n": "name",
      },
    };

    const queryResult = await dynamodb.send(new QueryCommand(queryParams));

    return respond(200, {
      success: true,
      models: queryResult.Items || [],
      message: `Models uploaded by user ${userId}`,
      count: queryResult.Count || 0,
    });
  } catch (error) {
    console.error("FATAL List My Models Error:", error);
    return respond(500, {
      success: false,
      error: "Internal server error. Failed to retrieve user's models.",
      details: error.message,
    });
  }
};

// --- NEW TEST FUNCTION: Test DynamoDB Connectivity ---

exports.testDynamo = async (event) => {
  console.log("DynamoDB Test started.");
  try {
    const params = {
      TableName: DYNAMO_TABLE_NAME,
      Limit: 1, // Just fetch one item to confirm connectivity
    }; // Attempt a Scan operation to force a connection to the DynamoDB service endpoint
    const result = await dynamodb.send(new ScanCommand(params));

    return respond(200, {
      success: true,
      message: "DynamoDB connectivity test successful.",
      itemCount: result.Items ? result.Items.length : 0,
      testData: result.Items
        ? result.Items[0]
        : "No items found. Connectivity confirmed.",
    });
  } catch (error) {
    console.error("FATAL DynamoDB Test Error:", error);
    return respond(500, {
      success: false,
      error:
        "DynamoDB Connectivity Failed (Check VPC Endpoint / IAM Permissions)",
      details: error.message,
    });
  }
};

// --- UPDATED Model Prediction Handler ---

exports.predictModel = async (event) => {
  console.log("Prediction request started.");
  try {
    // 1. Authentication and Authorization (API Key)
    // This confirms the user is valid and has credits
    const authResult = await authenticate(event);
    if (authResult.error) {
      const statusCode =
        authResult.error === "Insufficient credits" ? 402 : 401;
      return respond(statusCode, { success: false, error: authResult.error });
    }
    // We still get the user, as we may need it later (e.g., for debiting credits)
    const user = authResult.user; // const userId = user.id; // No longer needed for the lookup // Extract modelId from the dynamic path: /models/{modelId}/predict
    const modelId = event.pathParameters?.modelId;
    if (!modelId) {
      return respond(400, {
        success: false,
        error: "Model ID is required in path",
      });
    }
    const inputData = parseBody(event);
    if (
      inputData === null ||
      typeof inputData !== "object" ||
      Array.isArray(inputData)
    ) {
      return respond(400, {
        success: false,
        error:
          "Invalid or empty JSON body provided. Expected prediction data as JSON object.",
      });
    } // 2. Fetch Model Metadata (MODIFIED) // This now queries the GSI by 'modelId' ONLY, allowing any authenticated user // to find any model.

    const modelMetadata = await getModelMetadata(modelId); // MODIFIED Error Message
    if (!modelMetadata) {
      return respond(404, {
        success: false,
        error: `Model with ID ${modelId} not found.`,
      });
    } // 3. Input and Type Validation against DynamoDB Metadata

    const expectedInputs = modelMetadata.inputs;
    if (
      !expectedInputs ||
      !Array.isArray(expectedInputs) ||
      expectedInputs.length === 0
    ) {
      console.error(
        "Missing or invalid 'inputs' schema in DynamoDB metadata for model:",
        modelId
      );
      return respond(500, {
        success: false,
        error:
          "Model configuration error: Input schema not defined in metadata.",
      });
    } // a. Check for missing required inputs

    const requiredInputNames = expectedInputs.map((input) => input.name);
    const missingInputs = requiredInputNames.filter(
      (name) => inputData[name] === undefined || inputData[name] === null
    );

    if (missingInputs.length > 0) {
      return respond(400, {
        success: false,
        error: `Missing required input fields: ${missingInputs.join(", ")}`,
      });
    } // b. Simple type validation (rest of the logic...)

    for (const expectedInput of expectedInputs) {
      const value = inputData[expectedInput.name];
      switch (expectedInput.type.toLowerCase()) {
        case "numeric":
          if (typeof value !== "number" || isNaN(value)) {
            return respond(400, {
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
            return respond(400, {
              success: false,
              error: `Invalid type for input '${expectedInput.name}'. Expected non-empty string ('text' or 'categorical').`,
            });
          }
          break;
        case "array":
          if (!Array.isArray(value)) {
            return respond(400, {
              success: false,
              error: `Invalid type for input '${expectedInput.name}'. Expected 'array'.`,
            });
          }
          break;
        default:
          break;
      }
    } // 4. Model Loading and Prediction (MOCKED) + Credit Management

    // Check if model requires credits
    const isModelPaid = modelMetadata.pricingType === "paid";
    const creditsRequired = isModelPaid ? modelMetadata.creditsPerCall || 1 : 0;

    if (isModelPaid) {
      // Check if user has enough credits
      if (user.credits < creditsRequired) {
        return respond(402, {
          success: false,
          error: "Insufficient credits",
          required: creditsRequired,
          available: user.credits,
        });
      }

      // Deduct credits from user and add to model owner
      await Promise.all([
        debitCredits(user.id, creditsRequired),
        creditModelOwner(parseInt(modelMetadata.userId), creditsRequired),
      ]);
    }

    const mockPrediction = {
      result:
        modelMetadata.modelType === "Classification"
          ? "Predicted_Class_A"
          : 42.5,
      details: {
        modelName: modelMetadata.name,
        framework: modelMetadata.framework,
        inputEcho: inputData,
      },
    }; // 5. Return Result

    return respond(200, {
      success: true,
      message: "Prediction successful (MOCKED). Validation Passed.",
      prediction: mockPrediction,
      creditsUsed: creditsRequired,
      remainingCredits: user.credits - creditsRequired,
      modelInfo: {
        name: modelMetadata.name,
        framework: modelMetadata.framework,
        outputType: modelMetadata.outputType,
        pricingType: modelMetadata.pricingType,
        apiEndpointExample: `website.user.modelname.version/models/${modelMetadata.modelId}/predict`,
      },
    });
  } catch (error) {
    console.error("FATAL Prediction Error:", error);
    return respond(500, {
      success: false,
      error:
        "Internal server error. Check CloudWatch logs for DynamoDB/IAM issues.",
      details: error.message,
    });
  }
};

// --- CORS Handler (Existing) ---
exports.corsHandler = async (event) => {
  return respond(
    200,
    { message: "CORS enabled" },
    {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Api-Key",
      className: "styles.container",
      "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
      "Access-Control-Allow-Credentials": true,
    }
  );
};
