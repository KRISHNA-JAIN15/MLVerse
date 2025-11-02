// import { useState, useEffect } from "react";
// import {
//   Container,
//   Grid,
//   Typography,
//   Paper,
//   Box,
//   Alert,
//   CircularProgress,
//   Button,
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   Chip,
//   Divider,
//   IconButton,
// } from "@mui/material";
// import CodeIcon from "@mui/icons-material/Code";
// import HttpIcon from "@mui/icons-material/Http";
// import PaidIcon from "@mui/icons-material/Paid";
// import FreeBreakfastIcon from "@mui/icons-material/FreeBreakfast";
// import ContentCopyIcon from "@mui/icons-material/ContentCopy";
// import { API_CONFIG } from "../config/api";
// import api from "../utils/auth";
// import { useAuth } from "../context/useAuth";

// // Utility function to format input schema into a request body example
// const generateRequestBody = (inputs) => {
//   if (!inputs || inputs.length === 0) {
//     return '{\n  "data": "Requires raw data upload (no structured inputs defined)"\n}';
//   }

//   const body = {};
//   inputs.forEach(input => {
//     // Provide illustrative mock values based on type
//     switch (input.type?.toLowerCase()) {
//       case 'numeric':
//         body[input.name] = 10.5;
//         break;
//       case 'categorical':
//         body[input.name] = "category_A";
//         break;
//       case 'text':
//         body[input.name] = "Example input text";
//         break;
//       case 'array':
//         body[input.name] = [0.1, 0.2, 0.3];
//         break;
//       default:
//         body[input.name] = null;
//     }
//   });

//   return JSON.stringify(body, null, 2);
// };

// // Utility function to generate the prediction endpoint URL
// const generateEndpointUrl = (modelId) => {
//   if (!API_CONFIG.AWS_API_ENDPOINT || API_CONFIG.AWS_API_ENDPOINT.includes("<API_GATEWAY_URL>")) {
//     return "AWS_API_ENDPOINT not configured. Please check src/config/api.js";
//   }
//   return `${API_CONFIG.AWS_API_ENDPOINT}/models/${modelId}/predict`;
// };

// // --- Model Card Component ---
// const ModelCard = ({ model }) => {
//   const [modalOpen, setModalOpen] = useState(false);
//   const [modalType, setModalType] = useState(null); // 'body' or 'endpoint'
//   const [copied, setCopied] = useState(false);

//   const costPerPrediction = model.costPerPrediction || 0;
//   const costLabel = costPerPrediction > 0 ? `Paid: ${costPerPrediction} credits` : "Free";
//   const costIcon = costPerPrediction > 0 ? <PaidIcon /> : <FreeBreakfastIcon />;

//   const handleOpenModal = (type) => {
//     setModalType(type);
//     setModalOpen(true);
//   };

//   const handleCopy = (text) => {
//     navigator.clipboard.writeText(text);
//     setCopied(true);
//     setTimeout(() => setCopied(false), 1500);
//   };

//   const modalContent =
//     modalType === "body"
//       ? {
//           title: "API Request Body Structure",
//           content: generateRequestBody(model.inputs),
//         }
//       : {
//           title: "Prediction Endpoint URL",
//           content: generateEndpointUrl(model.modelId),
//         };

//   return (
//     <Paper elevation={3} sx={{ p: 3, height: "100%", display: "flex", flexDirection: "column", gap: 1.5 }}>

//       {/* Header and Cost */}
//       <Box display="flex" justifyContent="space-between" alignItems="flex-start">
//         <Typography variant="h6" component="h2" fontWeight="bold">
//           {model.name}
//         </Typography>
//         <Chip
//           icon={costIcon}
//           label={costLabel}
//           color={costPerPrediction > 0 ? "error" : "success"}
//           size="small"
//           sx={{ ml: 1, fontWeight: 'bold' }}
//         />
//       </Box>

//       <Typography variant="body2" color="textSecondary" gutterBottom>
//         **ID:** {model.modelId}
//       </Typography>

//       {/* Metadata */}
//       <Typography variant="body2">{model.description}</Typography>
//       <Divider sx={{ my: 1 }} />

//       <Box>
//         <Typography variant="subtitle2" component="h3">
//           Inputs ({model.inputs?.length || 0}):
//         </Typography>
//         <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
//           {model.inputs?.map((input, index) => (
//             <Chip
//               key={index}
//               label={`${input.name} (${input.type})`}
//               size="small"
//               variant="outlined"
//               color="primary"
//             />
//           ))}
//         </Box>
//       </Box>

//       <Typography variant="subtitle2" sx={{ mt: 1 }}>
//         **Framework:** {model.framework} | **Output:** {model.outputType}
//       </Typography>

//       {/* Buttons */}
//       <Box sx={{ mt: 'auto', display: "flex", gap: 1, pt: 2 }}>
//         <Button
//           variant="contained"
//           size="small"
//           startIcon={<CodeIcon />}
//           onClick={() => handleOpenModal("body")}
//           sx={{ flexGrow: 1 }}
//         >
//           Req Body
//         </Button>
//         <Button
//           variant="outlined"
//           size="small"
//           startIcon={<HttpIcon />}
//           onClick={() => handleOpenModal("endpoint")}
//           sx={{ flexGrow: 1 }}
//         >
//           Endpoint
//         </Button>
//       </Box>

//       {/* Modal Dialog */}
//       <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="md" fullWidth>
//         <DialogTitle>{modalContent.title}</DialogTitle>
//         <DialogContent dividers>
//           <pre
//             style={{
//               whiteSpace: "pre-wrap",
//               wordWrap: "break-word",
//               backgroundColor: "#f5f5f5",
//               padding: "10px",
//               borderRadius: "4px",
//               position: "relative",
//             }}
//           >
//             {modalContent.content}
//           </pre>
//           {copied && (
//             <Chip
//               label="Copied!"
//               color="info"
//               size="small"
//               sx={{ position: 'absolute', top: 15, right: 15 }}
//             />
//           )}
//         </DialogContent>
//         <DialogActions>
//           <IconButton onClick={() => handleCopy(modalContent.content)} title="Copy to Clipboard">
//             <ContentCopyIcon />
//           </IconButton>
//           <Button onClick={() => setModalOpen(false)}>Close</Button>
//         </DialogActions>
//       </Dialog>
//     </Paper>
//   );
// };

// // --- Main ModelList Component ---
// const ModelList = () => {
//   const { user } = useAuth();
//   const [models, setModels] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     const fetchModels = async () => {
//       if (!user) {
//         setLoading(false);
//         return;
//       }

//       setError("");
//       setLoading(true);

//       try {
//         const response = `${API_CONFIG.AWS_API_ENDPOINT}/models/list`;

//         if (response.data.success === false) {
//           throw new Error(response.data.error || "Failed to fetch models list");
//         }

//         setModels(response.data.models || []);
//       } catch (err) {
//         console.error("Error fetching models:", err);
//         setError(
//           err.response?.data?.error || err.message || "Failed to load models."
//         );
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchModels();
//   }, [user]);

//   if (loading) {
//     return (
//       <Container maxWidth="lg" sx={{ mt: 4 }}>
//         <Box display="flex" justifyContent="center" alignItems="center" height="200px">
//           <CircularProgress />
//         </Box>
//       </Container>
//     );
//   }

//   if (error) {
//     return (
//       <Container maxWidth="lg" sx={{ mt: 4 }}>
//         <Alert severity="error">{error}</Alert>
//       </Container>
//     );
//   }

//   return (
//     <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
//       <Typography variant="h4" component="h1" gutterBottom>
//         Your Deployed Models ({models.length})
//       </Typography>

//       <Alert severity="info" sx={{ mb: 3 }}>
//         The Endpoint URL assumes a `/dev` stage deployment. Remember to send your API Key in the `X-Api-Key` header for authentication.
//       </Alert>

//       {models.length === 0 ? (
//         <Alert severity="warning">You have no models deployed yet. Use the "Add Model" page to deploy one.</Alert>
//       ) : (
//         <Grid container spacing={3}>
//           {models.map((model) => (
//             <Grid item key={model.modelId} xs={12} sm={6} md={4}>
//               <ModelCard model={model} />
//             </Grid>
//           ))}
//         </Grid>
//       )}
//     </Container>
//   );
// };

// export default ModelList;

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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
} from "@mui/material";
import CodeIcon from "@mui/icons-material/Code";
import HttpIcon from "@mui/icons-material/Http";
import PaidIcon from "@mui/icons-material/Paid";
import FreeBreakfastIcon from "@mui/icons-material/FreeBreakfast";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import DeleteIcon from "@mui/icons-material/Delete";
import { API_CONFIG } from "../config/api";
// import api from "../utils/auth";
import { useAuth } from "../context/useAuth";

// Utility function to format input schema into a request body example
const generateRequestBody = (inputs) => {
  if (!inputs || inputs.length === 0) {
    return '{\n  "data": "Requires raw data upload (no structured inputs defined)"\n}';
  }

  const body = {};
  inputs.forEach((input) => {
    // Provide illustrative mock values based on type
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
const generateEndpointUrl = (modelId, version = null) => {
  if (version) {
    return `${API_CONFIG.AWS_API_ENDPOINT}/models/${modelId}/${version}/predict`;
  }
  return `${API_CONFIG.AWS_API_ENDPOINT}/models/${modelId}/predict`;
};

// --- Model Card Component ---
const ModelCard = ({
  model,
  onOpenVersionUpload,
  onSetActiveVersion,
  onDeleteModel,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null); // 'body' or 'endpoint'
  const [copied, setCopied] = useState(false);

  // Delete confirmation states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Version management states
  const [allVersions, setAllVersions] = useState([]);
  const [showVersions, setShowVersions] = useState(false);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(model.version || "v1");

  // Use the correct field names from backend
  const isPaid = model.pricingType === "paid";
  const creditsPerCall = model.creditsPerCall || 0;
  const costLabel = isPaid ? `Paid: ${creditsPerCall} credits/call` : "Free";
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

  const handleDeleteModel = () => {
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    onDeleteModel(model);
    setDeleteDialogOpen(false);
  };

  // Version management functions
  const { user } = useAuth();

  const fetchAllVersions = async () => {
    if (loadingVersions) return;

    setLoadingVersions(true);
    try {
      // Extract base model ID (remove version suffix if present)
      const baseModelId = model.baseModelId || model.modelId.split("-v")[0];

      const response = await fetch(
        `${
          API_CONFIG.BASE_URL
        }${API_CONFIG.ENDPOINTS.MODELS.GET_VERSIONS.replace(
          ":modelId",
          baseModelId
        )}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${user?.token || ""}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();
      if (response.ok && result.versions) {
        // Sort versions by version number
        const sortedVersions = result.versions.sort(
          (a, b) => a.versionNumber - b.versionNumber
        );
        setAllVersions(sortedVersions);
      } else {
        console.error("Failed to fetch versions:", result.error);
      }
    } catch (error) {
      console.error("Error fetching versions:", error);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleVersionChange = (version) => {
    setSelectedVersion(version);
    // Find the selected version data
    const versionData = allVersions.find((v) => v.version === version);
    if (versionData) {
      // Update the modal content to show the selected version's endpoint
      // This will be used when showing endpoints for specific versions
    }
  };

  const toggleVersionsView = () => {
    if (!showVersions && allVersions.length === 0) {
      fetchAllVersions();
    }
    setShowVersions(!showVersions);
  };

  const modalContent =
    modalType === "body"
      ? {
          title: "API Request Body Structure",
          content: generateRequestBody(model.inputs),
        }
      : {
          title: `Prediction Endpoint URL (${selectedVersion})`,
          content: generateEndpointUrl(
            model.baseModelId || model.modelId.split("-v")[0],
            selectedVersion
          ),
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
          color={model.isActive ? "primary" : "default"}
          variant={model.isActive ? "filled" : "outlined"}
        />
        <Typography variant="caption" color="textSecondary">
          Version {model.versionNumber || 1}
        </Typography>
        <IconButton
          size="small"
          onClick={toggleVersionsView}
          title="View all versions"
        >
          {showVersions ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      {/* Version Management Panel */}
      <Collapse in={showVersions}>
        <Paper variant="outlined" sx={{ p: 2, mb: 1, bgcolor: "grey.50" }}>
          <Typography variant="subtitle2" gutterBottom>
            All Versions
          </Typography>

          {loadingVersions ? (
            <CircularProgress size={24} />
          ) : allVersions.length > 0 ? (
            <Box>
              <FormControl size="small" fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Version</InputLabel>
                <Select
                  value={selectedVersion}
                  onChange={(e) => handleVersionChange(e.target.value)}
                  label="Select Version"
                >
                  {allVersions.map((version) => (
                    <MenuItem key={version.version} value={version.version}>
                      {version.version} {version.isActive ? "(Active)" : ""} - v
                      {version.versionNumber}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <List dense>
                {allVersions.map((version) => (
                  <ListItem key={version.version} disablePadding>
                    <ListItemButton
                      selected={selectedVersion === version.version}
                      onClick={() => handleVersionChange(version.version)}
                    >
                      <ListItemText
                        primary={
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Chip
                              label={version.version}
                              size="small"
                              color={version.isActive ? "primary" : "default"}
                              variant={version.isActive ? "filled" : "outlined"}
                            />
                            {version.isActive && (
                              <Chip
                                label="Active"
                                size="small"
                                color="success"
                              />
                            )}
                          </Box>
                        }
                        secondary={`Created: ${new Date(
                          version.createdAt
                        ).toLocaleDateString()}`}
                      />
                      {!version.isActive && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSetActiveVersion(
                              model.baseModelId || model.modelId.split("-v")[0],
                              version.version
                            );
                          }}
                        >
                          Set Active
                        </Button>
                      )}
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Box>
          ) : (
            <Typography variant="body2" color="textSecondary">
              No versions found. Click "New Version" to create one.
            </Typography>
          )}
        </Paper>
      </Collapse>

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

      {/* Version Management - Only for model owner */}
      <Box sx={{ mt: 1, display: "flex", gap: 1, alignItems: "center" }}>
        <Button
          variant="outlined"
          size="small"
          onClick={() => onOpenVersionUpload(model)}
          sx={{ fontSize: "0.75rem", py: 0.5 }}
        >
          New Version
        </Button>
        {!model.isActive && (
          <Button
            variant="contained"
            size="small"
            color="success"
            onClick={() => onSetActiveVersion(model.modelId, model.version)}
            sx={{ fontSize: "0.75rem", py: 0.5 }}
          >
            Set Active
          </Button>
        )}
        <Button
          variant="outlined"
          size="small"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => handleDeleteModel()}
          sx={{ fontSize: "0.75rem", py: 0.5 }}
        >
          Delete
        </Button>
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Model "{model.name}"?
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this model? This action cannot be
            undone. All versions of this model will be permanently deleted.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

// --- Main ModelList Component ---
const ModelList = () => {
  const { user } = useAuth();
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userCredits, setUserCredits] = useState(0);

  // Version upload states
  const [versionUploadModal, setVersionUploadModal] = useState(false);
  const [selectedModelForVersion, setSelectedModelForVersion] = useState(null);
  const [versionFile, setVersionFile] = useState(null);
  const [versionUploading, setVersionUploading] = useState(false);

  useEffect(() => {
    const fetchModels = async () => {
      // Retaining this check and dependency array as requested
      if (!user) {
        setLoading(false);
        return;
      }

      setError("");
      setLoading(true);

      try {
        // Fetch user's models from main backend (requires authentication)
        const modelsResponse = await fetch(
          `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MODELS.LIST}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${user?.token || ""}`,
              "Content-Type": "application/json",
            },
          }
        );

        // Fetch user credits separately
        const creditsResponse = await fetch(
          `${API_CONFIG.BASE_URL}/auth/credits`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${user?.token || ""}`,
              "Content-Type": "application/json",
            },
          }
        );

        // Handle models response
        if (!modelsResponse.ok) {
          const errorData = await modelsResponse.json().catch(() => ({}));
          console.error("Models API Error:", {
            status: modelsResponse.status,
            statusText: modelsResponse.statusText,
            error: errorData,
            user: user
              ? { id: user.id, token: user.token ? "present" : "missing" }
              : "no user",
          });
          throw new Error(
            errorData.error || `HTTP Error! Status: ${modelsResponse.status}`
          );
        }

        const modelsData = await modelsResponse.json();
        setModels(modelsData.models || []);

        // Handle credits response
        if (creditsResponse.ok) {
          const creditsData = await creditsResponse.json();
          if (creditsData.success !== false) {
            setUserCredits(creditsData.credits || 0);
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message || "Failed to load data.");
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, [user]);

  // Version upload functions
  const handleOpenVersionUpload = (model) => {
    setSelectedModelForVersion(model);
    setVersionUploadModal(true);
    setVersionFile(null);
  };

  const handleCloseVersionUpload = () => {
    setVersionUploadModal(false);
    setSelectedModelForVersion(null);
    setVersionFile(null);
    setVersionUploading(false);
  };

  const handleVersionFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith(".pkl")) {
      setVersionFile(file);
    } else {
      alert("Please select a valid .pkl file");
      event.target.value = "";
    }
  };

  const handleUploadVersion = async () => {
    if (!versionFile || !selectedModelForVersion) {
      alert("Please select a file");
      return;
    }

    setVersionUploading(true);
    try {
      const formData = new FormData();
      formData.append("model", versionFile);

      const response = await fetch(
        `${
          API_CONFIG.BASE_URL
        }${API_CONFIG.ENDPOINTS.MODELS.UPLOAD_VERSION.replace(
          ":modelId",
          selectedModelForVersion.modelId
        )}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${user?.token || ""}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        alert(`New version ${result.version} uploaded successfully!`);
        handleCloseVersionUpload();
        // Refresh the models list
        window.location.reload();
      } else {
        throw new Error(result.message || "Upload failed");
      }
    } catch (err) {
      console.error("Version upload error:", err);
      alert(`Upload failed: ${err.message}`);
    } finally {
      setVersionUploading(false);
    }
  };

  const handleSetActiveVersion = async (modelId, version) => {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MODELS.SET_ACTIVE.replace(
          ":modelId",
          modelId
        ).replace(":version", version)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${user?.token || ""}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        alert(`Version ${version} set as active!`);
        // Refresh the models list
        window.location.reload();
      } else {
        throw new Error(result.message || "Failed to set active version");
      }
    } catch (err) {
      console.error("Set active version error:", err);
      alert(`Failed to set active version: ${err.message}`);
    }
  };

  const handleDeleteModel = async (model) => {
    try {
      const baseModelId = model.baseModelId || model.modelId.split("-v")[0];
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MODELS.DELETE.replace(
          ":modelId",
          baseModelId
        )}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${user?.token || ""}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        alert(`Model "${model.name}" deleted successfully!`);
        // Refresh the models list
        window.location.reload();
      } else {
        throw new Error(result.message || "Failed to delete model");
      }
    } catch (err) {
      console.error("Delete model error:", err);
      alert(`Failed to delete model: ${err.message}`);
    }
  };

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
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 3 }}
      >
        <Typography variant="h4" component="h1">
          Your Deployed Models ({models.length})
        </Typography>
        <Paper
          elevation={2}
          sx={{ p: 2, bgcolor: "primary.main", color: "white" }}
        >
          <Typography variant="h6" component="div" sx={{ fontWeight: "bold" }}>
            💰 Credits: {userCredits}
          </Typography>
        </Paper>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        These are your deployed models. Use the endpoint URLs with your API Key
        in the `X-Api-Key` header for authentication. Free models don't consume
        credits, while paid models will deduct the specified credits per call.
      </Alert>

      {models.length === 0 ? (
        <Alert severity="warning">
          You have no models deployed yet. Use the "Add Model" page to deploy
          one.
        </Alert>
      ) : (
        <>
          {/* Models Summary */}
          <Box sx={{ mb: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Paper
                  elevation={1}
                  sx={{ p: 2, bgcolor: "success.light", color: "white" }}
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    <FreeBreakfastIcon />
                    <Typography variant="h6" fontWeight="bold">
                      Free Models:{" "}
                      {models.filter((m) => m.pricingType !== "paid").length}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Paper
                  elevation={1}
                  sx={{ p: 2, bgcolor: "error.light", color: "white" }}
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    <PaidIcon />
                    <Typography variant="h6" fontWeight="bold">
                      Paid Models:{" "}
                      {models.filter((m) => m.pricingType === "paid").length}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Box>

          {/* Models Grid */}
          <Grid container spacing={3}>
            {models.map((model) => (
              <Grid item key={model.modelId} xs={12} sm={6} md={4}>
                <ModelCard
                  model={model}
                  onOpenVersionUpload={handleOpenVersionUpload}
                  onSetActiveVersion={handleSetActiveVersion}
                  onDeleteModel={handleDeleteModel}
                />
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* Version Upload Modal */}
      <Dialog
        open={versionUploadModal}
        onClose={handleCloseVersionUpload}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Upload New Version</DialogTitle>
        <DialogContent>
          {selectedModelForVersion && (
            <Typography
              variant="subtitle2"
              color="textSecondary"
              sx={{ mb: 2 }}
            >
              Model: {selectedModelForVersion.name} (ID:{" "}
              {selectedModelForVersion.modelId})
            </Typography>
          )}
          <Box sx={{ mt: 2 }}>
            <TextField
              type="file"
              fullWidth
              label="Select .pkl file"
              InputLabelProps={{ shrink: true }}
              inputProps={{
                accept: ".pkl",
                onChange: handleVersionFileChange,
              }}
              helperText="Select a new .pkl file for this model version"
            />
            {versionFile && (
              <Typography variant="body2" sx={{ mt: 1, color: "success.main" }}>
                Selected: {versionFile.name}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseVersionUpload}
            disabled={versionUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUploadVersion}
            variant="contained"
            disabled={!versionFile || versionUploading}
          >
            {versionUploading ? "Uploading..." : "Upload Version"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ModelList;
