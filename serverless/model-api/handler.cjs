const mysql = require("mysql2/promise");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");

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
 * Fetches model metadata from DynamoDB.
 */
const getModelMetadata = async (modelId, userId) => {
  const params = {
    TableName: DYNAMO_TABLE_NAME,
    Key: {
      userId: String(userId), // Partition Key (must match how stored in Node.js backend)
      modelId: modelId, // Sort Key
    },
  };

  try {
    const result = await dynamodb.send(new GetCommand(params));
    return result.Item;
  } catch (error) {
    console.error("Error getting model metadata from DynamoDB:", error);
    throw new Error(`DynamoDB lookup failed: ${error.message}`); 
  }
};

/**
 * Handles API Key authentication and credit check.
 */
const authenticate = async (event) => {
  const apiKey = event.headers['x-api-key'] || event.headers['X-Api-Key']; 
  if (!apiKey) {
    // For this simple example, we don't require an API key for 'listUsers' 
    // unless explicitly stated, but we keep it for 'predictModel'.
    if (!event.path) return { error: "API Key Missing (send in X-Api-Key header)", user: null };
    
    // Skip authentication for the new test endpoint if no key is provided
    if (event.path.endsWith("/users") && !apiKey) return { error: null, user: null }; 

    return { error: "API Key Missing (send in X-Api-Key header)", user: null };
  }

  const user = await getUserByApiKey(apiKey);
  
  if (!user || user.api_key !== apiKey) {
    return { error: "Invalid API Key or user not found", user: null };
  }
  
  if (user.credits <= 0) {
    return { error: "Insufficient credits", user: null };
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


// --- NEW: Function to List All Users from RDS ---

exports.listUsers = async (event) => {
    let connection;
    try {
        console.log("Listing all users from RDS...");
        // This endpoint doesn't require authentication for simple testing purposes
        
        connection = await mysql.createConnection(dbConfig);
        // WARNING: Do NOT select the password field!
        const [rows] = await connection.execute(
            "SELECT id, name, email, phone, api_key, credits, created_at FROM users"
        );

        return respond(200, {
            success: true,
            message: "Successfully retrieved all users from RDS.",
            userCount: rows.length,
            users: rows
        });

    } catch (error) {
        console.error("FATAL RDS Listing Error:", error);
        return respond(500, {
            success: false,
            error: "Internal server error. Failed to connect or query RDS.",
            details: error.message,
        });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}


// --- Model Prediction Handler (Existing) ---

exports.predictModel = async (event) => {
  console.log("Prediction request started.");
  try {
    // 1. Authentication and Authorization (API Key)
    const authResult = await authenticate(event);
    if (authResult.error) {
        const statusCode = authResult.error === "Insufficient credits" ? 402 : 401;
        return respond(statusCode, { success: false, error: authResult.error });
    }
    const user = authResult.user;
    const userId = user.id;

    // Extract modelId from the dynamic path: /models/{modelId}/predict
    const modelId = event.pathParameters?.modelId;
    if (!modelId) {
        return respond(400, { success: false, error: "Model ID is required in path" });
    }
    
    const inputData = parseBody(event);
    if (inputData === null || typeof inputData !== 'object' || Array.isArray(inputData)) {
        return respond(400, { success: false, error: "Invalid or empty JSON body provided. Expected prediction data as JSON object." });
    }

    // 2. Fetch Model Metadata
    const modelMetadata = await getModelMetadata(modelId, userId);
    if (!modelMetadata) {
        return respond(404, { success: false, error: `Model with ID ${modelId} not found for this user, or Model ID/User ID pair incorrect.` });
    }

    // 3. Input and Type Validation against DynamoDB Metadata
    const expectedInputs = modelMetadata.inputs; 
    
    if (!expectedInputs || !Array.isArray(expectedInputs) || expectedInputs.length === 0) {
        console.error("Missing or invalid 'inputs' schema in DynamoDB metadata for model:", modelId);
        return respond(500, { success: false, error: "Model configuration error: Input schema not defined in metadata." });
    }

    // a. Check for missing required inputs
    const requiredInputNames = expectedInputs.map(input => input.name);
    const missingInputs = requiredInputNames
      .filter(name => inputData[name] === undefined || inputData[name] === null);

    if (missingInputs.length > 0) {
      return respond(400, { success: false, error: `Missing required input fields: ${missingInputs.join(', ')}` });
    }

    // b. Simple type validation
    for (const expectedInput of expectedInputs) {
        const value = inputData[expectedInput.name];
        
        switch (expectedInput.type.toLowerCase()) {
            case 'numeric':
                if (typeof value !== 'number' || isNaN(value)) {
                    return respond(400, { success: false, error: `Invalid type for input '${expectedInput.name}'. Expected 'numeric'. Received '${typeof value}'.` });
                }
                break;
            case 'categorical':
            case 'text':
                if (typeof value !== 'string' || value.trim() === '') {
                    return respond(400, { success: false, error: `Invalid type for input '${expectedInput.name}'. Expected non-empty string ('text' or 'categorical').` });
                }
                break;
            case 'array':
                if (!Array.isArray(value)) {
                    return respond(400, { success: false, error: `Invalid type for input '${expectedInput.name}'. Expected 'array'.` });
                }
                break;
            default:
                break;
        }
    }
    
    // 4. Model Loading and Prediction (MOCKED)
    // Mock the prediction result
    const mockPrediction = {
        result: modelMetadata.modelType === "Classification" ? "Predicted_Class_A" : 42.5,
        details: {
            modelName: modelMetadata.name,
            framework: modelMetadata.framework,
            inputEcho: inputData 
        }
    }

    // 5. Return Result
    return respond(200, {
      success: true,
      message: "Prediction successful (MOCKED). Validation Passed.",
      prediction: mockPrediction,
      modelInfo: {
          name: modelMetadata.name,
          framework: modelMetadata.framework,
          outputType: modelMetadata.outputType,
          apiEndpointExample: `website.user.modelname.version/models/${modelMetadata.modelId}/predict`
      }
    });

  } catch (error) {
    console.error("FATAL Prediction Error:", error);
    return respond(500, {
      success: false,
      error: "Internal server error. Check CloudWatch logs for VPC/Database connection issues.",
      details: error.message,
    });
  }
};


// --- CORS Handler (Existing) ---
exports.corsHandler = async (event) => {
    return respond(200, { message: "CORS enabled" }, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Api-Key",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET", // Added GET
        "Access-Control-Allow-Credentials": true,
    });
  };
