const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"; // In production, always use environment variable

const authMiddleware = {
  // Generate JWT token
  generateToken: (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
  },

  // Verify and decode JWT token
  verifyToken: (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "No token provided",
      });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: "Invalid token",
      });
    }
  },

  // Verify API key for model predictions
  verifyApiKey: (userOperations) => {
    return async (req, res, next) => {
      const apiKey = req.headers["x-api-key"] || req.headers["X-Api-Key"];

      if (!apiKey) {
        return res.status(401).json({
          success: false,
          error: "API Key required. Send in X-Api-Key header",
        });
      }

      try {
        const user = await userOperations.getUserByApiKey(apiKey);

        if (!user) {
          return res.status(401).json({
            success: false,
            error: "Invalid API Key",
          });
        }

        req.apiUser = user;
        next();
      } catch (error) {
        console.error("API Key verification error:", error);
        return res.status(500).json({
          success: false,
          error: "Authentication service error",
        });
      }
    };
  },

  // Decode token without verification (useful for non-critical operations)
  decodeToken: (token) => {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  },
};

module.exports = authMiddleware;
