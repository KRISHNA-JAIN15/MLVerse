import { useState } from "react";
import {
  Container,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useAuth } from "../../context/useAuth";
import { API_CONFIG } from "../../config/api";

const Dashboard = () => {
  const { user, updateUserProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCopyApiKey = async () => {
    try {
      await navigator.clipboard.writeText(user?.api_key || "");
      setApiKeyCopied(true);
      setTimeout(() => setApiKeyCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy API key:", err);
      setError("Failed to copy API key");
    }
  };

  const handleRegenerateApiKey = async () => {
    setApiKeyLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REGENERATE_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: user.id }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const errorMessage =
          data.error || `HTTP error! status: ${response.status}`;
        console.error("Server response:", data);
        throw new Error(errorMessage);
      }

      // First update the API key in the backend
      const profileUpdateResult = await updateUserProfile({
        name: user.name,
        email: user.email,
        phone: user.phone,
        api_key: data.apiKey
      });

      if (profileUpdateResult.success) {
        // Update the local user state with the new API key
        if (profileUpdateResult.user) {
          user.api_key = data.apiKey; // Update the local user object
        }
        setSuccess("API key regenerated and saved successfully");
      } else {
        throw new Error(profileUpdateResult.error || "Failed to save the new API key to profile");
      }
    } catch (err) {
      console.error("Error regenerating API key:", err);
      setError("Failed to regenerate API key");
    } finally {
      setApiKeyLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const result = await updateUserProfile(formData);
      if (result.success) {
        setSuccess("Profile updated successfully");
        setEditing(false);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Welcome Section */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, display: "flex", flexDirection: "column" }}>
            <Typography variant="h4" gutterBottom>
              Welcome, {user?.name}
            </Typography>
            <Typography color="textSecondary">Email: {user?.email}</Typography>
            <Typography color="textSecondary">
              Credits: {user?.credits || 0}
            </Typography>
          </Paper>
        </Grid>

        {/* API Key Section */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}
          >
            <Typography variant="h6">API Key</Typography>
            <TextField
              fullWidth
              variant="outlined"
              type="text"
              value={user?.api_key || "No API key generated"}
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={handleCopyApiKey}
                      edge="end"
                      title={apiKeyCopied ? "Copied!" : "Copy API Key"}
                    >
                      <ContentCopyIcon
                        color={apiKeyCopied ? "success" : "default"}
                      />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleRegenerateApiKey}
              disabled={apiKeyLoading}
              startIcon={<RefreshIcon />}
            >
              {apiKeyLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Regenerate API Key"
              )}
            </Button>
          </Paper>
        </Grid>

        {/* Profile Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, display: "flex", flexDirection: "column" }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="h6">Profile Information</Typography>
              {!editing && (
                <Button variant="outlined" onClick={() => setEditing(true)}>
                  Edit Profile
                </Button>
              )}
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                margin="normal"
                fullWidth
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={!editing}
              />
              <TextField
                margin="normal"
                fullWidth
                label="Phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={!editing}
              />

              {editing && (
                <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                    sx={{ flex: 1 }}
                  >
                    {loading ? <CircularProgress size={24} /> : "Save Changes"}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setEditing(false);
                      setFormData({
                        name: user?.name || "",
                        phone: user?.phone || "",
                      });
                    }}
                    sx={{ flex: 1 }}
                  >
                    Cancel
                  </Button>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
