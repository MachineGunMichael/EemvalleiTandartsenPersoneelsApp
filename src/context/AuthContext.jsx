import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import API_BASE_URL from "../config/api";

const AuthContext = createContext(null);

// Session timeout in milliseconds (1 hour = 60 * 60 * 1000)
const SESSION_TIMEOUT = 60 * 60 * 1000;
const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // Check every minute

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
  const activityCheckRef = useRef(null);

  // Update last activity timestamp
  const updateLastActivity = useCallback(() => {
    if (isAuthenticated) {
      localStorage.setItem("lastActivity", Date.now().toString());
    }
  }, [isAuthenticated]);

  // Check if session has expired
  const checkSessionExpiry = useCallback(() => {
    const lastActivity = localStorage.getItem("lastActivity");
    if (lastActivity) {
      const timeSinceLastActivity = Date.now() - parseInt(lastActivity, 10);
      if (timeSinceLastActivity >= SESSION_TIMEOUT) {
        console.log("Session expired due to inactivity");
        // Clear user state
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem("user");
        localStorage.removeItem("lastActivity");
        localStorage.removeItem("selectedEmployeeId");
      }
    }
  }, []);

  // Set up activity tracking
  useEffect(() => {
    if (!isAuthenticated) {
      // Clear timers when not authenticated
      if (activityCheckRef.current) clearInterval(activityCheckRef.current);
      return;
    }

    // Initialize last activity on login
    updateLastActivity();

    // Activity events to track
    const activityEvents = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];

    // Throttled activity handler (update at most once per second)
    let lastUpdate = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastUpdate > 1000) {
        lastUpdate = now;
        updateLastActivity();
      }
    };

    // Add event listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Set up periodic check for session expiry
    activityCheckRef.current = setInterval(checkSessionExpiry, ACTIVITY_CHECK_INTERVAL);

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (activityCheckRef.current) clearInterval(activityCheckRef.current);
    };
  }, [isAuthenticated, updateLastActivity, checkSessionExpiry]);

  // Check if user is already logged in (from localStorage)
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        // Check if session has expired before restoring
        const lastActivity = localStorage.getItem("lastActivity");
        if (lastActivity) {
          const timeSinceLastActivity = Date.now() - parseInt(lastActivity, 10);
          if (timeSinceLastActivity >= SESSION_TIMEOUT) {
            // Session expired, clear storage
            localStorage.removeItem("user");
            localStorage.removeItem("lastActivity");
            localStorage.removeItem("selectedEmployeeId");
            setIsLoading(false);
            return;
          }
        }
        
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
      const response = await fetch(`${API_BASE_URL}/api/login`, {
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
      localStorage.setItem("lastActivity", Date.now().toString());
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

  const logout = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("user");
    localStorage.removeItem("lastActivity");
    localStorage.removeItem("selectedEmployeeId");
  }, []);

  const checkServerStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
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

