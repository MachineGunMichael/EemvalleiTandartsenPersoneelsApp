import React from "react";
import { useAuth } from "./AuthContext";

const AppContext = React.createContext({
  currentRole: null,
  availableRoutes: [],
  getRoutesForRole: () => [],
});

export const useAppContext = () => {
  return React.useContext(AppContext);
};

// Define which routes each role can access
export const roleRoutes = {
  admin: [
    { path: "/", name: "Dashboard", icon: "dashboard" },
    { path: "/medewerkers", name: "Medewerkers", icon: "people" },
    { path: "/instellingen", name: "Instellingen", icon: "settings" },
    { path: "/vakantie", name: "Vakantie", icon: "vacation" },
  ],
  manager: [
    { path: "/", name: "Dashboard", icon: "dashboard" },
    { path: "/medewerkers", name: "Medewerkers", icon: "people" },
    { path: "/vakantie", name: "Vakantie", icon: "vacation" },
  ],
  employee: [
    { path: "/", name: "Dashboard", icon: "dashboard" },
    { path: "/vakantie", name: "Vakantie", icon: "vacation" },
  ],
};

export function AppContextProvider({ children }) {
  const { user } = useAuth();
  
  const currentRole = user?.role || null;
  
  const getRoutesForRole = React.useCallback((role) => {
    return roleRoutes[role] || [];
  }, []);

  const availableRoutes = currentRole ? getRoutesForRole(currentRole) : [];

  const value = React.useMemo(() => ({
    currentRole,
    availableRoutes,
    getRoutesForRole,
  }), [currentRole, availableRoutes, getRoutesForRole]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export default AppContext;
