export const API_CONFIG = {
  BASE_URL: "http://localhost:6003",
  ENDPOINTS: {
    LOGIN: "/auth/login",
    SIGNUP: "/auth/signup",
    LOGOUT: "/auth/logout",
    UPDATE_PROFILE: "/auth/update-profile",
    MODELS: {
      UPLOAD: "/api/models/upload",
      LIST: "/api/models",
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
