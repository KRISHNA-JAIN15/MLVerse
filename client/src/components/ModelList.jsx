import { useState, useEffect } from "react";
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
} from "@mui/material";
import ApiIcon from "@mui/icons-material/Api";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useAuth } from "../context/useAuth";
import { API_CONFIG } from "../config/api";

const ModelList = () => {
  const { user } = useAuth();
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // API Generation Dialog
  const [apiDialogOpen, setApiDialogOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [apiGenerating, setApiGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MODELS.LIST}`,
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch models");
      }

      setModels(data.models || []);
    } catch (err) {
      console.error("Error fetching models:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateApi = async (model) => {
    setSelectedModel(model);
    setApiGenerating(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/models/${model.modelId}/generate-api`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${user.token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate API");
      }

      setApiEndpoint(data.apiEndpoint);
      setApiDialogOpen(true);
      setSuccess("API endpoint generated successfully!");
    } catch (err) {
      console.error("Error generating API:", err);
      setError(err.message);
    } finally {
      setApiGenerating(false);
    }
  };

  const handleCopyApiEndpoint = async () => {
    try {
      await navigator.clipboard.writeText(apiEndpoint);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy API endpoint:", err);
      setError("Failed to copy API endpoint");
    }
  };

  const handleCloseApiDialog = () => {
    setApiDialogOpen(false);
    setSelectedModel(null);
    setApiEndpoint("");
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="200px"
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h4">My Models</Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchModels}
          disabled={loading}
        >
          Refresh
        </Button>
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

      {models.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" color="textSecondary">
            No models uploaded yet.
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Upload your first ML model to get started.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {models.map((model) => (
            <Grid item xs={12} md={6} lg={4} key={model.modelId}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    {model.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ mb: 2 }}
                  >
                    {model.description}
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Chip
                      label={model.modelType}
                      size="small"
                      color="primary"
                      sx={{ mr: 1, mb: 1 }}
                    />
                    <Chip
                      label={model.framework}
                      size="small"
                      color="secondary"
                      sx={{ mr: 1, mb: 1 }}
                    />
                    <Chip
                      label={model.fileFormat}
                      size="small"
                      variant="outlined"
                      sx={{ mb: 1 }}
                    />
                  </Box>

                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Output:</strong> {model.outputType}
                  </Typography>

                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Inputs:</strong>
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {model.inputs?.map((input, index) => (
                      <Chip
                        key={index}
                        label={`${input.name} (${input.type})`}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>

                  <Typography
                    variant="caption"
                    color="textSecondary"
                    sx={{ mt: 1, display: "block" }}
                  >
                    Uploaded: {new Date(model.createdAt).toLocaleDateString()}
                  </Typography>
                </CardContent>

                <CardActions>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<ApiIcon />}
                    onClick={() => handleGenerateApi(model)}
                    disabled={apiGenerating}
                    fullWidth
                  >
                    {apiGenerating ? (
                      <CircularProgress size={16} />
                    ) : (
                      "Generate API"
                    )}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* API Endpoint Dialog */}
      <Dialog
        open={apiDialogOpen}
        onClose={handleCloseApiDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>API Endpoint for {selectedModel?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Your model API is ready! Use the endpoint below to make predictions.
          </Typography>

          <TextField
            fullWidth
            label="API Endpoint"
            value={apiEndpoint}
            InputProps={{
              readOnly: true,
              endAdornment: (
                <IconButton onClick={handleCopyApiEndpoint} edge="end">
                  <Tooltip title={copied ? "Copied!" : "Copy"}>
                    <ContentCopyIcon color={copied ? "success" : "action"} />
                  </Tooltip>
                </IconButton>
              ),
            }}
            sx={{ mt: 2, mb: 2 }}
          />

          <Typography variant="h6" gutterBottom>
            Usage Example:
          </Typography>
          <Box
            sx={{
              bgcolor: "grey.100",
              p: 2,
              borderRadius: 1,
              fontFamily: "monospace",
            }}
          >
            <Typography variant="body2">
              curl -X POST "{apiEndpoint}" \<br />
              &nbsp;&nbsp;-H "Content-Type: application/json" \<br />
              &nbsp;&nbsp;-H "Authorization: Bearer YOUR_API_KEY" \<br />
              &nbsp;&nbsp;-d '
              {JSON.stringify(
                selectedModel?.inputs?.reduce((acc, input) => {
                  acc[input.name] = `example_${input.type}`;
                  return acc;
                }, {}),
                null,
                2
              )}
              '
            </Typography>
          </Box>

          <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
            Replace YOUR_API_KEY with your actual API key from the dashboard.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseApiDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ModelList;
