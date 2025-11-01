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
} from "@mui/material";
import CodeIcon from "@mui/icons-material/Code";
import HttpIcon from "@mui/icons-material/Http";
import PaidIcon from "@mui/icons-material/Paid";
import FreeBreakfastIcon from "@mui/icons-material/FreeBreakfast";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
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
const generateEndpointUrl = (modelId) => {
  if (
    !API_CONFIG.AWS_API_ENDPOINT ||
    API_CONFIG.AWS_API_ENDPOINT.includes("<API_GATEWAY_URL>")
  ) {
    return "AWS_API_ENDPOINT not configured. Please check src/config/api.js";
  }
  return `${API_CONFIG.AWS_API_ENDPOINT}/models/${modelId}/predict`;
};

// --- Model Card Component ---
const ModelCard = ({ model }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null); // 'body' or 'endpoint'
  const [copied, setCopied] = useState(false);

  const costPerPrediction = model.costPerPrediction || 0;
  const costLabel =
    costPerPrediction > 0 ? `Paid: ${costPerPrediction} credits` : "Free";
  const costIcon = costPerPrediction > 0 ? <PaidIcon /> : <FreeBreakfastIcon />;

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
          content: generateEndpointUrl(model.modelId),
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
          color={costPerPrediction > 0 ? "error" : "success"}
          size="small"
          sx={{ ml: 1, fontWeight: "bold" }}
        />
      </Box>

      <Typography variant="body2" color="textSecondary" gutterBottom>
        **ID:** {model.modelId}
      </Typography>

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

// --- Main ModelList Component ---
const ModelList = () => {
  const { user } = useAuth();
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        // FIX: Replaced the broken string assignment with a native fetch call
        const url = `${API_CONFIG.AWS_API_ENDPOINT}/models/list`;

        // Execute the fetch request
        const fetchResponse = await fetch(url, {
          method: "GET",
          headers: {
            // Pass the API key for authentication
            "X-Api-Key": user?.api_key || "",
            "Content-Type": "application/json",
          },
        });

        // Handle non-200 HTTP status codes
        if (!fetchResponse.ok) {
          const errorData = await fetchResponse.json();
          // Throw an error with the status/message from the backend
          throw new Error(
            errorData.error || `HTTP Error! Status: ${fetchResponse.status}`
          );
        }

        // Parse the successful response body
        const responseData = await fetchResponse.json();

        // Check the 'success' flag in the parsed data (was previously attempting to read .data.success)
        if (responseData.success === false) {
          throw new Error(responseData.error || "Failed to fetch models list");
        }

        // Access models property directly from the parsed JSON
        setModels(responseData.models || []);
      } catch (err) {
        console.error("Error fetching models:", err);
        // Use err.message for generic error display since fetch doesn't have err.response
        setError(err.message || "Failed to load models.");
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, [user]); // Retaining the [user] dependency array as requested

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
      <Typography variant="h4" component="h1" gutterBottom>
        Your Deployed Models ({models.length})
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        The Endpoint URL assumes a `/dev` stage deployment. Remember to send
        your API Key in the `X-Api-Key` header for authentication.
      </Alert>

      {models.length === 0 ? (
        <Alert severity="warning">
          You have no models deployed yet. Use the "Add Model" page to deploy
          one.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {models.map((model) => (
            <Grid item key={model.modelId} xs={12} sm={6} md={4}>
              <ModelCard model={model} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default ModelList;
