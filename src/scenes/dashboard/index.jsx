import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
} from "@mui/material";
import { tokens } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { useAppContext } from "../../context/AppContext";

const Dashboard = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isDarkMode = theme.palette.mode === "dark";
  const { user } = useAuth();
  const { currentRole } = useAppContext();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contractHistory, setContractHistory] = useState([]);

  // Helper functions
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const formatPercentage = (value) => {
    return `${value}%`;
  };

  const getMonthName = (month) => {
    const months = [
      "Januari", "Februari", "Maart", "April", "Mei", "Juni",
      "Juli", "Augustus", "September", "Oktober", "November", "December"
    ];
    return months[month - 1] || "";
  };

  const capitalize = (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // ============================================
  // TABLE COLOR CONFIGURATION
  // ============================================
  const tableColors = {
    // Header row
    header: {
      background: isDarkMode ? colors.taupeAccent[600] : colors.taupeAccent[200],
      text: isDarkMode ? colors.primary[900] : colors.primary[900],
    },
    // Body rows
    cells: {
      backgroundOdd: isDarkMode ? colors.primary[400] : colors.primary[100],
      backgroundEven: isDarkMode ? colors.primary[400] : colors.primary[100],
      backgroundHover: isDarkMode ? colors.taupeAccent[800] : colors.taupeAccent[100],
      text: isDarkMode ? colors.primary[900] : colors.primary[800],
    },
    // Table container
    container: {
      background: isDarkMode ? colors.primary[600] : colors.primary[100],
    },
  };
  // ============================================

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        setError(null);

        let url = "http://localhost:5001/api/employees";
        
        // If employee, only fetch their own data
        if (currentRole === "employee" && user?.id) {
          url = `http://localhost:5001/api/employees/user/${user.id}`;
        }

        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error("Kon medewerkergegevens niet ophalen");
        }

        const data = await response.json();
        
        // If single employee, wrap in array for consistent handling
        if (currentRole === "employee") {
          setEmployees(data ? [data] : []);
        } else {
          setEmployees(data || []);
        }
      } catch (err) {
        console.error("Error fetching employees:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchEmployees();
    }
  }, [currentRole, user]);

  // Fetch contract history for employee role
  useEffect(() => {
    const fetchContractHistory = async () => {
      if (currentRole !== "employee" || !user?.employee_id) return;
      
      try {
        const response = await fetch(
          `http://localhost:5001/api/employees/${user.employee_id}/contract-history`
        );
        if (response.ok) {
          const data = await response.json();
          setContractHistory(data || []);
        }
      } catch (err) {
        console.error("Error fetching contract history:", err);
      }
    };

    fetchContractHistory();
  }, [currentRole, user]);

  // Helper function to get dienstverband chip color
  const getDienstverbandColor = (type) => {
    switch (type) {
      case "vast":
        return colors.taupeAccent[600];
      case "tijdelijk":
        return colors.taupeAccent[400];
      case "proeftijd":
        return colors.taupeAccent[300];
      default:
        return colors.grey[500];
    }
  };

  return (
    <Box m="20px" mt="-76px">
      {/* Header */}
      <Box>
        <Typography variant="h2" color={colors.primary[800]} fontWeight="bold">
          Dashboard
        </Typography>
        <Typography variant="h5" color={colors.taupeAccent[500]}>
          {currentRole === "employee" 
            ? "Uw persoonlijke gegevens" 
            : "Overzicht van alle medewerkers"}
        </Typography>
      </Box>

      {/* Loading State */}
      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" py={8}>
          <CircularProgress sx={{ color: colors.taupeAccent[500] }} />
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Employee Table */}
      {!loading && !error && employees.length > 0 && (
        <TableContainer
          component={Paper}
          sx={{
            mt: 5, // Control table height placement here
            backgroundColor: tableColors.container.background,
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
            overflow: "hidden",
          }}
        >
          <Table>
            <TableHead>
              <TableRow
                sx={{
                  backgroundColor: tableColors.header.background,
                  "& th": {
                    fontWeight: "bold",
                    color: tableColors.header.text,
                    fontSize: "14px",
                    borderBottom: `2px solid ${colors.taupeAccent[300]}`,
                    py: 2.5,
                  },
                }}
              >
                <TableCell>Naam</TableCell>
                <TableCell>Dienstverband</TableCell>
                <TableCell>Uren/week</TableCell>
                <TableCell>Bruto uurloon</TableCell>
                <TableCell>Vakantietoeslag</TableCell>
                <TableCell>Bonus</TableCell>
                <TableCell>Vakantie beschikbaar</TableCell>
                <TableCell>Vakantie gebruikt</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.map((employee, index) => (
                <TableRow
                  key={employee.employee_id || index}
                  sx={{
                    "&:nth-of-type(odd)": {
                      backgroundColor: tableColors.cells.backgroundOdd,
                    },
                    "&:nth-of-type(even)": {
                      backgroundColor: tableColors.cells.backgroundEven,
                    },
                    "&:hover": {
                      backgroundColor: tableColors.cells.backgroundHover,
                    },
                    "& td": {
                      borderBottom: `1px solid ${colors.primary[200]}`,
                      py: 2,
                      color: tableColors.cells.text,
                    },
                    transition: "background-color 0.2s ease",
                  }}
                >
                  <TableCell>
                    <Typography fontWeight="600" color={tableColors.cells.text}>
                      {employee.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={capitalize(employee.dienstverband)}
                      size="small"
                      sx={{
                        backgroundColor: getDienstverbandColor(employee.dienstverband),
                        color: "white",
                        fontWeight: 500,
                        fontSize: "12px",
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography>
                      {employee.hours_per_week ? `${employee.hours_per_week} uur` : "-"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight="500">
                      {employee.hourly_rate ? formatCurrency(employee.hourly_rate) : "-"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography>
                      {employee.vakantietoeslag_percentage !== null 
                        ? formatPercentage(employee.vakantietoeslag_percentage) 
                        : "-"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography>
                      {employee.bonus_percentage !== null 
                        ? formatPercentage(employee.bonus_percentage) 
                        : "-"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        backgroundColor: employee.available_hours > 0 
                          ? colors.taupeAccent[400] 
                          : colors.primary[300],
                        px: 1.5,
                        py: 0.5,
                        borderRadius: "8px",
                      }}
                    >
                      <Typography fontWeight="500" color={colors.primary[900]}>
                        {employee.available_hours !== null 
                          ? `${employee.available_hours} uur` 
                          : "-"}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        backgroundColor: employee.used_hours > 0 
                          ? colors.taupeAccent[400] 
                          : colors.primary[300],
                        px: 1.5,
                        py: 0.5,
                        borderRadius: "8px",
                      }}
                    >
                      <Typography fontWeight="500" color={colors.primary[900]}>
                        {employee.used_hours !== null 
                          ? `${employee.used_hours} uur` 
                          : "-"}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Contract History for Employee Role Only */}
      {currentRole === "employee" && !loading && contractHistory.length > 0 && (
        <>
          <Typography variant="h4" fontWeight="600" color={tableColors.cells.text} mt={5} mb={2}>
            Contract Geschiedenis
          </Typography>
          <TableContainer
            component={Paper}
            sx={{
              backgroundColor: tableColors.container.background,
              borderRadius: "12px",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
              overflow: "hidden",
            }}
          >
            <Table>
              <TableHead>
                <TableRow
                  sx={{
                    backgroundColor: tableColors.header.background,
                    "& th:first-of-type": { borderTopLeftRadius: "12px", pl: 3 },
                    "& th:last-of-type": { borderTopRightRadius: "12px" },
                    "& th": {
                      fontWeight: "bold",
                      color: tableColors.header.text,
                      fontSize: "14px",
                      borderBottom: `2px solid ${colors.taupeAccent[300]}`,
                      py: 2.5,
                    },
                  }}
                >
                  <TableCell>Periode</TableCell>
                  <TableCell>Dienstverband</TableCell>
                  <TableCell>Uren/week</TableCell>
                  <TableCell>Bruto uurloon</TableCell>
                  <TableCell>Vakantietoeslag</TableCell>
                  <TableCell>Bonus</TableCell>
                </TableRow>
              </TableHead>
              <TableBody
                sx={{
                  "& tr:last-of-type td:first-of-type": { borderBottomLeftRadius: "12px" },
                  "& tr:last-of-type td:last-of-type": { borderBottomRightRadius: "12px" },
                }}
              >
                {contractHistory.map((contract, idx) => (
                  <TableRow
                    key={contract.id || idx}
                    sx={{
                      "&:nth-of-type(odd)": { backgroundColor: tableColors.cells.backgroundOdd },
                      "&:nth-of-type(even)": { backgroundColor: tableColors.cells.backgroundEven },
                      "&:hover": { backgroundColor: tableColors.cells.backgroundHover },
                      "& td": {
                        borderBottom: `1px solid ${colors.primary[200]}`,
                        py: 2,
                        color: tableColors.cells.text,
                      },
                      "& td:first-of-type": { pl: 3 },
                    }}
                  >
                    <TableCell>
                      {getMonthName(contract.month)} {contract.year}
                    </TableCell>
                    <TableCell>{capitalize(contract.dienstverband)}</TableCell>
                    <TableCell>{contract.hours_per_week} uur</TableCell>
                    <TableCell>{formatCurrency(contract.hourly_rate)}</TableCell>
                    <TableCell>{formatPercentage(contract.vakantietoeslag_percentage)}</TableCell>
                    <TableCell>{formatPercentage(contract.bonus_percentage)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Empty State */}
      {!loading && !error && employees.length === 0 && (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          py={8}
          sx={{
            backgroundColor: colors.primary[100],
            borderRadius: "12px",
          }}
        >
          <Typography color={colors.grey[500]}>
            Geen medewerkergegevens gevonden.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default Dashboard;
