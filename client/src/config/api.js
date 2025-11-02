export const API_CONFIG = {
  BASE_URL: "http://localhost:6003",
  // NOTE: You must replace the <API_GATEWAY_URL> placeholder
  // with your deployed AWS API Gateway URL (e.g., https://gacdi0kh79.execute-api.ap-south-1.amazonaws.com)
  AWS_API_ENDPOINT: "https://gacdi0kh79.execute-api.ap-south-1.amazonaws.com",
  ENDPOINTS: {
    LOGIN: "/auth/login",
    SIGNUP: "/auth/signup",
    LOGOUT: "/auth/logout",
    UPDATE_PROFILE: "/auth/update-profile",
    MODELS: {
      UPLOAD: "/api/models/upload",
      // FIX: Updated to match backend route
      LIST: "/api/models/list", // User's models only (requires auth)
      MARKETPLACE: "/api/models/marketplace", // All models (public)
      GET: (id) => `/api/models/${id}`,
      // Version management endpoints
      UPLOAD_VERSION: "/api/models/upload-version/:modelId",
      GET_VERSIONS: "/api/models/versions/:modelId",
      SET_ACTIVE: "/api/models/set-active/:modelId/:version",
      DELETE: "/api/models/:modelId",
    },
    REGENERATE_API_KEY: "/auth/regenerate-api-key",
    RAZORPAY: {
      PROCESS_PAYMENT: "/payment/process",
      GET_KEY: "/getKey",
      VERIFY_PAYMENT: "/paymentVerification",
    },
  },
};
