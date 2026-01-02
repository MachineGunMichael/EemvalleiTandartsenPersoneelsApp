import React from "react";
import { ColorModeContext, useMode } from "./theme";
import { CssBaseline, ThemeProvider, Box, CircularProgress } from "@mui/material";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { useAppContext } from "./context/AppContext";
import { SidebarProvider } from "./context/SidebarContext";
import Topbar from "./scenes/global/Topbar";
import Sidebar from "./scenes/global/Sidebar";
import Dashboard from "./scenes/dashboard";
import Vakantie from "./scenes/vakantie";
import Overuren from "./scenes/overuren";
import Medewerkers from "./scenes/medewerkers";
import Instellingen from "./scenes/instellingen";
import Documenten from "./scenes/documenten";
import Bestellingen from "./scenes/bestellingen";
import Login from "./scenes/login";

// Main layout with sidebar and topbar
const MainLayout = ({ children }) => {
  return (
    <SidebarProvider>
      <div className="app">
        <Sidebar />
        <main className="content">
          <Topbar />
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
};

function App() {
  const [theme, colorMode] = useMode();
  const { isAuthenticated, isLoading } = useAuth();
  const { currentRole } = useAppContext();

  // Show loading spinner while checking auth state
  if (isLoading) {
    return (
      <ColorModeContext.Provider value={colorMode}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            height="100vh"
          >
            <CircularProgress />
          </Box>
        </ThemeProvider>
      </ColorModeContext.Provider>
    );
  }

  // Not authenticated - show login
  if (!isAuthenticated) {
    return (
      <ColorModeContext.Provider value={colorMode}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Login />
        </ThemeProvider>
      </ColorModeContext.Provider>
    );
  }

  // Authenticated - show main app
  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <MainLayout>
          <Routes>
            {/* Dashboard - not for basic role */}
            {currentRole !== "basic" && (
              <Route path="/" element={<Dashboard />} />
            )}
            {/* Redirect basic users from / to /bestellingen */}
            {currentRole === "basic" && (
              <Route path="/" element={<Navigate to="/bestellingen" replace />} />
            )}
            {(currentRole === "manager" || currentRole === "employee") && (
              <Route path="/vakantie" element={<Vakantie />} />
            )}
            {(currentRole === "manager" || currentRole === "employee") && (
              <Route path="/overuren" element={<Overuren />} />
            )}
            {(currentRole === "admin" || currentRole === "manager") && (
              <Route path="/medewerkers" element={<Medewerkers />} />
            )}
            {currentRole === "admin" && (
              <Route path="/instellingen" element={<Instellingen />} />
            )}
            {(currentRole === "admin" || currentRole === "manager" || currentRole === "employee" || currentRole === "basic") && (
              <Route path="/bestellingen" element={<Bestellingen />} />
            )}
            {(currentRole === "admin" || currentRole === "manager" || currentRole === "employee" || currentRole === "basic") && (
              <Route path="/documenten" element={<Documenten />} />
            )}
            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to={currentRole === "basic" ? "/bestellingen" : "/"} replace />} />
          </Routes>
        </MainLayout>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;
