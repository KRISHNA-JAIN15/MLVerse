import { useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Button,
  Box,
  Grid,
  Paper,
  Card,
  CardContent,
  Chip,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ApiIcon from "@mui/icons-material/Api";
import StorefrontIcon from "@mui/icons-material/Storefront";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import SecurityIcon from "@mui/icons-material/Security";
import SpeedIcon from "@mui/icons-material/Speed";
import { useAuth } from "../context/useAuth";

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Hero Section */}
      <Paper
        sx={{
          position: "relative",
          backgroundColor: "grey.800",
          color: "#fff",
          mb: 4,
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          minHeight: "500px",
        }}
      >
        <Container maxWidth="lg">
          <Grid container>
            <Grid item md={8}>
              <Box
                sx={{
                  position: "relative",
                  p: { xs: 3, md: 6 },
                  pr: { md: 0 },
                  minHeight: "500px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <Typography
                  component="h1"
                  variant="h2"
                  color="inherit"
                  gutterBottom
                  fontWeight="bold"
                >
                  MLVerse
                </Typography>
                <Typography
                  variant="h4"
                  color="inherit"
                  paragraph
                  sx={{ opacity: 0.9 }}
                >
                  Deploy, Share, and Monetize Your ML Models
                </Typography>
                <Typography
                  variant="h6"
                  color="inherit"
                  paragraph
                  sx={{ opacity: 0.8 }}
                >
                  The ultimate platform for machine learning model deployment
                  and API management. Upload your models, create APIs, and earn
                  credits from the community.
                </Typography>

                <Box sx={{ mt: 4, display: "flex", gap: 2, flexWrap: "wrap" }}>
                  {!user ? (
                    <>
                      <Button
                        variant="contained"
                        size="large"
                        onClick={() => navigate("/signup")}
                        sx={{
                          bgcolor: "white",
                          color: "primary.main",
                          "&:hover": { bgcolor: "grey.100" },
                        }}
                      >
                        Get Started Free
                      </Button>
                      <Button
                        variant="outlined"
                        size="large"
                        onClick={() => navigate("/community")}
                        sx={{
                          color: "white",
                          borderColor: "white",
                          "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
                        }}
                      >
                        Browse Models
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="contained"
                        size="large"
                        onClick={() => navigate("/dashboard")}
                        sx={{
                          bgcolor: "white",
                          color: "primary.main",
                          "&:hover": { bgcolor: "grey.100" },
                        }}
                      >
                        Go to Dashboard
                      </Button>
                      <Button
                        variant="outlined"
                        size="large"
                        onClick={() => navigate("/add-model")}
                        sx={{
                          color: "white",
                          borderColor: "white",
                          "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
                        }}
                      >
                        Upload Model
                      </Button>
                    </>
                  )}
                </Box>

                <Box sx={{ mt: 4, display: "flex", gap: 2, flexWrap: "wrap" }}>
                  <Chip
                    label="🚀 Easy Deployment"
                    sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white" }}
                  />
                  <Chip
                    label="💰 Monetization"
                    sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white" }}
                  />
                  <Chip
                    label="🔐 Secure APIs"
                    sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white" }}
                  />
                  <Chip
                    label="⚡ Fast Inference"
                    sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white" }}
                  />
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Paper>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ mt: 8, mb: 8 }}>
        <Typography
          variant="h3"
          textAlign="center"
          gutterBottom
          fontWeight="bold"
        >
          Why Choose MLVerse?
        </Typography>
        <Typography
          variant="h6"
          textAlign="center"
          color="textSecondary"
          sx={{ mb: 6 }}
        >
          Everything you need to deploy, share, and monetize your machine
          learning models
        </Typography>

        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: "100%", textAlign: "center", p: 2 }}>
              <CardContent>
                <CloudUploadIcon
                  sx={{ fontSize: 60, color: "primary.main", mb: 2 }}
                />
                <Typography variant="h5" gutterBottom fontWeight="bold">
                  Easy Model Upload
                </Typography>
                <Typography>
                  Upload your trained models in popular formats (PKL, H5, PT,
                  etc.) with just a few clicks. Support for scikit-learn,
                  TensorFlow, PyTorch, and more.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: "100%", textAlign: "center", p: 2 }}>
              <CardContent>
                <ApiIcon sx={{ fontSize: 60, color: "success.main", mb: 2 }} />
                <Typography variant="h5" gutterBottom fontWeight="bold">
                  Instant API Creation
                </Typography>
                <Typography>
                  Transform your models into production-ready APIs
                  automatically. Get secure endpoints with authentication and
                  detailed documentation.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: "100%", textAlign: "center", p: 2 }}>
              <CardContent>
                <MonetizationOnIcon
                  sx={{ fontSize: 60, color: "warning.main", mb: 2 }}
                />
                <Typography variant="h5" gutterBottom fontWeight="bold">
                  Monetize Your Models
                </Typography>
                <Typography>
                  Set pricing for your models and earn credits when others use
                  them. Build a passive income stream from your ML expertise.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: "100%", textAlign: "center", p: 2 }}>
              <CardContent>
                <StorefrontIcon
                  sx={{ fontSize: 60, color: "secondary.main", mb: 2 }}
                />
                <Typography variant="h5" gutterBottom fontWeight="bold">
                  Community Marketplace
                </Typography>
                <Typography>
                  Discover and use models from the community. Find the perfect
                  model for your project from our growing marketplace.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: "100%", textAlign: "center", p: 2 }}>
              <CardContent>
                <SecurityIcon
                  sx={{ fontSize: 60, color: "info.main", mb: 2 }}
                />
                <Typography variant="h5" gutterBottom fontWeight="bold">
                  Secure & Reliable
                </Typography>
                <Typography>
                  Enterprise-grade security with API key authentication, rate
                  limiting, and reliable cloud infrastructure.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: "100%", textAlign: "center", p: 2 }}>
              <CardContent>
                <SpeedIcon sx={{ fontSize: 60, color: "error.main", mb: 2 }} />
                <Typography variant="h5" gutterBottom fontWeight="bold">
                  Lightning Fast
                </Typography>
                <Typography>
                  Optimized infrastructure for fast model inference. Get
                  predictions in milliseconds with our scalable architecture.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* CTA Section */}
      <Paper sx={{ p: 6, bgcolor: "grey.100", textAlign: "center" }}>
        <Container maxWidth="md">
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Ready to Get Started?
          </Typography>
          <Typography variant="h6" color="textSecondary" sx={{ mb: 4 }}>
            Join thousands of developers and data scientists using MLVerse to
            deploy and monetize their models.
          </Typography>
          {!user ? (
            <Box
              sx={{
                display: "flex",
                gap: 2,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate("/signup")}
              >
                Sign Up Free
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate("/community")}
              >
                Explore Marketplace
              </Button>
            </Box>
          ) : (
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate("/add-model")}
            >
              Upload Your First Model
            </Button>
          )}
        </Container>
      </Paper>
    </Box>
  );
};

export default Home;
