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
      LIST: "/models/list",
      GET: (id) => `/api/models/${id}`,
    },
    REGENERATE_API_KEY: "/auth/regenerate-api-key",
    RAZORPAY: {
      PROCESS_PAYMENT: "/payment/process",
      GET_KEY: "/getKey",
      VERIFY_PAYMENT: "/paymentVerification",
    },
  },
};
