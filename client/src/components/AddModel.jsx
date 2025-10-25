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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
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
  });

  const [inputField, setInputField] = useState({
    name: "",
    type: "numeric",
    description: "",
  });

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    const allowedTypes = [".pkl", ".h5", ".joblib", ".save", ".pt", ".pth"];
    const fileExt = file.name.toLowerCase().match(/\.[^.]*$/)[0];

    if (!allowedTypes.includes(fileExt)) {
      setError("Invalid file type. Only ML model files are allowed.");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      // 100MB
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

      const formPayload = new FormData();
      formPayload.append("model", modelFile);
      formPayload.append("name", formData.name);
      formPayload.append("description", formData.description);
      formPayload.append("modelType", formData.modelType);
      formPayload.append("framework", formData.framework);
      formPayload.append("outputType", formData.outputType);
      formPayload.append("inputs", JSON.stringify(formData.inputs));

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

      setSuccess("Model uploaded successfully");
      // Reset form
      setFormData({
        name: "",
        description: "",
        modelType: "",
        framework: "",
        outputType: "",
        inputs: [],
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
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Upload ML Model
        </Typography>

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
          <Grid container spacing={3}>
            {/* File Upload */}
            <Grid item xs={12}>
              <Button variant="outlined" component="label" fullWidth>
                {modelFile ? modelFile.name : "Choose Model File"}
                <input
                  type="file"
                  hidden
                  onChange={handleFileChange}
                  accept=".pkl,.h5,.joblib,.save,.pt,.pth"
                />
              </Button>
            </Grid>

            {/* Basic Information */}
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Model Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </Grid>

            {/* Model Type and Framework */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Model Type</InputLabel>
                <Select
                  value={formData.modelType}
                  label="Model Type"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      modelType: e.target.value,
                    }))
                  }
                >
                  {MODEL_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Framework</InputLabel>
                <Select
                  value={formData.framework}
                  label="Framework"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      framework: e.target.value,
                    }))
                  }
                >
                  {FRAMEWORKS.map((framework) => (
                    <MenuItem key={framework} value={framework}>
                      {framework}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Output Type */}
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
                helperText="Describe the model's output (e.g., binary classification, regression value, probability scores)"
              />
            </Grid>

            {/* Input Specifications */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Input Specifications
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
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
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Type</InputLabel>
                      <Select
                        value={inputField.type}
                        label="Type"
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
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Description"
                      value={inputField.description}
                      onChange={(e) =>
                        setInputField((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                    />
                  </Grid>
                  <Grid item xs={12} md={1}>
                    <IconButton
                      color="primary"
                      onClick={handleInputAdd}
                      sx={{ mt: 1 }}
                    >
                      <AddIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              </Box>

              {/* Input List */}
              <Box sx={{ mt: 2 }}>
                {formData.inputs.map((input, index) => (
                  <Chip
                    key={index}
                    label={`${input.name} (${input.type})`}
                    onDelete={() => handleInputDelete(index)}
                    sx={{ m: 0.5 }}
                  />
                ))}
              </Box>
            </Grid>

            {/* Submit Button */}
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                sx={{ mt: 2 }}
              >
                {loading ? "Uploading..." : "Upload Model"}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default AddModel;
