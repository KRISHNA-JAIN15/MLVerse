import { useState, useEffect } from "react";
import {
  Container,
  Grid,
  Typography,
  Paper,
  Box,
  Alert,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Divider,
  IconButton,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import CodeIcon from "@mui/icons-material/Code";
import HttpIcon from "@mui/icons-material/Http";
import PaidIcon from "@mui/icons-material/Paid";
import FreeBreakfastIcon from "@mui/icons-material/FreeBreakfast";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SearchIcon from "@mui/icons-material/Search";
import { API_CONFIG } from "../config/api";

// Utility function to format input schema into a request body example
const generateRequestBody = (inputs) => {
  if (!inputs || inputs.length === 0) {
    return '{\n  "data": "Requires raw data upload (no structured inputs defined)"\n}';
  }

  const body = {};
  inputs.forEach((input) => {
    switch (input.type?.toLowerCase()) {
      case "numeric":
        body[input.name] = 10.5;
        break;
      case "categorical":
        body[input.name] = "category_A";
        break;
      case "text":
        body[input.name] = "Example input text";
        break;
      case "array":
        body[input.name] = [0.1, 0.2, 0.3];
        break;
      default:
        body[input.name] = null;
    }
  });

  return JSON.stringify(body, null, 2);
};

// Utility function to generate the prediction endpoint URL
const generateEndpointUrl = (modelId, version = "v1") => {
  return `${API_CONFIG.AWS_API_ENDPOINT}/models/${modelId}/${version}/predict`;
};

// --- Marketplace Model Card Component ---
const MarketplaceModelCard = ({ model }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [copied, setCopied] = useState(false);

  const isPaid = model.pricingType === "paid";
  const creditsPerCall = model.creditsPerCall || 0;
  const costLabel = isPaid ? `${creditsPerCall} credits/call` : "Free";
  const costIcon = isPaid ? <PaidIcon /> : <FreeBreakfastIcon />;

  const handleOpenModal = (type) => {
    setModalType(type);
    setModalOpen(true);
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const modalContent =
    modalType === "body"
      ? {
          title: "API Request Body Structure",
          content: generateRequestBody(model.inputs),
        }
      : {
          title: "Prediction Endpoint URL",
          content: generateEndpointUrl(model.modelId, model.version || "v1"),
        };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        border: isPaid ? 2 : 1,
        borderColor: isPaid ? "error.main" : "grey.300",
      }}
    >
      {/* Header and Cost */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="flex-start"
      >
        <Typography variant="h6" component="h2" fontWeight="bold">
          {model.name}
        </Typography>
        <Chip
          icon={costIcon}
          label={costLabel}
          color={isPaid ? "error" : "success"}
          size="small"
          sx={{ ml: 1, fontWeight: "bold" }}
        />
      </Box>

      <Typography variant="body2" color="textSecondary" gutterBottom>
        **ID:** {model.modelId}
      </Typography>

      {/* Version Information */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Chip
          label={`${model.version || "v1"} ${model.isActive ? "(Active)" : ""}`}
          size="small"
          color="primary"
          variant="outlined"
        />
        <Typography variant="caption" color="textSecondary">
          Version {model.versionNumber || 1}
        </Typography>
      </Box>

      {/* Metadata */}
      <Typography variant="body2">{model.description}</Typography>
      <Divider sx={{ my: 1 }} />

      <Box>
        <Typography variant="subtitle2" component="h3">
          Inputs ({model.inputs?.length || 0}):
        </Typography>
        <Box sx={{ mt: 0.5, display: "flex", flexWrap: "wrap", gap: 1 }}>
          {model.inputs?.map((input, index) => (
            <Chip
              key={index}
              label={`${input.name} (${input.type})`}
              size="small"
              variant="outlined"
              color="primary"
            />
          ))}
        </Box>
      </Box>

      <Typography variant="subtitle2" sx={{ mt: 1 }}>
        **Framework:** {model.framework} | **Output:** {model.outputType}
      </Typography>

      {/* Pricing Information */}
      <Box sx={{ mt: 1 }}>
        <Typography variant="subtitle2" component="div">
          **Pricing:**
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
          {isPaid ? (
            <>
              <PaidIcon color="error" fontSize="small" />
              <Typography variant="body2" color="error.main" fontWeight="bold">
                {creditsPerCall} credits per API call
              </Typography>
            </>
          ) : (
            <>
              <FreeBreakfastIcon color="success" fontSize="small" />
              <Typography
                variant="body2"
                color="success.main"
                fontWeight="bold"
              >
                Free to use
              </Typography>
            </>
          )}
        </Box>
      </Box>

      {/* Buttons */}
      <Box sx={{ mt: "auto", display: "flex", gap: 1, pt: 2 }}>
        <Button
          variant="contained"
          size="small"
          startIcon={<CodeIcon />}
          onClick={() => handleOpenModal("body")}
          sx={{ flexGrow: 1 }}
        >
          Req Body
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<HttpIcon />}
          onClick={() => handleOpenModal("endpoint")}
          sx={{ flexGrow: 1 }}
        >
          Endpoint
        </Button>
      </Box>

      {/* Modal Dialog */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{modalContent.title}</DialogTitle>
        <DialogContent dividers>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
              backgroundColor: "#f5f5f5",
              padding: "10px",
              borderRadius: "4px",
              position: "relative",
            }}
          >
            {modalContent.content}
          </pre>
          {copied && (
            <Chip
              label="Copied!"
              color="info"
              size="small"
              sx={{ position: "absolute", top: 15, right: 15 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <IconButton
            onClick={() => handleCopy(modalContent.content)}
            title="Copy to Clipboard"
          >
            <ContentCopyIcon />
          </IconButton>
          <Button onClick={() => setModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

// --- Main CommunityHub Component ---
const CommunityHub = () => {
  const [models, setModels] = useState([]);
  const [filteredModels, setFilteredModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [pricingFilter, setPricingFilter] = useState("all");
  const [frameworkFilter, setFrameworkFilter] = useState("all");

  useEffect(() => {
    const fetchModels = async () => {
      setError("");
      setLoading(true);

      try {
        // Fetch all models from the marketplace (AWS Lambda)
        const url = `${API_CONFIG.AWS_API_ENDPOINT}/models/list`;

        const fetchResponse = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!fetchResponse.ok) {
          const errorData = await fetchResponse.json();
          throw new Error(
            errorData.error || `HTTP Error! Status: ${fetchResponse.status}`
          );
        }

        const responseData = await fetchResponse.json();

        if (responseData.success === false) {
          throw new Error(responseData.error || "Failed to fetch models list");
        }

        setModels(responseData.models || []);
        setFilteredModels(responseData.models || []);
      } catch (err) {
        console.error("Error fetching models:", err);
        setError(err.message || "Failed to load models.");
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  // Filter models based on search term and filters
  useEffect(() => {
    let filtered = models;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (model) =>
          model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          model.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          model.framework.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Pricing filter
    if (pricingFilter !== "all") {
      filtered = filtered.filter((model) => {
        if (pricingFilter === "free") {
          return model.pricingType !== "paid";
        } else if (pricingFilter === "paid") {
          return model.pricingType === "paid";
        }
        return true;
      });
    }

    // Framework filter
    if (frameworkFilter !== "all") {
      filtered = filtered.filter(
        (model) => model.framework === frameworkFilter
      );
    }

    setFilteredModels(filtered);
  }, [models, searchTerm, pricingFilter, frameworkFilter]);

  const uniqueFrameworks = [...new Set(models.map((model) => model.framework))];
  const freeModelsCount = models.filter((m) => m.pricingType !== "paid").length;
  const paidModelsCount = models.filter((m) => m.pricingType === "paid").length;

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          height="200px"
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Typography variant="h4" component="h1" gutterBottom>
        ML Model Marketplace
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Discover and use machine learning models from the community. Use your
        API key to make predictions. Free models don't cost any credits, while
        paid models require credits per API call.
      </Alert>

      {/* Stats */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Paper elevation={1} sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="h4" fontWeight="bold" color="primary.main">
                {models.length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Models
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper
              elevation={1}
              sx={{
                p: 2,
                textAlign: "center",
                bgcolor: "success.light",
                color: "white",
              }}
            >
              <Typography variant="h4" fontWeight="bold">
                {freeModelsCount}
              </Typography>
              <Typography variant="body2">Free Models</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper
              elevation={1}
              sx={{
                p: 2,
                textAlign: "center",
                bgcolor: "error.light",
                color: "white",
              }}
            >
              <Typography variant="h4" fontWeight="bold">
                {paidModelsCount}
              </Typography>
              <Typography variant="body2">Paid Models</Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Filters */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filter Models
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search models..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Pricing</InputLabel>
              <Select
                value={pricingFilter}
                onChange={(e) => setPricingFilter(e.target.value)}
                label="Pricing"
              >
                <MenuItem value="all">All Models</MenuItem>
                <MenuItem value="free">Free Only</MenuItem>
                <MenuItem value="paid">Paid Only</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Framework</InputLabel>
              <Select
                value={frameworkFilter}
                onChange={(e) => setFrameworkFilter(e.target.value)}
                label="Framework"
              >
                <MenuItem value="all">All Frameworks</MenuItem>
                {uniqueFrameworks.map((framework) => (
                  <MenuItem key={framework} value={framework}>
                    {framework}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Results */}
      <Typography variant="h6" gutterBottom>
        Showing {filteredModels.length} models
      </Typography>

      {filteredModels.length === 0 ? (
        <Alert severity="warning">
          No models found matching your criteria.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredModels.map((model) => (
            <Grid item key={model.modelId} xs={12} sm={6} md={4}>
              <MarketplaceModelCard model={model} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default CommunityHub;
