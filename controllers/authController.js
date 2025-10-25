const authMiddleware = require("../middleware/authMiddleware");

const authController = (userOps) => ({
  signup: async (req, res) => {
    try {
      const { name, email, password } = req.body;

      if (!email || !password || !name) {
        return res
          .status(400)
          .json({ error: "Name, email and password are required" });
      }

      const user = await userOps.createUser({ name, email, password });

      const token = authMiddleware.generateToken({
        userId: user.id,
        email: user.email,
      });

      res.status(201).json({
        message: "User created successfully",
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          api_key: user.api_key,
          credits: user.credits,
          email_verified: user.email_verified,
          created_at: user.created_at,
        },
      });
    } catch (error) {
      if (error.message === "Email already exists") {
        return res.status(409).json({ error: error.message });
      }
      console.error("Signup error:", error);
      res.status(500).json({ error: "Error creating user" });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ error: "Email and password are required" });
      }

      const user = await userOps.verifyUser(email, password);

      const token = authMiddleware.generateToken({
        userId: user.id,
        email: user.email,
      });

      res.json({
        message: "Login successful",
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          api_key: user.api_key,
          credits: user.credits,
          created_at: user.created_at,
        },
      });
    } catch (error) {
      if (
        error.message === "User not found" ||
        error.message === "Invalid password"
      ) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      console.error("Login error:", error);
      res.status(500).json({ error: "Error during login" });
    }
  },

  logout: async (req, res) => {
    res.json({ message: "Logged out successfully" });
  },

  getCurrentUser: async (req, res) => {
    try {
      const userId = req.user.userId;

      // Get user from database using the userOps
      const user = await userOps.getUserById(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Return user data
      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          credits: user.credits,
          email_verified: user.email_verified,
          created_at: user.created_at,
          api_key: user.api_key,
        },
      });
    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({ error: "Failed to fetch user data" });
    }
  },

  updateProfile: async (req, res) => {
    try {
      const { name, email, phone, api_key } = req.body;
      const userId = req.user.userId;

      // Validate input
      if (!name || !email) {
        return res.status(400).json({ error: "Name and email are required" });
      }

      // Check if email is being changed and if it's already taken
      if (email !== req.user.email) {
        const existingUser = await userOps.getUserByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(409).json({ error: "Email already in use" });
        }
      }

      // Update user in database
      const updatedUser = await userOps.updateUser({
        id: userId,
        name,
        email,
        phone,
        api_key,
      });

      res.json({
        message: "Profile updated successfully",
        success: true,
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          credits: updatedUser.credits,
          email_verified: updatedUser.email_verified,
          created_at: updatedUser.created_at,
          api_key: updatedUser.api_key, // Include the API key in the response
        },
      });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  },
});

module.exports = authController;
