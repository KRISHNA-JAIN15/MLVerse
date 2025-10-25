import { useState, useEffect } from "react";
import api from "../utils/auth";
import { AuthContext } from "./useAuth";

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored user data on mount
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    if (storedUser && storedToken) {
      const userData = JSON.parse(storedUser);
      // Ensure token is always included in user data
      setUser({ ...userData, token: storedToken });
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    try {
      const response = await api.post("/auth/login", credentials);
      const { token, user } = response.data;
      const userWithToken = { ...user, token };
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(userWithToken));
      setUser(userWithToken);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || "Login failed",
      };
    }
  };

  const signup = async (userData) => {
    try {
      const response = await api.post("/auth/signup", userData);
      const { token, user } = response.data;
      const userWithToken = { ...user, token };
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(userWithToken));
      setUser(userWithToken);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || "Signup failed",
      };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const updateUserProfile = async (updatedData) => {
    try {
      const response = await api.put("/auth/update-profile", updatedData);
      const updatedUser = response.data.user;

      // Merge the updated user data with existing user data to preserve all fields
      const mergedUser = { ...user, ...updatedUser };

      // Store the complete user data in localStorage
      localStorage.setItem("user", JSON.stringify(mergedUser));
      setUser(mergedUser);

      return { success: true, user: mergedUser };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || "Update failed",
      };
    }
  };

  const refreshUserData = async () => {
    try {
      const response = await api.get("/auth/me");
      const userData = response.data.user;
      const mergedUser = { ...user, ...userData };
      localStorage.setItem("user", JSON.stringify(mergedUser));
      setUser(mergedUser);
      return { success: true, user: mergedUser };
    } catch (error) {
      console.error("Failed to refresh user data:", error);
      return {
        success: false,
        error: error.response?.data?.error || "Failed to refresh user data",
      };
    }
  };

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    updateUserProfile,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
