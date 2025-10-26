import { useState, useEffect } from "react";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import RefreshIcon from "@mui/icons-material/Refresh";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import { useAuth } from "../../context/useAuth";
import { API_CONFIG } from "../../config/api";
import api from "../../utils/auth";

const Dashboard = () => {
  const { user, updateUserProfile, refreshUserData } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);

  // Credit purchase states
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [selectedCredits, setSelectedCredits] = useState(10);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const creditOptions = [
    { credits: 10, price: 100 },
    { credits: 50, price: 500 },
    { credits: 100, price: 1000 },
    { credits: 200, price: 2000 },
  ];

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const result = await refreshUserData();
        if (result.success && result.user && !editing) {
          setFormData({
            name: result.user.name || "",
            email: result.user.email || "",
            phone: result.user.phone || "",
          });
        } else if (!result.success) {
          setError(result.error || "Failed to fetch user data");
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError("Failed to fetch user data");
      } finally {
        setInitialLoading(false);
      }
    };

    fetchUserData();
  }, [refreshUserData, editing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (editing) {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
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
      const response = await api.post(API_CONFIG.ENDPOINTS.REGENERATE_API_KEY, {
        userId: user.id,
      });

      if (response.data.success) {
        await refreshUserData(); // Refresh user data to get the new API key
        setSuccess("API key regenerated successfully!");
      } else {
        throw new Error(response.data.error || "Failed to regenerate API key");
      }
    } catch (err) {
      console.error("Error regenerating API key:", err);
      setError(
        err.response?.data?.error ||
          err.message ||
          "Failed to regenerate API key"
      );
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
      const updatedData = {
        ...user,
        ...formData,
        id: user.id,
      };

      const result = await updateUserProfile(updatedData);
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

  const handleCreditPurchase = async () => {
    setPaymentLoading(true);
    setError("");
    setSuccess("");

    try {
      // Get Razorpay key
      const keyResponse = await api.get(API_CONFIG.ENDPOINTS.RAZORPAY.GET_KEY);
      const razorpayKey = keyResponse.data.key;

      // Create order
      const orderResponse = await api.post(
        API_CONFIG.ENDPOINTS.RAZORPAY.PROCESS_PAYMENT,
        {
          credits: selectedCredits,
        }
      );

      const { orderId, amount } = orderResponse.data;

      // Initialize Razorpay
      const options = {
        key: razorpayKey,
        amount: amount * 100, // Razorpay expects amount in paisa
        currency: "INR",
        name: "MLVerse",
        description: `Purchase ${selectedCredits} Credits`,
        order_id: orderId,
        handler: async (response) => {
          try {
            // Verify payment
            await api.post(API_CONFIG.ENDPOINTS.RAZORPAY.VERIFY_PAYMENT, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              credits: selectedCredits,
              userId: user.id,
            });

            setSuccess(`${selectedCredits} credits added successfully!`);
            setCreditDialogOpen(false);
            refreshUserData(); // Refresh user data to show updated credits
          } catch (error) {
            console.error("Payment verification failed:", error);
            setError("Payment verification failed. Please contact support.");
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: {
          color: "#1976d2",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Payment initiation failed:", error);
      setError("Failed to initiate payment. Please try again.");
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {initialLoading ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="200px"
        >
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3} sx={{ width: "100%" }}>
          {/* Welcome Section */}
          <Grid xs={12}>
            <Paper sx={{ p: 3, display: "flex", flexDirection: "column" }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Box>
                  <Typography variant="h4" gutterBottom>
                    Welcome, {user?.name}
                  </Typography>
                  <Typography color="textSecondary">
                    Email: {user?.email}
                  </Typography>
                  <Typography color="textSecondary">
                    Credits: {user?.credits || 0}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<CreditCardIcon />}
                  onClick={() => setCreditDialogOpen(true)}
                >
                  Buy Credits
                </Button>
              </Box>
            </Paper>
          </Grid>

          {/* API Key Section */}
          <Grid xs={12} sm={6}>
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
          <Grid xs={12} sm={6}>
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
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setEditing(true);
                      setFormData({
                        name: user?.name || "",
                        email: user?.email || "",
                        phone: user?.phone || "",
                      });
                    }}
                  >
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
                      {loading ? (
                        <CircularProgress size={24} />
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setEditing(false);
                        setFormData({
                          name: user?.name || "",
                          email: user?.email || "",
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
      )}

      {/* Credit Purchase Dialog */}
      <Dialog
        open={creditDialogOpen}
        onClose={() => setCreditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Buy Credits</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Select the number of credits you want to purchase:
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Rate: 1 Credit = ₹10
          </Typography>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Select Credits</InputLabel>
            <Select
              value={selectedCredits}
              label="Select Credits"
              onChange={(e) => setSelectedCredits(e.target.value)}
            >
              {creditOptions.map((option) => (
                <MenuItem key={option.credits} value={option.credits}>
                  {option.credits} Credits - ₹{option.price}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="h6" sx={{ mt: 2 }}>
            Total: ₹
            {creditOptions.find((opt) => opt.credits === selectedCredits)
              ?.price || 0}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreditDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreditPurchase}
            disabled={paymentLoading}
          >
            {paymentLoading ? (
              <CircularProgress size={24} />
            ) : (
              "Proceed to Payment"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Dashboard;
