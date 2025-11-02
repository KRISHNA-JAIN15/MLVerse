const { dynamodb, TABLE_NAME } = require("../config/aws/dynamoConfig");
const { ScanCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const mysql = require("mysql2/promise");

// Use native fetch if available (Node 18+), otherwise use node-fetch
const fetch = globalThis.fetch || require("node-fetch");

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

const LAMBDA_API_BASE_URL =
  "https://gacdi0kh79.execute-api.ap-south-1.amazonaws.com";

const analyticsOperations = (db) => ({
  // Get comprehensive analytics for a user using real Lambda data OR real usage data
  getUserAnalytics: async (userId, timeRangeDays = 30) => {
    try {
      console.log(
        `🔍 Getting analytics for user ${userId} (${timeRangeDays} days)`
      );

      // First, try to get real usage data from ModelUsage table directly
      try {
        console.log(
          "📊 Attempting to fetch REAL usage data from ModelUsage table..."
        );
        const realUsageData = await analyticsOperations(
          db
        ).getRealUsageAnalytics(userId, timeRangeDays);

        if (realUsageData && realUsageData.overview.totalApiCalls > 0) {
          console.log(
            `✅ Found REAL usage data: ${realUsageData.overview.totalApiCalls} API calls`
          );
          return realUsageData;
        } else {
          console.log(
            "⚠️ No real usage data found in ModelUsage table - showing clean zero data"
          );
          // For new users with no usage data, show clean zero data with their actual models
          const userModels = await analyticsOperations(db).getUserModels(
            userId
          );
          console.log(
            `📱 User has ${userModels.length} deployed models - showing zero usage`
          );
          return analyticsOperations(db).generateCleanZeroAnalytics(userModels);
        }
      } catch (usageError) {
        console.log("❌ Error fetching real usage data:", usageError.message);
      }

      // Fallback: Get the user's API key from the database
      const userApiKey = await analyticsOperations(db).getUserApiKey(userId);

      if (!userApiKey) {
        console.log(
          "No API key found for user, showing zero analytics for their models"
        );
        const userModels = await analyticsOperations(db).getUserModels(userId);
        console.log(
          `📱 User has ${userModels.length} deployed models - showing zero usage`
        );
        return analyticsOperations(db).generateCleanZeroAnalytics(userModels);
      }

      // Convert timeRangeDays to timeframe format
      const timeframe =
        timeRangeDays <= 1
          ? "24h"
          : timeRangeDays <= 7
          ? "7d"
          : timeRangeDays <= 30
          ? "30d"
          : "90d";

      try {
        // Call Lambda analytics endpoints
        const [overviewResponse, modelsResponse, earningsResponse] =
          await Promise.all([
            fetch(
              `${LAMBDA_API_BASE_URL}/analytics/overview?timeframe=${timeframe}`,
              {
                method: "GET",
                headers: {
                  "X-Api-Key": userApiKey,
                  "Content-Type": "application/json",
                },
              }
            ),
            fetch(
              `${LAMBDA_API_BASE_URL}/analytics/models?timeframe=${timeframe}`,
              {
                method: "GET",
                headers: {
                  "X-Api-Key": userApiKey,
                  "Content-Type": "application/json",
                },
              }
            ),
            fetch(
              `${LAMBDA_API_BASE_URL}/analytics/earnings?timeframe=${timeframe}`,
              {
                method: "GET",
                headers: {
                  "X-Api-Key": userApiKey,
                  "Content-Type": "application/json",
                },
              }
            ),
          ]);

        if (overviewResponse.ok && modelsResponse.ok && earningsResponse.ok) {
          const [overviewData, modelsData, earningsData] = await Promise.all([
            overviewResponse.json(),
            modelsResponse.json(),
            earningsResponse.json(),
          ]);

          console.log("Successfully fetched real analytics data from Lambda");

          // Transform Lambda data to expected format
          return {
            overview: {
              totalApiCalls: overviewData.data.totalApiCalls,
              totalEarnings: overviewData.data.totalCreditsEarned,
              totalModels: overviewData.data.uniqueModels,
              uniqueUsers: overviewData.data.uniqueUsers,
            },
            modelStats: modelsData.data.map((model) => ({
              modelId: model.modelId,
              name: model.modelId,
              framework: model.framework,
              pricingType: model.pricingType,
              creditsPerCall: 0,
              apiCalls: model.totalCalls,
              earnings: model.creditsEarned,
              successRate: model.successRate,
              avgResponseTime: model.avgResponseTime,
              lastCalled: null,
              recentCalls: [],
            })),
            topModels: modelsData.data.slice(0, 5).map((model, index) => ({
              modelId: model.modelId,
              name: model.modelId,
              earnings: model.creditsEarned,
              apiCalls: model.totalCalls,
              creditsPerCall: 0,
              rank: index + 1,
            })),
            recentActivity: [],
            earningsBreakdown: earningsData.data.modelEarnings.map((model) => ({
              modelId: model.modelId,
              modelName: model.modelId,
              earnings: model.credits,
              apiCalls: model.calls,
              percentage: Math.round(
                (model.credits / (earningsData.data.totalEarnings || 1)) * 100
              ),
            })),
            timeSeriesData: earningsData.data.dailyEarnings.map((day) => ({
              date: day.date,
              apiCalls: 0,
              earnings: day.credits,
            })),
          };
        } else {
          console.log("Lambda analytics failed, falling back to mock data");
          throw new Error("Lambda call failed");
        }
      } catch (lambdaError) {
        console.log(
          "Lambda analytics error, showing clean zero data:",
          lambdaError.message
        );
        // Fallback to clean zero data if Lambda calls fail (no random numbers)
        const userModels = await analyticsOperations(db).getUserModels(userId);
        return analyticsOperations(db).generateCleanZeroAnalytics(userModels);
      }
    } catch (error) {
      console.error("Error getting user analytics:", error);
      throw error;
    }
  },

  // Get real usage analytics from ModelUsage DynamoDB table
  getRealUsageAnalytics: async (userId, timeRangeDays = 30) => {
    try {
      console.log(
        `📊 Fetching real usage data for user ${userId} from ModelUsage table`
      );

      // Calculate time range for filtering
      const endTime = Date.now();
      const startTime = endTime - timeRangeDays * 24 * 60 * 60 * 1000;

      // Query ModelUsage table for this user's model usage
      // We need to scan because we don't have a direct user index, but we'll filter by ownerId
      const params = {
        TableName: "ModelUsage",
        FilterExpression:
          "ownerId = :userId AND #ts BETWEEN :startTime AND :endTime",
        ExpressionAttributeNames: {
          "#ts": "timestamp",
        },
        ExpressionAttributeValues: {
          ":userId": String(userId),
          ":startTime": startTime.toString(),
          ":endTime": endTime.toString(),
        },
      };

      const result = await dynamodb.send(new ScanCommand(params));
      const usageRecords = result.Items || [];

      console.log(
        `📈 Found ${usageRecords.length} usage records for user ${userId}`
      );

      if (usageRecords.length === 0) {
        return null; // No real usage data
      }

      // Process usage records to create analytics
      const modelStats = {};
      let totalApiCalls = 0;
      let totalEarnings = 0;
      const uniqueUsers = new Set();
      const recentActivity = [];

      usageRecords.forEach((record) => {
        const modelId = record.modelId;
        const creditsEarned = parseFloat(record.creditsEarned || 0);
        const callerId = record.userId;

        totalApiCalls++;
        totalEarnings += creditsEarned;
        uniqueUsers.add(callerId);

        // Group by model
        if (!modelStats[modelId]) {
          modelStats[modelId] = {
            modelId: modelId,
            name:
              record.modelId.substring(0, 20) +
              (record.modelId.length > 20 ? "..." : ""),
            framework: record.framework || "unknown",
            pricingType: record.pricingType || "free",
            creditsPerCall: creditsEarned > 0 ? creditsEarned : 0,
            apiCalls: 0,
            earnings: 0,
            successRate: 0,
            avgResponseTime: 0,
            lastCalled: null,
            recentCalls: [],
            totalResponseTime: 0,
            successfulCalls: 0,
          };
        }

        const modelStat = modelStats[modelId];
        modelStat.apiCalls++;
        modelStat.earnings += creditsEarned;

        // Track response time and success rate
        const responseTime = parseInt(record.responseTimeMs || 200);
        modelStat.totalResponseTime += responseTime;

        if (record.status === "success") {
          modelStat.successfulCalls++;
        }

        // Update success rate and avg response time
        modelStat.successRate = Math.round(
          (modelStat.successfulCalls / modelStat.apiCalls) * 100
        );
        modelStat.avgResponseTime = Math.round(
          modelStat.totalResponseTime / modelStat.apiCalls
        );

        // Track recent activity
        if (recentActivity.length < 10) {
          recentActivity.push({
            modelId: modelId,
            modelName: modelStat.name,
            userId: callerId,
            timestamp: new Date(parseInt(record.timestamp)).toISOString(),
            responseTime: responseTime,
            status: record.status || "success",
            creditsEarned: creditsEarned,
          });
        }

        // Update last called
        const callTime = new Date(parseInt(record.timestamp)).toISOString();
        if (!modelStat.lastCalled || callTime > modelStat.lastCalled) {
          modelStat.lastCalled = callTime;
        }
      });

      // Convert modelStats object to array
      const modelStatsArray = Object.values(modelStats);

      // Sort models by API calls (most used first)
      modelStatsArray.sort((a, b) => b.apiCalls - a.apiCalls);

      // Create top models (by earnings)
      const topModels = [...modelStatsArray]
        .sort((a, b) => b.earnings - a.earnings)
        .slice(0, 5)
        .map((model, index) => ({
          modelId: model.modelId,
          name: model.name,
          earnings: model.earnings,
          apiCalls: model.apiCalls,
          creditsPerCall: model.creditsPerCall,
          rank: index + 1,
        }));

      // Create earnings breakdown
      const earningsBreakdown = modelStatsArray
        .filter((model) => model.earnings > 0)
        .map((model) => ({
          modelId: model.modelId,
          modelName: model.name,
          earnings: model.earnings,
          apiCalls: model.apiCalls,
          percentage: Math.round(
            (model.earnings / Math.max(totalEarnings, 1)) * 100
          ),
        }))
        .sort((a, b) => b.earnings - a.earnings);

      // Sort recent activity by timestamp (most recent first)
      recentActivity.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );

      // Generate time series data (simplified - daily aggregation)
      const timeSeriesData = [];
      const dailyData = {};

      usageRecords.forEach((record) => {
        const date = new Date(parseInt(record.timestamp))
          .toISOString()
          .split("T")[0];
        if (!dailyData[date]) {
          dailyData[date] = { apiCalls: 0, earnings: 0 };
        }
        dailyData[date].apiCalls++;
        dailyData[date].earnings += parseFloat(record.creditsEarned || 0);
      });

      Object.entries(dailyData).forEach(([date, data]) => {
        timeSeriesData.push({
          date: date,
          apiCalls: data.apiCalls,
          earnings: data.earnings,
        });
      });

      timeSeriesData.sort((a, b) => a.date.localeCompare(b.date));

      const analyticsData = {
        overview: {
          totalApiCalls,
          totalEarnings,
          totalModels: modelStatsArray.length,
          uniqueUsers: uniqueUsers.size,
        },
        modelStats: modelStatsArray,
        topModels,
        recentActivity,
        earningsBreakdown,
        timeSeriesData,
      };

      console.log(
        `✅ Generated real analytics: ${totalApiCalls} calls, ${totalEarnings} credits, ${modelStatsArray.length} models`
      );
      return analyticsData;
    } catch (error) {
      console.error("Error getting real usage analytics:", error);
      throw error;
    }
  },

  // Get user's API key from the database using shared connection
  getUserApiKey: async (userId) => {
    return new Promise((resolve, reject) => {
      const query = "SELECT api_key FROM users WHERE id = ?";
      db.query(query, [userId], (err, results) => {
        if (err) {
          console.error("Error getting user API key:", err);
          reject(err);
          return;
        }

        if (results.length === 0) {
          console.log("User not found for ID:", userId);
          resolve(null);
          return;
        }

        const apiKey = results[0].api_key;
        if (!apiKey) {
          console.log("No API key found for user:", userId);
          resolve(null);
        } else {
          console.log("Found API key for user:", userId);
          resolve(apiKey);
        }
      });
    });
  },

  // Get user's models
  getUserModels: async (userId) => {
    const params = {
      TableName: TABLE_NAME,
      FilterExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": String(userId),
      },
    };

    try {
      const result = await dynamodb.send(new ScanCommand(params));
      return result.Items || [];
    } catch (error) {
      console.error("Error getting user models:", error);
      throw error;
    }
  },

  // Generate clean zero analytics for new users (no random data)
  generateCleanZeroAnalytics: (models) => {
    console.log(
      `📊 Generating clean zero analytics for ${models.length} models`
    );

    const modelStats = models.map((model) => ({
      modelId: model.modelId,
      name: model.name || `Model ${model.modelId.substring(0, 8)}`,
      framework: model.framework || "unknown",
      pricingType: model.pricingType || "free",
      creditsPerCall: model.creditsPerCall || 0,
      apiCalls: 0, // Always zero for new users
      earnings: 0, // Always zero for new users
      successRate: 0, // No calls yet
      avgResponseTime: 0, // No calls yet
      lastCalled: null, // Never called
      recentCalls: [], // No recent calls
    }));

    return {
      overview: {
        totalApiCalls: 0, // Always zero
        totalEarnings: 0, // Always zero
        totalModels: models.length, // Actual number of deployed models
        uniqueUsers: 0, // No users have called yet
      },
      modelStats: modelStats,
      topModels: [], // No top models yet (no earnings)
      recentActivity: [], // No activity yet
      earningsBreakdown: [], // No earnings yet
      timeSeriesData: [], // No time series data yet
    };
  },

  // Generate realistic analytics data based on actual models (will be replaced with real usage data)
  generateRealisticAnalytics: (models, timeRangeDays) => {
    const totalModels = models.length;
    const activeModels = models.filter((m) => m.isActive).length;

    // Generate mock data for each model
    const modelStats = models.map((model) => {
      const isPaid = model.pricingType === "paid";
      const creditsPerCall = model.creditsPerCall || 0;

      // Generate random but realistic API call data
      const baseApiCalls = Math.floor(Math.random() * 1000) + 50;
      const apiCalls = Math.floor(baseApiCalls * (timeRangeDays / 30));
      const earnings = isPaid ? apiCalls * creditsPerCall : 0; // Credits earned, not money
      const successRate = Math.floor(Math.random() * 10) + 90; // 90-100%
      const avgResponseTime = Math.floor(Math.random() * 500) + 100; // 100-600ms

      // Generate recent calls
      const recentCalls = [];
      for (let i = 0; i < Math.min(5, apiCalls); i++) {
        const callDate = new Date();
        callDate.setHours(
          callDate.getHours() - Math.floor(Math.random() * 24 * timeRangeDays)
        );

        recentCalls.push({
          userId: `user_${Math.floor(Math.random() * 100)}`,
          timestamp: callDate.toISOString(),
          responseTime: Math.floor(Math.random() * 500) + 100,
          status: Math.random() > 0.1 ? "success" : "error",
          creditsEarned: isPaid ? creditsPerCall : 0,
        });
      }

      return {
        modelId: model.modelId,
        name: model.name,
        framework: model.framework,
        pricingType: model.pricingType,
        creditsPerCall: creditsPerCall,
        apiCalls: apiCalls,
        earnings: earnings,
        successRate: successRate,
        avgResponseTime: avgResponseTime,
        lastCalled: apiCalls > 0 ? recentCalls[0]?.timestamp : null,
        recentCalls: recentCalls.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        ),
      };
    });

    // Calculate overview stats
    const totalApiCalls = modelStats.reduce(
      (sum, model) => sum + model.apiCalls,
      0
    );
    const totalEarnings = modelStats.reduce(
      (sum, model) => sum + model.earnings,
      0
    );
    const uniqueUsers = Math.floor(totalApiCalls * 0.3); // Estimate unique users

    // Top performing models
    const topModels = [...modelStats]
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, 5)
      .map((model, index) => ({
        modelId: model.modelId,
        name: model.name,
        earnings: model.earnings,
        apiCalls: model.apiCalls,
        creditsPerCall: model.creditsPerCall,
        rank: index + 1,
      }));

    // Recent activity (combine all model activities)
    const recentActivity = [];
    modelStats.forEach((model) => {
      model.recentCalls.forEach((call) => {
        recentActivity.push({
          modelId: model.modelId,
          modelName: model.name,
          userId: call.userId,
          timestamp: call.timestamp,
          responseTime: call.responseTime,
          status: call.status,
          creditsEarned: call.creditsEarned,
        });
      });
    });

    // Sort recent activity by timestamp
    recentActivity.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    // Earnings breakdown
    const totalEarningsForBreakdown = Math.max(totalEarnings, 1); // Avoid division by zero
    const earningsBreakdown = modelStats
      .filter((model) => model.earnings > 0)
      .map((model) => ({
        modelId: model.modelId,
        modelName: model.name,
        earnings: model.earnings,
        apiCalls: model.apiCalls,
        percentage: Math.round(
          (model.earnings / totalEarningsForBreakdown) * 100
        ),
      }))
      .sort((a, b) => b.earnings - a.earnings);

    // Time series data (mock daily data)
    const timeSeriesData = [];
    for (let i = timeRangeDays - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const dailyApiCalls = Math.floor(
        (totalApiCalls / timeRangeDays) * (0.5 + Math.random())
      );
      const dailyEarnings = Math.floor(
        (totalEarnings / timeRangeDays) * (0.5 + Math.random())
      );

      timeSeriesData.push({
        date: date.toISOString().split("T")[0],
        apiCalls: dailyApiCalls,
        earnings: dailyEarnings,
      });
    }

    return {
      overview: {
        totalApiCalls,
        totalEarnings,
        totalModels: activeModels,
        uniqueUsers,
      },
      modelStats: modelStats.sort((a, b) => b.apiCalls - a.apiCalls), // Sort by API calls
      topModels,
      recentActivity: recentActivity.slice(0, 10), // Show last 10 activities
      earningsBreakdown,
      timeSeriesData,
    };
  },

  // Get analytics for a specific model
  getModelAnalytics: async (userId, modelId, timeRangeDays = 30) => {
    try {
      // Get the specific model
      const params = {
        TableName: TABLE_NAME,
        FilterExpression:
          "userId = :userId AND (modelId = :modelId OR baseModelId = :modelId)",
        ExpressionAttributeValues: {
          ":userId": String(userId),
          ":modelId": modelId,
        },
      };

      const result = await dynamodb.send(new ScanCommand(params));
      const modelVersions = result.Items || [];

      if (modelVersions.length === 0) {
        throw new Error("Model not found");
      }

      // Generate detailed analytics for this model
      const model = modelVersions.find((m) => m.isActive) || modelVersions[0];
      const mockData = analyticsOperations.generateRealisticAnalytics(
        [model],
        timeRangeDays
      );

      return {
        model: model,
        analytics: mockData.modelStats[0],
        versions: modelVersions.map((v) => ({
          version: v.version,
          versionNumber: v.versionNumber,
          isActive: v.isActive,
          createdAt: v.createdAt,
          apiCalls: Math.floor(Math.random() * 500) + 10,
          earnings:
            v.pricingType === "paid"
              ? Math.floor(Math.random() * 1000) + 100
              : 0,
        })),
      };
    } catch (error) {
      console.error("Error getting model analytics:", error);
      throw error;
    }
  },
});

module.exports = analyticsOperations;
