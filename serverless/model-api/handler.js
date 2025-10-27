import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from 'stream';

// --- AWS Client Initialization ---
const region = process.env.AWS_REGION || 'ap-south-1';
const dynamoClient = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({ region });

const DYNAMODB_TABLE = process.env.DYNAMODB_TABLE;
const S3_BUCKET = process.env.S3_BUCKET;

// --- Helper: Get Model Metadata ---
async function getModelMetadata(userId, modelId) {
    const params = {
        TableName: DYNAMODB_TABLE,
        Key: {
            userId: String(userId), // Ensure userId is a string
            modelId: modelId,
        },
    };
    try {
        const command = new GetCommand(params);
        const result = await docClient.send(command);
        if (!result.Item) {
            console.error(`Model metadata not found for userId: ${userId}, modelId: ${modelId}`);
            return null;
        }
        console.log("Fetched metadata:", result.Item);
        return result.Item;
    } catch (error) {
        console.error("Error fetching from DynamoDB:", error);
        throw new Error("Could not retrieve model metadata.");
    }
}

// --- Helper: Download Model from S3 ---
async function downloadModel(s3Key) {
    const params = {
        Bucket: S3_BUCKET,
        Key: s3Key,
    };
    try {
        const command = new GetObjectCommand(params);
        const response = await s3Client.send(command);
        // response.Body is a ReadableStream (Node.js) or Web Stream
        // Convert stream to buffer for model loading libraries
        const streamToBuffer = (stream) =>
            new Promise((resolve, reject) => {
                const chunks = [];
                stream.on('data', (chunk) => chunks.push(chunk));
                stream.on('error', reject);
                stream.on('end', () => resolve(Buffer.concat(chunks)));
            });

        // Check if response.Body is Node.js Readable or Web Stream
        if (response.Body instanceof Readable) {
             return await streamToBuffer(response.Body);
        } else if (response.Body && typeof response.Body.getReader === 'function') {
            // Handle Web Stream (like in newer AWS SDK v3 versions or edge runtimes)
            const reader = response.Body.getReader();
            const chunks = [];
            let done = false;
            while (!done) {
                 const { value, done: readerDone } = await reader.read();
                 if (value) {
                     chunks.push(Buffer.from(value)); // Ensure conversion to Buffer
                 }
                 done = readerDone;
            }
             return Buffer.concat(chunks);
        } else {
            throw new Error('Unsupported S3 body stream type');
        }

    } catch (error) {
        console.error(`Error downloading model from S3 (Key: ${s3Key}):`, error);
        throw new Error("Could not download model file.");
    }
}


// --- Helper: Validate Input Data ---
function validateInput(requestData, inputSchema) {
    if (!inputSchema || !Array.isArray(inputSchema)) {
        console.warn("Input schema is missing or invalid in metadata.");
        return { isValid: true, validatedData: requestData, errors: [] }; // Or throw error if schema is mandatory
    }

    const errors = [];
    const validatedData = {};

    // Check if requestData is an object
     if (typeof requestData !== 'object' || requestData === null || Array.isArray(requestData)) {
         return { isValid: false, validatedData: null, errors: ["Request body must be a JSON object."] };
     }


    for (const schemaItem of inputSchema) {
        const { name, type, required = true } = schemaItem; // Assume required if not specified

        if (required && !(name in requestData)) {
            errors.push(`Missing required input field: '${name}'.`);
            continue;
        }

        if (name in requestData) {
            const value = requestData[name];
            let isValidType = false;

            switch (type.toLowerCase()) {
                case 'numeric':
                case 'number':
                    isValidType = typeof value === 'number' && !isNaN(value);
                    break;
                case 'string':
                case 'text':
                case 'categorical': // Often represented as strings
                    isValidType = typeof value === 'string';
                    break;
                case 'boolean':
                     isValidType = typeof value === 'boolean';
                     break;
                case 'array':
                    isValidType = Array.isArray(value);
                    break;
                case 'object':
                     isValidType = typeof value === 'object' && value !== null && !Array.isArray(value);
                     break;
                // Add more type checks as needed (e.g., 'image' might expect base64 string)
                default:
                    console.warn(`Unknown schema type '${type}' for field '${name}'. Allowing value.`);
                    isValidType = true; // Default to allow if type unknown
            }

            if (!isValidType) {
                errors.push(`Invalid type for field '${name}'. Expected '${type}', received '${typeof value}'.`);
            } else {
                validatedData[name] = value; // Add validated data
            }
        }
    }

     // Check for extra fields not defined in the schema (optional, depending on requirements)
     /*
     for (const key in requestData) {
         if (!inputSchema.some(item => item.name === key)) {
             errors.push(`Unexpected input field: '${key}'.`);
         }
     }
     */

    return { isValid: errors.length === 0, validatedData, errors };
}

// --- Placeholder: Model Loading & Prediction ---
// This needs to be implemented based on your specific model formats and libraries
async function runPrediction(modelBuffer, validatedData, modelMetadata) {
    console.log("Running prediction with data:", validatedData);
    console.log("Model format hint:", modelMetadata.fileFormat);
    console.log("Framework hint:", modelMetadata.framework);

    // ** !!! IMPORTANT IMPLEMENTATION REQUIRED !!! **
    // 1. Choose library based on modelMetadata.framework or modelMetadata.fileFormat
    //    (e.g., ONNX Runtime, TensorFlow.js, PyTorch (requires custom runtime/layer), scikit-learn (via ONNX/bridge))
    // 2. Load the model from `modelBuffer`.
    // 3. Preprocess `validatedData` if necessary (e.g., scaling, encoding).
    // 4. Run inference/prediction.
    // 5. Post-process the result if necessary.
    // 6. Return the prediction.

    // Example Placeholder: Replace with actual logic
    if (modelMetadata.framework === 'scikit-learn' && modelMetadata.fileFormat === '.pkl') {
         // You'd need a way to run python/joblib, e.g., a Lambda layer with python runtime + dependencies
         console.error("Predicting scikit-learn .pkl requires a Python runtime or bridge.");
         throw new Error("Prediction logic for scikit-learn .pkl not implemented.");
    } else if (modelMetadata.framework === 'TensorFlow' && modelMetadata.fileFormat === '.h5') {
         // Example using hypothetical tensorflow.js library (assuming it supports H5 or SavedModel format)
         // const tf = require('@tensorflow/tfjs-node'); // Needs to be packaged
         // const model = await tf.loadLayersModel('file://path/to/model'); // Need to save buffer to /tmp first
         console.error("Predicting TensorFlow .h5 requires TensorFlow.js or similar.");
         throw new Error("Prediction logic for TensorFlow .h5 not implemented.");
    } else {
        console.warn(`No specific prediction logic for framework '${modelMetadata.framework}' and format '${modelMetadata.fileFormat}'. Returning dummy data.`);
        return { prediction: "dummy_result", confidence: 0.95 }; // Replace with actual prediction
    }

    // Example return:
    // return { prediction: result };
}

// --- Lambda Handler ---
export const predict = async (event) => {
    console.log("Received event:", JSON.stringify(event, null, 2));

    const { userId, modelId } = event.pathParameters || {};
    let requestData;

    // Basic check for path parameters
    if (!userId || !modelId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Missing userId or modelId in path." }),
        };
    }

    // Parse request body
    try {
        if (!event.body) throw new Error("Request body is empty.");
        // API Gateway HTTP API might auto-parse JSON or pass base64 encoded string
        if (event.isBase64Encoded) {
             requestData = JSON.parse(Buffer.from(event.body, 'base64').toString('utf-8'));
        } else if (typeof event.body === 'string'){
             requestData = JSON.parse(event.body);
        } else {
             requestData = event.body; // Assume already parsed if not string/base64
        }
    } catch (error) {
        console.error("Error parsing request body:", error);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Invalid JSON in request body.", details: error.message }),
        };
    }

    try {
        // 1. Get Model Metadata from DynamoDB
        const modelMetadata = await getModelMetadata(userId, modelId);
        if (!modelMetadata) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: "Model not found." }),
            };
        }

        // 2. Validate Input Data
        const { isValid, validatedData, errors } = validateInput(requestData, modelMetadata.inputs);
        if (!isValid) {
            console.error("Input validation failed:", errors);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Input validation failed.", details: errors }),
            };
        }

        // 3. Download Model from S3
        const modelBuffer = await downloadModel(modelMetadata.s3Key);

        // 4. Load Model and Run Prediction (Requires specific implementation)
        const predictionResult = await runPrediction(modelBuffer, validatedData, modelMetadata);

        // 5. Return Prediction
        return {
            statusCode: 200,
            headers: {
                 "Content-Type": "application/json"
                 // Add CORS headers if needed, though API Gateway can handle this
                 // "Access-Control-Allow-Origin": "*",
                 // "Access-Control-Allow-Credentials": true,
            },
            body: JSON.stringify({
                message: "Prediction successful",
                prediction: predictionResult,
                modelInfo: { // Optionally return some model info
                    modelId: modelMetadata.modelId,
                    name: modelMetadata.name,
                    version: modelMetadata.version || 'v1' // Assuming a version field exists or defaulting
                }
             }),
        };

    } catch (error) {
        console.error("Prediction handler error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal server error during prediction.", details: error.message }),
        };
    }
};