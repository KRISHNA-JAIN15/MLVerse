const mysql = require("mysql2/promise");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");

// --- Configuration from Environment Variables (set in serverless.yml) ---
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

const getUserByApiKey = async (apiKey) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      "SELECT id, api_key, credits FROM users WHERE api_key = ?",
      [apiKey]
    );
    return rows[0] || null;
  } finally {
    if (connection) await connection.end();
  }
};

const getModelMetadata = async (modelId, userId) => {
  const params = {
    TableName: DYNAMO_TABLE_NAME,
    Key: {
      userId: String(userId), // DynamoDB Partition Key is userId
      modelId: modelId,
    },
  };

  try {
    const result = await dynamodb.send(new GetCommand(params));
    return result.Item;
  } catch (error) {
    console.error("Error getting model metadata:", error);
    throw error;
  }
};

const authenticate = async (event) => {
  const apiKey = event.headers['x-api-key'] || event.headers['X-Api-Key'];
  if (!apiKey) {
    return { error: "API Key Missing (send in X-Api-Key header)", user: null };
  }

  const user = await getUserByApiKey(apiKey);
  if (!user || user.api_key !== apiKey) {
    return { error: "Invalid API Key", user: null };
  }

  // Simple check for credits authorization
  if (user.credits <= 0) {
    return { error: "Insufficient credits" };
  }

  return { error: null, user };
};

const parseBody = (event) => {
  try {
    if (!event.body) return null;
    return JSON.parse(event.body);
  } catch {
    return null;
  }
};


// --- Model Prediction Function ---

exports.predictModel = async (event) => {
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
        return respond(400, { success: false, error: "Model ID is required" });
    }
    
    const inputData = parseBody(event);
    if (!inputData) {
        return respond(400, { success: false, error: "Invalid JSON body provided" });
    }

    // 2. Fetch Model Metadata
    const modelMetadata = await getModelMetadata(modelId, userId);
    if (!modelMetadata) {
        return respond(404, { success: false, error: `Model with ID ${modelId} not found for this user` });
    }

    // 3. Input and Type Validation against DynamoDB Metadata
    const expectedInputs = modelMetadata.inputs; // Array of {name, type, description}

    // a. Check for missing required inputs
    const missingInputs = expectedInputs
      .map(input => input.name)
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
                    return respond(400, { success: false, error: `Invalid type for input '${expectedInput.name}'. Expected 'numeric'.` });
                }
                break;
            case 'categorical':
            case 'text':
                if (typeof value !== 'string' || value.trim() === '') {
                    return respond(400, { success: false, error: `Invalid type for input '${expectedInput.name}'. Expected 'text' or 'categorical' string.` });
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
    // *** In a real system, model download and inference would happen here ***
    
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
      message: "Prediction successful (MOCKED)",
      prediction: mockPrediction,
      modelInfo: {
          name: modelMetadata.name,
          framework: modelMetadata.framework,
          outputType: modelMetadata.outputType,
          apiEndpointExample: `website.user.modelname.version/models/${modelMetadata.modelId}/predict`
      }
    });

  } catch (error) {
    console.error("Prediction error:", error);
    return respond(500, {
      success: false,
      error: "Internal server error",
      details: error.message,
    });
  }
};


// --- CORS Handler (for OPTIONS requests) ---
exports.corsHandler = async (event) => {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Api-Key",
        "Access-Control-Allow-Methods": "OPTIONS,POST",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: "CORS enabled" }),
    };
  };