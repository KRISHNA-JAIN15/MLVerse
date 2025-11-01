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
  Card,
  CardContent,
  Divider,
  Chip,
  LinearProgress,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import RefreshIcon from "@mui/icons-material/Refresh";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import SecurityIcon from "@mui/icons-material/Security";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import ViewListIcon from "@mui/icons-material/ViewList";
import StorefrontIcon from "@mui/icons-material/Storefront";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { useAuth } from "../../context/useAuth";
import { API_CONFIG } from "../../config/api";
import api from "../../utils/auth";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { user, updateUserProfile, refreshUserData } = useAuth();
  const navigate = useNavigate();
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

  // User statistics
  const [userStats, setUserStats] = useState({
    totalModels: 0,
    totalApiCalls: 0,
    creditsEarned: 0,
  });

  const creditOptions = [
    { credits: 10, price: 100 },
    { credits: 50, price: 500 },
    { credits: 100, price: 1000 },
    { credits: 200, price: 2000 },
  ];

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        // Fetch user's models to get count
        const modelsResponse = await fetch(
          `${API_CONFIG.BASE_URL}/api/models/list`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${user?.token || ""}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (modelsResponse.ok) {
          const modelsData = await modelsResponse.json();
          setUserStats((prev) => ({
            ...prev,
            totalModels: modelsData.models?.length || 0,
          }));
        }
      } catch (error) {
        console.error("Error fetching user stats:", error);
      }
    };

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

        // Fetch user statistics
        await fetchUserStats();
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError("Failed to fetch user data");
      } finally {
        setInitialLoading(false);
      }
    };

    fetchUserData();
  }, [refreshUserData, editing, user?.token]);

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
        <Grid container spacing={3}>
          {/* Header Section */}
          <Grid item xs={12}>
            <Paper
              sx={{
                p: 4,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                borderRadius: 3,
              }}
            >
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Box>
                  <Typography variant="h4" fontWeight="bold" gutterBottom>
                    Welcome back, {user?.name}! 👋
                  </Typography>
                  <Typography variant="h6" sx={{ opacity: 0.9 }}>
                    {user?.email}
                  </Typography>
                  <Box
                    display="flex"
                    alignItems="center"
                    gap={2}
                    sx={{ mt: 2 }}
                  >
                    <Chip
                      icon={<CreditCardIcon />}
                      label={`${user?.credits || 0} Credits`}
                      sx={{
                        bgcolor: "rgba(255,255,255,0.2)",
                        color: "white",
                        fontWeight: "bold",
                        fontSize: "1.1rem",
                      }}
                    />
                  </Box>
                </Box>
                <Button
                  variant="contained"
                  size="large"
                  sx={{
                    bgcolor: "rgba(255,255,255,0.2)",
                    color: "white",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
                  }}
                  startIcon={<CreditCardIcon />}
                  onClick={() => setCreditDialogOpen(true)}
                >
                  Buy Credits
                </Button>
              </Box>
            </Paper>
          </Grid>

          {/* Quick Actions */}
          <Grid item xs={12}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Quick Actions
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    cursor: "pointer",
                    transition: "transform 0.2s",
                    "&:hover": { transform: "translateY(-4px)" },
                  }}
                  onClick={() => navigate("/add-model")}
                >
                  <CardContent sx={{ textAlign: "center", p: 3 }}>
                    <AddCircleIcon
                      sx={{ fontSize: 48, color: "primary.main", mb: 1 }}
                    />
                    <Typography variant="h6" fontWeight="bold">
                      Add Model
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Upload a new ML model
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    cursor: "pointer",
                    transition: "transform 0.2s",
                    "&:hover": { transform: "translateY(-4px)" },
                  }}
                  onClick={() => navigate("/models")}
                >
                  <CardContent sx={{ textAlign: "center", p: 3 }}>
                    <ViewListIcon
                      sx={{ fontSize: 48, color: "success.main", mb: 1 }}
                    />
                    <Typography variant="h6" fontWeight="bold">
                      My Models
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      View your deployed models
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    cursor: "pointer",
                    transition: "transform 0.2s",
                    "&:hover": { transform: "translateY(-4px)" },
                  }}
                  onClick={() => navigate("/community")}
                >
                  <CardContent sx={{ textAlign: "center", p: 3 }}>
                    <StorefrontIcon
                      sx={{ fontSize: 48, color: "secondary.main", mb: 1 }}
                    />
                    <Typography variant="h6" fontWeight="bold">
                      Marketplace
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Browse community models
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ textAlign: "center", p: 3 }}>
                  <CardContent>
                    <TrendingUpIcon
                      sx={{ fontSize: 48, color: "warning.main", mb: 1 }}
                    />
                    <Typography variant="h6" fontWeight="bold">
                      Analytics
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Coming soon...
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>

          {/* API Key Section */}
          <Grid item xs={12} lg={6}>
            <Paper sx={{ p: 3, height: "100%" }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <SecurityIcon color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  API Configuration
                </Typography>
              </Box>

              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Use this API key to authenticate your requests to the MLVerse
                API
              </Typography>

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
                sx={{ mb: 2 }}
              />

              <Button
                variant="outlined"
                fullWidth
                onClick={handleRegenerateApiKey}
                disabled={apiKeyLoading}
                startIcon={
                  apiKeyLoading ? (
                    <CircularProgress size={20} />
                  ) : (
                    <RefreshIcon />
                  )
                }
              >
                Regenerate API Key
              </Button>

              {apiKeyCopied && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  API Key copied to clipboard!
                </Alert>
              )}
            </Paper>
          </Grid>

          {/* Profile Section */}
          <Grid item xs={12} lg={6}>
            <Paper sx={{ p: 3, height: "100%" }}>
              <Box
                display="flex"
                alignItems="center"
                justify="space-between"
                mb={2}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <AccountCircleIcon color="primary" />
                  <Typography variant="h6" fontWeight="bold">
                    Profile Information
                  </Typography>
                </Box>
                {!editing && (
                  <Button
                    variant="outlined"
                    size="small"
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
                  variant={editing ? "outlined" : "filled"}
                />
                <TextField
                  margin="normal"
                  fullWidth
                  label="Email"
                  name="email"
                  value={formData.email}
                  disabled={true}
                  variant="filled"
                  helperText="Email cannot be changed"
                />
                <TextField
                  margin="normal"
                  fullWidth
                  label="Phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={!editing}
                  variant={editing ? "outlined" : "filled"}
                />

                {editing && (
                  <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
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

          {/* Stats Section */}
          <Grid item xs={12}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Account Statistics
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  sx={{
                    p: 3,
                    textAlign: "center",
                    background:
                      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                  }}
                >
                  <Typography variant="h4" fontWeight="bold">
                    {user?.credits || 0}
                  </Typography>
                  <Typography variant="body2">Available Credits</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  sx={{
                    p: 3,
                    textAlign: "center",
                    background:
                      "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
                    color: "white",
                  }}
                >
                  <Typography variant="h4" fontWeight="bold">
                    {userStats.totalModels}
                  </Typography>
                  <Typography variant="body2">Models Deployed</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  sx={{
                    p: 3,
                    textAlign: "center",
                    background:
                      "linear-gradient(135deg, #3742fa 0%, #2f3542 100%)",
                    color: "white",
                  }}
                >
                  <Typography variant="h4" fontWeight="bold">
                    {userStats.totalApiCalls}
                  </Typography>
                  <Typography variant="body2">API Calls Made</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  sx={{
                    p: 3,
                    textAlign: "center",
                    background:
                      "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                    color: "white",
                  }}
                >
                  <Typography variant="h4" fontWeight="bold">
                    {userStats.creditsEarned}
                  </Typography>
                  <Typography variant="body2">Credits Earned</Typography>
                </Paper>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      )}

      {/* Credit Purchase Dialog */}
      <Dialog
        open={creditDialogOpen}
        onClose={() => setCreditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <CreditCardIcon color="primary" />
            <Typography variant="h5" fontWeight="bold">
              Buy Credits
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            Credits are used to access paid ML models. Free models don't require
            any credits.
          </Alert>

          <Typography variant="body1" gutterBottom>
            Select the number of credits you want to purchase:
          </Typography>
          <Typography
            variant="body2"
            color="textSecondary"
            gutterBottom
            sx={{ mb: 3 }}
          >
            Rate: 1 Credit = ₹10
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            {creditOptions.map((option) => (
              <Grid item xs={6} key={option.credits}>
                <Paper
                  sx={{
                    p: 2,
                    textAlign: "center",
                    cursor: "pointer",
                    border: selectedCredits === option.credits ? 2 : 1,
                    borderColor:
                      selectedCredits === option.credits
                        ? "primary.main"
                        : "grey.300",
                    "&:hover": { borderColor: "primary.main" },
                  }}
                  onClick={() => setSelectedCredits(option.credits)}
                >
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    color="primary.main"
                  >
                    {option.credits}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Credits
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    ₹{option.price}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ bgcolor: "grey.50", p: 2, borderRadius: 2 }}>
            <Typography variant="h6" textAlign="center">
              Total: ₹
              {creditOptions.find((opt) => opt.credits === selectedCredits)
                ?.price || 0}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setCreditDialogOpen(false)} size="large">
            Cancel
          </Button>
          <Button
            variant="contained"
            size="large"
            onClick={handleCreditPurchase}
            disabled={paymentLoading}
            startIcon={
              paymentLoading ? (
                <CircularProgress size={20} />
              ) : (
                <CreditCardIcon />
              )
            }
          >
            {paymentLoading ? "Processing..." : "Proceed to Payment"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Dashboard;
