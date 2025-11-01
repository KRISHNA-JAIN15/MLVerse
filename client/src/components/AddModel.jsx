import { useState } from "react";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Grid,
  Chip,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  Divider,
  Stack,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { API_CONFIG } from "../config/api";
import { useAuth } from "../context/useAuth";

const MODEL_TYPES = [
  "Classification",
  "Regression",
  "Clustering",
  "Neural Network",
  "Other",
];
const FRAMEWORKS = [
  "scikit-learn",
  "TensorFlow",
  "PyTorch",
  "XGBoost",
  "Other",
];
const INPUT_TYPES = ["numeric", "categorical", "text", "image", "array"];

const AddModel = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modelFile, setModelFile] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    modelType: "",
    framework: "",
    outputType: "",
    inputs: [],
    pricingType: "free",
    creditsPerCall: 1,
  });

  const [inputField, setInputField] = useState({
    name: "",
    type: "numeric",
    description: "",
  });

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = [".pkl", ".h5", ".joblib", ".save", ".pt", ".pth"];
    const fileExt = file.name.toLowerCase().match(/\.[^.]*$/)?.[0];

    if (!allowedTypes.includes(fileExt)) {
      setError("Invalid file type. Only ML model files are allowed.");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setError("File size too large. Maximum size is 100MB.");
      return;
    }

    setModelFile(file);
    setError("");
  };

  const handleInputAdd = () => {
    if (!inputField.name || !inputField.type) {
      setError("Input name and type are required");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      inputs: [...prev.inputs, inputField],
    }));

    setInputField({
      name: "",
      type: "numeric",
      description: "",
    });
    setError("");
  };

  const handleInputDelete = (index) => {
    setFormData((prev) => ({
      ...prev,
      inputs: prev.inputs.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (!modelFile) {
        throw new Error("Please select a model file");
      }

      if (
        !formData.name ||
        !formData.modelType ||
        !formData.framework ||
        !formData.outputType
      ) {
        throw new Error("Please fill in all required fields");
      }

      if (formData.inputs.length === 0) {
        throw new Error("Please add at least one input specification");
      }

      if (
        formData.pricingType === "paid" &&
        (!formData.creditsPerCall || formData.creditsPerCall < 1)
      ) {
        throw new Error("Please specify credits per call (minimum 1)");
      }

      const formPayload = new FormData();
      formPayload.append("model", modelFile);
      formPayload.append("name", formData.name);
      formPayload.append("description", formData.description);
      formPayload.append("modelType", formData.modelType);
      formPayload.append("framework", formData.framework);
      formPayload.append("outputType", formData.outputType);
      formPayload.append("inputs", JSON.stringify(formData.inputs));
      formPayload.append("pricingType", formData.pricingType);
      if (formData.pricingType === "paid") {
        formPayload.append("creditsPerCall", formData.creditsPerCall);
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/models/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
        body: formPayload,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload model");
      }

      setSuccess("Model uploaded successfully!");

      // Reset form
      setFormData({
        name: "",
        description: "",
        modelType: "",
        framework: "",
        outputType: "",
        inputs: [],
        pricingType: "free",
        creditsPerCall: 1,
      });
      setModelFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
          Upload ML Model
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert
            severity="success"
            sx={{ mb: 3 }}
            onClose={() => setSuccess("")}
          >
            {success}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          {/* File Upload Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Model File
            </Typography>
            <Button
              variant="outlined"
              component="label"
              fullWidth
              startIcon={<CloudUploadIcon />}
              sx={{
                py: 2,
                borderStyle: "dashed",
                borderWidth: 2,
                "&:hover": { borderStyle: "dashed", borderWidth: 2 },
              }}
            >
              {modelFile
                ? modelFile.name
                : "Choose Model File (.pkl, .h5, .joblib, .pt, .pth)"}
              <input
                type="file"
                hidden
                onChange={handleFileChange}
                accept=".pkl,.h5,.joblib,.save,.pt,.pth"
              />
            </Button>
            {modelFile && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: "block" }}
              >
                File size: {(modelFile.size / (1024 * 1024)).toFixed(2)} MB
              </Typography>
            )}
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Basic Information */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Basic Information
            </Typography>
            <Stack spacing={3}>
              <TextField
                required
                fullWidth
                label="Model Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Customer Churn Predictor"
              />

              <TextField
                fullWidth
                label="Description"
                multiline
                rows={4}
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Describe what your model does and its use cases..."
              />
            </Stack>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Model Configuration */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Model Configuration
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel
                    id="model-type-label"
                    sx={{ backgroundColor: "white", px: 0.5 }}
                  >
                    Model Type
                  </InputLabel>
                  <Select
                    labelId="model-type-label"
                    id="model-type-select"
                    value={formData.modelType}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        modelType: e.target.value,
                      }))
                    }
                  >
                    <MenuItem value="">
                      <em>Select Model Type</em>
                    </MenuItem>
                    {MODEL_TYPES.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel
                    id="framework-label"
                    sx={{ backgroundColor: "white", px: 0.5 }}
                  >
                    Framework
                  </InputLabel>
                  <Select
                    labelId="framework-label"
                    id="framework-select"
                    value={formData.framework}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        framework: e.target.value,
                      }))
                    }
                  >
                    <MenuItem value="">
                      <em>Select Framework</em>
                    </MenuItem>
                    {FRAMEWORKS.map((framework) => (
                      <MenuItem key={framework} value={framework}>
                        {framework}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  label="Output Type"
                  value={formData.outputType}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      outputType: e.target.value,
                    }))
                  }
                  placeholder="e.g., binary classification, probability scores, regression value"
                  helperText="Describe what the model returns"
                />
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Input Specifications */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Input Specifications
            </Typography>

            <Paper variant="outlined" sx={{ p: 3, mb: 2 }}>
              <Grid container spacing={2} alignItems="flex-end">
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Input Name"
                    value={inputField.name}
                    onChange={(e) =>
                      setInputField((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="e.g., age"
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel
                      id="input-type-label"
                      sx={{ backgroundColor: "white", px: 0.5 }}
                    >
                      Type
                    </InputLabel>
                    <Select
                      labelId="input-type-label"
                      id="input-type-select"
                      value={inputField.type}
                      onChange={(e) =>
                        setInputField((prev) => ({
                          ...prev,
                          type: e.target.value,
                        }))
                      }
                    >
                      {INPUT_TYPES.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Description (Optional)"
                    value={inputField.description}
                    onChange={(e) =>
                      setInputField((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="e.g., Customer age in years"
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={1}>
                  <IconButton
                    color="primary"
                    onClick={handleInputAdd}
                    sx={{
                      bgcolor: "primary.main",
                      color: "white",
                      "&:hover": { bgcolor: "primary.dark" },
                    }}
                  >
                    <AddIcon />
                  </IconButton>
                </Grid>
              </Grid>
            </Paper>

            {formData.inputs.length > 0 ? (
              <Box>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  Added Inputs ({formData.inputs.length}):
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {formData.inputs.map((input, index) => (
                    <Chip
                      key={index}
                      label={`${input.name} (${input.type})`}
                      onDelete={() => handleInputDelete(index)}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            ) : (
              <Alert severity="info">
                Add at least one input specification for your model
              </Alert>
            )}
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Pricing Configuration */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Pricing Configuration
            </Typography>
            <FormControl component="fieldset">
              <FormLabel component="legend">Pricing Type</FormLabel>
              <RadioGroup
                row
                value={formData.pricingType}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    pricingType: e.target.value,
                  }))
                }
              >
                <FormControlLabel
                  value="free"
                  control={<Radio />}
                  label="Free"
                />
                <FormControlLabel
                  value="paid"
                  control={<Radio />}
                  label="Paid (Credit-based)"
                />
              </RadioGroup>
            </FormControl>

            {formData.pricingType === "paid" && (
              <Box sx={{ mt: 2 }}>
                <TextField
                  required
                  type="number"
                  label="Credits per Call"
                  value={formData.creditsPerCall}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      creditsPerCall: parseInt(e.target.value) || 1,
                    }))
                  }
                  inputProps={{ min: 1, max: 100 }}
                  helperText="Number of credits required per API call"
                  sx={{ maxWidth: 300 }}
                />
              </Box>
            )}
          </Box>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            size="large"
            sx={{ mt: 2, py: 1.5 }}
          >
            {loading ? "Uploading..." : "Upload Model"}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default AddModel;
