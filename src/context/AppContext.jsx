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
    { path: "/bestellingen", name: "Bestellingen", icon: "orders" },
    { path: "/documenten", name: "Documenten", icon: "folder" },
    { path: "/instellingen", name: "Instellingen", icon: "settings" },
  ],
  manager: [
    { path: "/", name: "Dashboard", icon: "dashboard" },
    { path: "/medewerkers", name: "Medewerkers", icon: "people" },
    { path: "/vakantie", name: "Vakantie", icon: "vacation" },
    { path: "/overuren", name: "Overuren", icon: "overtime" },
    { path: "/bestellingen", name: "Bestellingen", icon: "orders" },
    { path: "/documenten", name: "Documenten", icon: "folder" },
  ],
  employee: [
    { path: "/", name: "Dashboard", icon: "dashboard" },
    { path: "/vakantie", name: "Vakantie", icon: "vacation" },
    { path: "/overuren", name: "Overuren", icon: "overtime" },
    { path: "/bestellingen", name: "Bestellingen", icon: "orders" },
    { path: "/documenten", name: "Documenten", icon: "folder" },
  ],
  basic: [
    { path: "/bestellingen", name: "Bestellingen", icon: "orders" },
    { path: "/documenten", name: "Documenten", icon: "folder" },
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
