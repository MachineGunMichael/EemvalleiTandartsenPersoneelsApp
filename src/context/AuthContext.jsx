import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [serverOnline, setServerOnline] = useState(true);

  // Check if user is already logged in (from localStorage)
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (e) {
        localStorage.removeItem("user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch("http://localhost:5001/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }

      const userData = await response.json();
      setUser(userData);
      setIsAuthenticated(true);
      setServerOnline(true);
      localStorage.setItem("user", JSON.stringify(userData));
      return { success: true };
    } catch (error) {
      if (error.message === "Failed to fetch") {
        setServerOnline(false);
        return { success: false, error: "server_offline" };
      }
      setServerOnline(true);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("user");
  };

  const checkServerStatus = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:5001/api/health");
      setServerOnline(response.ok);
      return response.ok;
    } catch {
      setServerOnline(false);
      return false;
    }
  }, []);

  const value = {
    user,
    isAuthenticated,
    isLoading,
    serverOnline,
    login,
    logout,
    checkServerStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;

