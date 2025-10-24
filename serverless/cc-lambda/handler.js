const mysql = require("mysql2/promise");
const crypto = require("crypto");

const corsHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:5173",
  "Access-Control-Allow-Credentials": true,
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,Origin",
};

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

// Debug logging
console.log("DB Config:", {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_DATABASE,
  // Don't log the password for security
});

const generateApiKey = () => {
  return crypto.randomBytes(32).toString("hex");
};

exports.regenerateApiKey = async (event) => {
  let connection;
  try {
    const userId = JSON.parse(event.body).userId;
    if (!userId) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true,
        },
        body: JSON.stringify({ error: "User ID is required" }),
      };
    }

    const newApiKey = generateApiKey();
    connection = await mysql.createConnection(dbConfig);

    const [result] = await connection.execute(
      "UPDATE users SET api_key = ? WHERE id = ?",
      [newApiKey, userId]
    );

    if (result.affectedRows === 0) {
      return {
        statusCode: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true,
        },
        body: JSON.stringify({ error: "User not found" }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        message: "API key regenerated successfully",
        apiKey: newApiKey,
      }),
    };
  } catch (error) {
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        error: "Internal server error",
        details: error.message,
        code: error.code,
      }),
    };
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Handle CORS preflight requests
exports.corsHandler = async (event) => {
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "OPTIONS,POST",
      "Access-Control-Allow-Credentials": true,
    },
    body: JSON.stringify({ message: "CORS enabled" }),
  };
};
