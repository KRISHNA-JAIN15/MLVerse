import React, { useState, useEffect } from "react";
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as AttachMoneyIcon,
  Api as ApiIcon,
  ModelTraining as ModelTrainingIcon,
  Person as PersonIcon,
  AccessTime as AccessTimeIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
} from "@mui/icons-material";
import { useAuth } from "../context/useAuth";

const Analytics = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timeRange, setTimeRange] = useState("30"); // days

  // Analytics data state
  const [analytics, setAnalytics] = useState({
    overview: {
      totalApiCalls: 0,
      totalEarnings: 0,
      totalModels: 0,
      uniqueUsers: 0,
    },
    modelStats: [],
    recentActivity: [],
    topModels: [],
    earningsBreakdown: [],
    timeSeriesData: [],
  });

  // UI state
  const [expandedModel, setExpandedModel] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user?.token) return;

      setLoading(true);
      setError("");

      try {
        console.log(
          `🔍 Fetching REAL analytics data for user: ${user?.name || user?.id}`
        );

        // Call your actual backend analytics API
        const response = await fetch(
          `http://localhost:6003/api/analytics?timeRange=${timeRange}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${user.token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          const realAnalyticsData = await response.json();
          console.log(
            "✅ Successfully fetched REAL analytics data from backend!"
          );
          console.log("Real data:", realAnalyticsData);

          setAnalytics(realAnalyticsData);
          setError(""); // Clear any previous errors

          console.log(
            `🎉 Showing REAL data: ${
              realAnalyticsData.overview?.totalApiCalls || 0
            } API calls, ${
              realAnalyticsData.overview?.totalEarnings || 0
            } credits earned!`
          );

          // Show appropriate message based on user's situation
          if (realAnalyticsData.overview?.totalApiCalls === 0) {
            if (realAnalyticsData.overview?.totalModels > 0) {
              setError(
                `You have ${realAnalyticsData.overview.totalModels} deployed model(s). Make API calls to see usage analytics here.`
              );
            } else {
              setError(
                "No models deployed yet. Deploy models and make API calls to see analytics here."
              );
            }
          }
        } else {
          console.log("Backend analytics failed, status:", response.status);
          const errorText = await response.text();
          console.log("Error response:", errorText);

          throw new Error(
            `Backend analytics failed: ${response.status} ${errorText}`
          );
        }
      } catch (err) {
        console.error("Error fetching real analytics:", err);
        setError(
          `Unable to load real analytics data: ${err.message}. Please check your backend connection.`
        );

        // Show empty data as fallback
        setAnalytics({
          overview: {
            totalApiCalls: 0,
            totalEarnings: 0,
            totalModels: 0,
            uniqueUsers: 0,
          },
          modelStats: [],
          topModels: [],
          recentActivity: [],
          earningsBreakdown: [],
          timeSeriesData: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [timeRange, user?.token, user?.id, user?.name]);

  const formatCredits = (amount) => {
    return `${amount.toLocaleString()} Credits`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleModelExpand = (modelId) => {
    setExpandedModel(expandedModel === modelId ? null : modelId);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="400px"
        >
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading Real Analytics Data...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 4 }}
      >
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            📊 Real Analytics Dashboard - {user?.name || `User ${user?.id}`}
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Your actual models and API calls - Real data from backend
          </Typography>
        </Box>

        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Time Range</InputLabel>
          <Select
            value={timeRange}
            label="Time Range"
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <MenuItem value="7">Last 7 days</MenuItem>
            <MenuItem value="30">Last 30 days</MenuItem>
            <MenuItem value="90">Last 90 days</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
            }}
          >
            <CardContent sx={{ textAlign: "center" }}>
              <ApiIcon sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {analytics.overview.totalApiCalls.toLocaleString()}
              </Typography>
              <Typography variant="body2">Total API Calls</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
              color: "white",
            }}
          >
            <CardContent sx={{ textAlign: "center" }}>
              <AttachMoneyIcon sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {formatCredits(analytics.overview.totalEarnings)}
              </Typography>
              <Typography variant="body2">Total Credits Earned</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: "linear-gradient(135deg, #3742fa 0%, #2f3542 100%)",
              color: "white",
            }}
          >
            <CardContent sx={{ textAlign: "center" }}>
              <ModelTrainingIcon sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {analytics.overview.totalModels}
              </Typography>
              <Typography variant="body2">Active Models</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
              color: "white",
            }}
          >
            <CardContent sx={{ textAlign: "center" }}>
              <PersonIcon sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {analytics.overview.uniqueUsers}
              </Typography>
              <Typography variant="body2">Unique Users</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Model Performance Table */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" gap={1} mb={3}>
              <AssessmentIcon color="primary" />
              <Typography variant="h6" fontWeight="bold">
                Model Performance - Real Data
              </Typography>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell></TableCell>
                    <TableCell>
                      <strong>Model ID</strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>API Calls</strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>Credits Earned</strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>Avg. Response Time</strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>Success Rate</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analytics.modelStats.map((model) => (
                    <TableRow key={`model-${model.modelId}`}>
                      <TableCell>
                        <IconButton size="small">
                          <ExpandMoreIcon />
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {model.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {model.framework}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="h6" color="primary">
                          {model.apiCalls.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="h6" color="success.main">
                          {formatCredits(model.earnings)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {model.avgResponseTime}ms
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="success.main">
                          {model.successRate}%
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Top Performing Models */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <TrendingUpIcon color="primary" />
              <Typography variant="h6" fontWeight="bold">
                Top Earning Models
              </Typography>
            </Box>

            <List>
              {analytics.topModels.map((model, index) => (
                <ListItem
                  key={model.modelId}
                  divider={index < analytics.topModels.length - 1}
                >
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          label={`#${index + 1}`}
                          size="small"
                          color="primary"
                          sx={{ minWidth: 35 }}
                        />
                        <Typography variant="subtitle2" fontWeight="bold">
                          {model.name}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }} component="span">
                        <Typography
                          variant="body2"
                          color="success.main"
                          fontWeight="bold"
                          component="span"
                        >
                          {formatCredits(model.earnings)}
                        </Typography>
                        <br />
                        <Typography variant="caption" color="textSecondary">
                          {model.apiCalls} calls
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
              {analytics.topModels.length === 0 && (
                <ListItem>
                  <ListItemText
                    primary="No models with earnings yet"
                    secondary="Make API calls to see data here"
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>

        {/* Credits Breakdown */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" gap={1} mb={3}>
              <TimelineIcon color="primary" />
              <Typography variant="h6" fontWeight="bold">
                Credits Breakdown (Last {timeRange} days) - Real Data
              </Typography>
            </Box>

            <Grid container spacing={3}>
              {analytics.earningsBreakdown.map((item) => (
                <Grid item xs={12} sm={6} md={4} key={item.modelId}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography
                        variant="subtitle2"
                        fontWeight="bold"
                        gutterBottom
                      >
                        {item.modelName}
                      </Typography>
                      <Typography
                        variant="h5"
                        color="success.main"
                        fontWeight="bold"
                      >
                        {formatCredits(item.earnings)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {item.apiCalls} API calls
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          mb={1}
                        >
                          <Typography variant="caption">Performance</Typography>
                          <Typography variant="caption">
                            {item.percentage}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={item.percentage}
                          sx={{ height: 8, borderRadius: 4 }}
                          color="success"
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
              {analytics.earningsBreakdown.length === 0 && (
                <Grid item xs={12}>
                  <Typography
                    variant="body1"
                    color="textSecondary"
                    textAlign="center"
                  >
                    No earnings data available yet. Make paid API calls to see
                    breakdowns here.
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Analytics;
