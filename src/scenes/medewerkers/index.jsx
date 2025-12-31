import { useState, useEffect } from "react";
import API_BASE_URL from "../../config/api";
import {
  Box,
  Typography,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { nl } from "date-fns/locale";
import { tokens } from "../../theme";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import HolidayOverviewTable from "../../components/HolidayOverviewTable";
import HolidayChart from "../../components/HolidayChart";
import OvertimeOverviewTable from "../../components/OvertimeOverviewTable";
import OvertimeChart from "../../components/OvertimeChart";

const Medewerkers = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isDarkMode = theme.palette.mode === "dark";

  // State
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contractHistory, setContractHistory] = useState([]);
  const [holidayData, setHolidayData] = useState([]);
  const [holidayTransactions, setHolidayTransactions] = useState([]);
  const [overtimeData, setOvertimeData] = useState([]);
  const [overtimeTransactions, setOvertimeTransactions] = useState([]);
  const [formSuccess, setFormSuccess] = useState("");
  const [formError, setFormError] = useState("");

  // Contract form state
  const [contractForm, setContractForm] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    dienstverband: "tijdelijk",
    positie: "assistent",
    hourly_rate: "",
    vakantietoeslag_percentage: "8",
    bonus_percentage: "0",
  });

  // Werkrooster state for contract editing
  const [werkrooster, setWerkrooster] = useState({
    monday_hours: 0,
    tuesday_hours: 0,
    wednesday_hours: 0,
    thursday_hours: 0,
    friday_hours: 0,
    saturday_hours: 0,
    sunday_hours: 0,
  });

  // Calculate total hours per week from werkrooster
  const calculatedHoursPerWeek = Object.values(werkrooster).reduce((sum, h) => sum + (parseFloat(h) || 0), 0);

  // Add hours form state
  const [addHoursForm, setAddHoursForm] = useState({
    date: new Date(), // Date object for MUI DatePicker
    hours: "",
    description: "",
  });

  // Delete contract dialog state
  const [deleteDialog, setDeleteDialog] = useState({ open: false, contract: null });

  // Delete transaction dialog state
  const [deleteTransactionDialog, setDeleteTransactionDialog] = useState({ open: false, transaction: null });

  // Delete overtime transaction dialog state
  const [deleteOvertimeTransactionDialog, setDeleteOvertimeTransactionDialog] = useState({ open: false, transaction: null });

  // Convert/Payout overtime form state
  const [overtimeActionForm, setOvertimeActionForm] = useState({
    hours: "",
    action: "convert", // "convert" or "payout"
    description: "",
  });

  // Calculate available overtime hours
  const availableOvertime = overtimeData.reduce(
    (total, row) => total + (row.total_hours || 0) - (row.converted_hours || 0) - (row.paid_hours || 0),
    0
  );

  // ============================================
  // TABLE COLOR CONFIGURATION
  // ============================================
  const tableColors = {
    header: {
      background: isDarkMode ? colors.taupeAccent[600] : colors.taupeAccent[200],
      text: isDarkMode ? colors.primary[900] : colors.primary[900],
    },
    cells: {
      backgroundOdd: isDarkMode ? colors.primary[400] : colors.primary[100],
      backgroundEven: isDarkMode ? colors.primary[400] : colors.primary[100],
      backgroundHover: isDarkMode ? colors.taupeAccent[800] : colors.taupeAccent[100],
      text: isDarkMode ? colors.primary[900] : colors.primary[800],
    },
    container: {
      background: isDarkMode ? colors.primary[200] : colors.primary[100],
    },
  };
  // ============================================

  // ============================================
  // INPUT FIELD STYLING
  // ============================================
  const inputStyles = {
    "& .MuiOutlinedInput-root": {
      color: isDarkMode ? colors.primary[900] : colors.primary[800],
      "& fieldset": {
        borderColor: colors.taupeAccent[300],
      },
      "&:hover fieldset": {
        borderColor: colors.taupeAccent[500],
      },
      "&.Mui-focused fieldset": {
        borderColor: colors.taupeAccent[500],
      },
    },
    "& .MuiInputLabel-root": {
      color: isDarkMode ? colors.primary[600] : colors.primary[600],
      "&.Mui-focused": {
        color: colors.taupeAccent[600],
      },
      "&.MuiInputLabel-shrink": {
        color: colors.taupeAccent[600],
      },
    },
    "& .MuiSelect-icon": {
      color: colors.primary[800],
    },
  };
  // ============================================

  // Auto-dismiss messages
  useEffect(() => {
    if (formSuccess) {
      const timer = setTimeout(() => setFormSuccess(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [formSuccess]);

  useEffect(() => {
    if (formError) {
      const timer = setTimeout(() => setFormError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [formError]);

  // Fetch employees on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/employees`);
        if (!response.ok) throw new Error("Kon medewerkers niet ophalen");
        const data = await response.json();
        setEmployees(data || []);
        
        // Restore previously selected employee from localStorage
        const savedEmployeeId = localStorage.getItem("selectedEmployeeId");
        if (savedEmployeeId && data) {
          const savedEmployee = data.find(
            (emp) => emp.employee_id === parseInt(savedEmployeeId)
          );
          if (savedEmployee) {
            setSelectedEmployee(savedEmployee);
          }
        }
      } catch (err) {
        console.error("Error fetching employees:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  // Save selected employee to localStorage when it changes
  useEffect(() => {
    if (selectedEmployee) {
      localStorage.setItem("selectedEmployeeId", selectedEmployee.employee_id.toString());
    }
  }, [selectedEmployee]);

  // Fetch employee data when selection changes
  useEffect(() => {
    if (!selectedEmployee) {
      setContractHistory([]);
      setHolidayData([]);
      setHolidayTransactions([]);
      setOvertimeData([]);
      setOvertimeTransactions([]);
      return;
    }

    const fetchEmployeeData = async () => {
      try {
        // Fetch contract history
        const contractRes = await fetch(
          `${API_BASE_URL}/api/employees/${selectedEmployee.employee_id}/contract-history`
        );
        if (contractRes.ok) {
          const contracts = await contractRes.json();
          setContractHistory(contracts);
          // Pre-fill form with current contract data
          if (contracts.length > 0) {
            const current = contracts[0];
            setContractForm({
              year: new Date().getFullYear(),
              month: new Date().getMonth() + 1,
              dienstverband: current.dienstverband,
              positie: current.positie || "assistent",
              hourly_rate: current.hourly_rate.toString(),
              vakantietoeslag_percentage: current.vakantietoeslag_percentage.toString(),
              bonus_percentage: current.bonus_percentage.toString(),
            });
            // Pre-fill werkrooster from current contract
            setWerkrooster({
              monday_hours: current.monday_hours || 0,
              tuesday_hours: current.tuesday_hours || 0,
              wednesday_hours: current.wednesday_hours || 0,
              thursday_hours: current.thursday_hours || 0,
              friday_hours: current.friday_hours || 0,
              saturday_hours: current.saturday_hours || 0,
              sunday_hours: current.sunday_hours || 0,
            });
          }
        }

        // Fetch holiday data
        const holidayRes = await fetch(
          `${API_BASE_URL}/api/employees/${selectedEmployee.employee_id}/holidays`
        );
        if (holidayRes.ok) {
          const holidays = await holidayRes.json();
          setHolidayData(holidays);
        }

        // Fetch holiday transactions
        const transRes = await fetch(
          `${API_BASE_URL}/api/employees/${selectedEmployee.employee_id}/holiday-transactions`
        );
        if (transRes.ok) {
          const transactions = await transRes.json();
          setHolidayTransactions(transactions);
        }

        // Fetch overtime data
        const overtimeRes = await fetch(
          `${API_BASE_URL}/api/employees/${selectedEmployee.employee_id}/overtime`
        );
        if (overtimeRes.ok) {
          const overtime = await overtimeRes.json();
          setOvertimeData(overtime);
        }

        // Fetch overtime transactions
        const overtimeTransRes = await fetch(
          `${API_BASE_URL}/api/employees/${selectedEmployee.employee_id}/overtime-transactions`
        );
        if (overtimeTransRes.ok) {
          const otTransactions = await overtimeTransRes.json();
          setOvertimeTransactions(otTransactions);
        }
      } catch (err) {
        console.error("Error fetching employee data:", err);
      }
    };

    fetchEmployeeData();
  }, [selectedEmployee]);

  // Handle employee selection
  const handleEmployeeChange = (e) => {
    const empId = e.target.value;
    const emp = employees.find((e) => e.employee_id === empId);
    setSelectedEmployee(emp || null);
  };

  // Handle contract form submit
  const handleContractSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    // Validate werkrooster
    if (calculatedHoursPerWeek === 0) {
      setFormError("Vul minimaal één werkdag in voor het werkrooster");
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/employees/${selectedEmployee.employee_id}/contracts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            year: parseInt(contractForm.year),
            month: parseInt(contractForm.month),
            dienstverband: contractForm.dienstverband,
            positie: contractForm.positie,
            hours_per_week: calculatedHoursPerWeek,
            hourly_rate: parseFloat(contractForm.hourly_rate),
            vakantietoeslag_percentage: parseFloat(contractForm.vakantietoeslag_percentage),
            bonus_percentage: parseFloat(contractForm.bonus_percentage),
            werkrooster: {
              monday_hours: parseFloat(werkrooster.monday_hours) || 0,
              tuesday_hours: parseFloat(werkrooster.tuesday_hours) || 0,
              wednesday_hours: parseFloat(werkrooster.wednesday_hours) || 0,
              thursday_hours: parseFloat(werkrooster.thursday_hours) || 0,
              friday_hours: parseFloat(werkrooster.friday_hours) || 0,
              saturday_hours: parseFloat(werkrooster.saturday_hours) || 0,
              sunday_hours: parseFloat(werkrooster.sunday_hours) || 0,
            },
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Fout bij opslaan contract");
      }

      setFormSuccess("Contract wijziging opgeslagen");
      // Refresh contract history
      const refreshRes = await fetch(
        `${API_BASE_URL}/api/employees/${selectedEmployee.employee_id}/contract-history`
      );
      if (refreshRes.ok) {
        setContractHistory(await refreshRes.json());
      }
    } catch (err) {
      setFormError(err.message);
    }
  };

  // Handle add hours submit
  const handleAddHoursSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    // Format date as YYYY-MM-DD for API
    const formattedDate = addHoursForm.date.toISOString().split("T")[0];

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/employees/${selectedEmployee.employee_id}/holiday-transactions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            year: addHoursForm.date.getFullYear(),
            transaction_date: formattedDate,
            type: "added",
            hours: parseFloat(addHoursForm.hours),
            description: addHoursForm.description,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Fout bij toevoegen uren");
      }

      setFormSuccess("Vakantie-uren toegevoegd");
      setAddHoursForm({ ...addHoursForm, hours: "", description: "" });
      // Keep the date as is for convenience

      // Refresh data
      const holidayRes = await fetch(
        `${API_BASE_URL}/api/employees/${selectedEmployee.employee_id}/holidays`
      );
      if (holidayRes.ok) setHolidayData(await holidayRes.json());

      const transRes = await fetch(
        `${API_BASE_URL}/api/employees/${selectedEmployee.employee_id}/holiday-transactions`
      );
      if (transRes.ok) setHolidayTransactions(await transRes.json());
    } catch (err) {
      setFormError(err.message);
    }
  };

  // Handle delete contract
  const handleDeleteContract = async () => {
    if (!deleteDialog.contract) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/contracts/${deleteDialog.contract.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Fout bij verwijderen contract");
      }

      setFormSuccess("Contract verwijderd");
      
      // Refresh contract history
      const refreshRes = await fetch(
        `${API_BASE_URL}/api/employees/${selectedEmployee.employee_id}/contract-history`
      );
      if (refreshRes.ok) {
        const contracts = await refreshRes.json();
        setContractHistory(contracts);
        // Update werkrooster form with the new latest contract
        if (contracts.length > 0) {
          const current = contracts[0];
          setContractForm({
            year: new Date().getFullYear(),
            month: new Date().getMonth() + 1,
            dienstverband: current.dienstverband,
            positie: current.positie || "assistent",
            hourly_rate: current.hourly_rate.toString(),
            vakantietoeslag_percentage: current.vakantietoeslag_percentage.toString(),
            bonus_percentage: current.bonus_percentage.toString(),
          });
          setWerkrooster({
            monday_hours: current.monday_hours || 0,
            tuesday_hours: current.tuesday_hours || 0,
            wednesday_hours: current.wednesday_hours || 0,
            thursday_hours: current.thursday_hours || 0,
            friday_hours: current.friday_hours || 0,
            saturday_hours: current.saturday_hours || 0,
            sunday_hours: current.sunday_hours || 0,
          });
        }
      }
    } catch (err) {
      setFormError(err.message);
    } finally {
      setDeleteDialog({ open: false, contract: null });
    }
  };

  // Handle delete holiday transaction
  const handleDeleteTransaction = async () => {
    if (!deleteTransactionDialog.transaction) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/holiday-transactions/${deleteTransactionDialog.transaction.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Fout bij verwijderen transactie");
      }

      setFormSuccess("Transactie verwijderd");
      
      // Refresh holiday data and transactions
      const holidayRes = await fetch(
        `${API_BASE_URL}/api/employees/${selectedEmployee.employee_id}/holidays`
      );
      if (holidayRes.ok) setHolidayData(await holidayRes.json());

      const transRes = await fetch(
        `${API_BASE_URL}/api/employees/${selectedEmployee.employee_id}/holiday-transactions`
      );
      if (transRes.ok) setHolidayTransactions(await transRes.json());
    } catch (err) {
      setFormError(err.message);
    } finally {
      setDeleteTransactionDialog({ open: false, transaction: null });
    }
  };

  // Handle overtime action (convert or payout)
  const handleOvertimeAction = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    const hoursToProcess = parseFloat(overtimeActionForm.hours);
    if (!hoursToProcess || hoursToProcess <= 0) {
      setFormError("Voer een geldig aantal uren in");
      return;
    }
    if (hoursToProcess > availableOvertime) {
      setFormError(`Onvoldoende overuren beschikbaar. Maximaal: ${availableOvertime} uur`);
      return;
    }

    try {
      const endpoint = overtimeActionForm.action === "convert" 
        ? `${API_BASE_URL}/api/employees/${selectedEmployee.employee_id}/overtime-to-vacation`
        : `${API_BASE_URL}/api/employees/${selectedEmployee.employee_id}/overtime-payout`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hours: hoursToProcess,
          description: overtimeActionForm.description || (overtimeActionForm.action === "convert" ? "Omgezet naar vakantie" : "Uitbetaald"),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Fout bij verwerken overuren");
      }

      setFormSuccess(
        overtimeActionForm.action === "convert"
          ? `${hoursToProcess} overuren omgezet naar vakantie-uren`
          : `${hoursToProcess} overuren uitbetaald`
      );
      setOvertimeActionForm({ hours: "", action: "convert", description: "" });

      // Refresh all data
      const [overtimeRes, overtimeTransRes, holidayRes, transRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/employees/${selectedEmployee.employee_id}/overtime`),
        fetch(`${API_BASE_URL}/api/employees/${selectedEmployee.employee_id}/overtime-transactions`),
        fetch(`${API_BASE_URL}/api/employees/${selectedEmployee.employee_id}/holidays`),
        fetch(`${API_BASE_URL}/api/employees/${selectedEmployee.employee_id}/holiday-transactions`),
      ]);

      if (overtimeRes.ok) setOvertimeData(await overtimeRes.json());
      if (overtimeTransRes.ok) setOvertimeTransactions(await overtimeTransRes.json());
      if (holidayRes.ok) setHolidayData(await holidayRes.json());
      if (transRes.ok) setHolidayTransactions(await transRes.json());
    } catch (err) {
      setFormError(err.message);
    }
  };

  // Handle delete overtime transaction
  const handleDeleteOvertimeTransaction = async () => {
    if (!deleteOvertimeTransactionDialog.transaction) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/overtime-transactions/${deleteOvertimeTransactionDialog.transaction.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Fout bij verwijderen transactie");
      }

      setFormSuccess("Overuren transactie verwijderd");
      
      // Refresh overtime data
      const overtimeRes = await fetch(
        `${API_BASE_URL}/api/employees/${selectedEmployee.employee_id}/overtime`
      );
      if (overtimeRes.ok) setOvertimeData(await overtimeRes.json());

      const overtimeTransRes = await fetch(
        `${API_BASE_URL}/api/employees/${selectedEmployee.employee_id}/overtime-transactions`
      );
      if (overtimeTransRes.ok) setOvertimeTransactions(await overtimeTransRes.json());
    } catch (err) {
      setFormError(err.message);
    } finally {
      setDeleteOvertimeTransactionDialog({ open: false, transaction: null });
    }
  };

  // Format helpers
  const formatCurrency = (value) => `€${parseFloat(value).toFixed(2)}`;
  const formatPercentage = (value) => `${parseFloat(value).toFixed(1)}%`;
  const getMonthName = (month) => {
    const months = ["Jan", "Feb", "Mrt", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
    return months[month - 1] || "";
  };
  const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

  if (loading) {
    return (
      <Box m="20px" mt="-76px" display="flex" justifyContent="center" pt={10}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box m="20px" mt="-76px" pb={4}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h2" color={colors.primary[800]} fontWeight="bold">
          Medewerkers
        </Typography>
        <Typography variant="h5" color={colors.taupeAccent[500]}>
          Beheer contracten en vakantie-uren
        </Typography>
      </Box>

      {/* Employee Selector - control height with mt */}
      <FormControl fullWidth sx={{ ...inputStyles, maxWidth: 400, mt: 2, mb: 4 }}>
        <InputLabel>Selecteer medewerker</InputLabel>
        <Select
          value={selectedEmployee?.employee_id || ""}
          onChange={handleEmployeeChange}
          label="Selecteer medewerker"
        >
          {employees.map((emp) => (
            <MenuItem key={emp.employee_id} value={emp.employee_id}>
              {emp.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Empty State - No Employee Selected */}
      {!selectedEmployee && (
        <Box
          sx={{
            backgroundColor: tableColors.container.background,
            p: 6,
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
            textAlign: "center",
          }}
        >
          <Typography 
            variant="h4" 
            color={colors.taupeAccent[500]} 
            fontWeight="500"
            sx={{ mb: 2 }}
          >
            Selecteer een medewerker
          </Typography>
          <Typography 
            variant="body1" 
            color={colors.grey[500]}
          >
            Kies een medewerker uit de lijst hierboven om contracten, werkrooster en vakantie-uren te beheren.
          </Typography>
        </Box>
      )}

      {selectedEmployee && (
        <>
          {/* Section 1: Contract Change Form */}
          <Box
            sx={{
              backgroundColor: tableColors.container.background,
              p: 4,
              borderRadius: "12px",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
              mb: 5,
            }}
          >
            <Typography variant="h4" fontWeight="600" color={tableColors.cells.text} mb={3}>
              Contract Wijzigen
            </Typography>

            <Box component="form" onSubmit={handleContractSubmit}>
              <Box display="grid" gridTemplateColumns="repeat(4, 1fr)" gap={3}>
                <TextField
                  label="Jaar"
                  type="number"
                  value={contractForm.year}
                  onChange={(e) => setContractForm({ ...contractForm, year: e.target.value })}
                  required
                  sx={inputStyles}
                />
                <FormControl sx={inputStyles}>
                  <InputLabel>Maand</InputLabel>
                  <Select
                    value={contractForm.month}
                    onChange={(e) => setContractForm({ ...contractForm, month: e.target.value })}
                    label="Maand"
                  >
                    {[...Array(12)].map((_, i) => (
                      <MenuItem key={i + 1} value={i + 1}>
                        {getMonthName(i + 1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl sx={inputStyles}>
                  <InputLabel>Dienstverband</InputLabel>
                  <Select
                    value={contractForm.dienstverband}
                    onChange={(e) => setContractForm({ ...contractForm, dienstverband: e.target.value })}
                    label="Dienstverband"
                  >
                    <MenuItem value="proeftijd">Proeftijd</MenuItem>
                    <MenuItem value="tijdelijk">Tijdelijk</MenuItem>
                    <MenuItem value="vast">Vast</MenuItem>
                  </Select>
                </FormControl>
                <FormControl sx={inputStyles}>
                  <InputLabel>Positie</InputLabel>
                  <Select
                    value={contractForm.positie}
                    onChange={(e) => setContractForm({ ...contractForm, positie: e.target.value })}
                    label="Positie"
                  >
                    <MenuItem value="eigenaar">Eigenaar</MenuItem>
                    <MenuItem value="praktijkmanager">Praktijkmanager</MenuItem>
                    <MenuItem value="tandarts">Tandarts</MenuItem>
                    <MenuItem value="mondhygienist">Mondhygiënist</MenuItem>
                    <MenuItem value="preventie-assistent">Preventie-assistent</MenuItem>
                    <MenuItem value="assistent">Assistent</MenuItem>
                    <MenuItem value="balie-medewerker">Balie-medewerker</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="Bruto uurloon (€)"
                  type="number"
                  value={contractForm.hourly_rate}
                  onChange={(e) => setContractForm({ ...contractForm, hourly_rate: e.target.value })}
                  required
                  inputProps={{ step: "0.01", min: "0" }}
                  sx={inputStyles}
                />
                <TextField
                  label="Vakantietoeslag (%)"
                  type="number"
                  value={contractForm.vakantietoeslag_percentage}
                  onChange={(e) =>
                    setContractForm({ ...contractForm, vakantietoeslag_percentage: e.target.value })
                  }
                  inputProps={{ step: "0.1", min: "0", max: "100" }}
                  sx={inputStyles}
                />
                <TextField
                  label="Bonus (%)"
                  type="number"
                  value={contractForm.bonus_percentage}
                  onChange={(e) => setContractForm({ ...contractForm, bonus_percentage: e.target.value })}
                  inputProps={{ step: "0.1", min: "0", max: "100" }}
                  sx={inputStyles}
                />
              </Box>

              {/* Werkrooster Section */}
              <Box sx={{ mt: 4 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Typography variant="h5" fontWeight="600" color={tableColors.cells.text}>
                    Werkrooster
                  </Typography>
                  <Box
                    sx={{
                      backgroundColor: isDarkMode ? colors.taupeAccent[600] : colors.taupeAccent[200],
                      px: 2,
                      py: 0.75,
                      borderRadius: "8px",
                    }}
                  >
                    <Typography variant="body2" fontWeight="600" color={colors.primary[900]}>
                      Totaal: {calculatedHoursPerWeek} uur/week
                    </Typography>
                  </Box>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    gap: 1.5,
                    justifyContent: "space-between",
                  }}
                >
                  {[
                    { key: "monday_hours", label: "Ma" },
                    { key: "tuesday_hours", label: "Di" },
                    { key: "wednesday_hours", label: "Wo" },
                    { key: "thursday_hours", label: "Do" },
                    { key: "friday_hours", label: "Vr" },
                    { key: "saturday_hours", label: "Za" },
                    { key: "sunday_hours", label: "Zo" },
                  ].map((day) => (
                    <Box
                      key={day.key}
                      sx={{
                        flex: 1,
                        textAlign: "center",
                      }}
                    >
                      <Typography
                        variant="body2"
                        fontWeight="600"
                        color={tableColors.cells.text}
                        sx={{ mb: 1 }}
                      >
                        {day.label}
                      </Typography>
                      <TextField
                        type="number"
                        value={werkrooster[day.key]}
                        onChange={(e) =>
                          setWerkrooster((prev) => ({
                            ...prev,
                            [day.key]: e.target.value,
                          }))
                        }
                        inputProps={{
                          min: 0,
                          max: 24,
                          step: 0.5,
                          style: { textAlign: "center", padding: "12px 8px" },
                        }}
                        sx={{
                          width: "100%",
                          ...inputStyles,
                          "& .MuiOutlinedInput-root": {
                            ...inputStyles["& .MuiOutlinedInput-root"],
                            backgroundColor:
                              parseFloat(werkrooster[day.key]) > 0
                                ? isDarkMode
                                  ? colors.taupeAccent[700]
                                  : colors.taupeAccent[100]
                                : "transparent",
                          },
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              </Box>

              <Box display="flex" justifyContent="flex-end" mt={3}>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SaveOutlinedIcon />}
                  sx={{
                    backgroundColor: colors.taupeAccent[500],
                    color: "white",
                    px: 4,
                    py: 1.5,
                    "&:hover": { backgroundColor: colors.taupeAccent[600] },
                  }}
                >
                  Opslaan
                </Button>
              </Box>
            </Box>
          </Box>

          {/* Success/Error Messages */}
          {formSuccess && (
            <Alert
              severity="success"
              sx={{
                mb: 3,
                backgroundColor: isDarkMode ? colors.greenAccent[400] : colors.greenAccent[100],
                color: isDarkMode ? colors.primary[900] : colors.greenAccent[700],
                "& .MuiAlert-icon": {
                  color: isDarkMode ? colors.primary[900] : colors.greenAccent[700],
                },
              }}
            >
              {formSuccess}
            </Alert>
          )}
          {formError && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                backgroundColor: isDarkMode ? colors.redAccent[400] : colors.redAccent[100],
                color: isDarkMode ? colors.primary[900] : colors.redAccent[700],
              }}
            >
              {formError}
            </Alert>
          )}

          {/* Section 2: Contract History Table */}
          <Typography variant="h4" fontWeight="600" color={tableColors.cells.text} mb={2}>
            Contract Geschiedenis
          </Typography>
          <TableContainer
            component={Paper}
            sx={{
              backgroundColor: tableColors.container.background,
              borderRadius: "12px",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
              overflow: "hidden",
              mb: 5,
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
                  <TableCell>Positie</TableCell>
                  <TableCell>Uren/week</TableCell>
                  <TableCell sx={{ px: 1 }}>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>
                        Werkrooster
                      </Typography>
                      <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
                        {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((day) => (
                          <Typography
                            key={day}
                            variant="caption"
                            sx={{
                              width: 22,
                              textAlign: "center",
                              fontSize: "10px",
                              fontWeight: 500,
                              color: tableColors.header.text,
                              opacity: 0.8,
                            }}
                          >
                            {day}
                          </Typography>
                        ))}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>Bruto uurloon</TableCell>
                  <TableCell>Vakantietoeslag</TableCell>
                  <TableCell>Bonus</TableCell>
                  <TableCell sx={{ width: 60, textAlign: "center" }}></TableCell>
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
                    <TableCell>
                      {contract.positie ? capitalize(contract.positie.replace("-", " ")) : "-"}
                    </TableCell>
                    <TableCell>{contract.hours_per_week} uur</TableCell>
                    <TableCell sx={{ px: 1 }}>
                      <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
                        {[
                          contract.monday_hours,
                          contract.tuesday_hours,
                          contract.wednesday_hours,
                          contract.thursday_hours,
                          contract.friday_hours,
                          contract.saturday_hours,
                          contract.sunday_hours,
                        ].map((hours, i) => (
                          <Box
                            key={i}
                            sx={{
                              width: 22,
                              height: 22,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: "4px",
                              backgroundColor:
                                hours > 0
                                  ? isDarkMode
                                    ? colors.taupeAccent[600]
                                    : colors.taupeAccent[200]
                                  : "transparent",
                              border: hours > 0 ? "none" : `1px solid ${colors.primary[300]}`,
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                fontSize: "10px",
                                fontWeight: hours > 0 ? 600 : 400,
                                color: hours > 0
                                  ? isDarkMode
                                    ? colors.primary[900]   // ← DARK MODE: hours > 0
                                    : colors.primary[900]   // ← LIGHT MODE: hours > 0
                                  : isDarkMode
                                    ? colors.primary[700]   // ← DARK MODE: hours = 0
                                    : colors.primary[400],  // ← LIGHT MODE: hours = 0
                              }}
                            >
                              {hours ?? 0}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>{formatCurrency(contract.hourly_rate)}</TableCell>
                    <TableCell>{formatPercentage(contract.vakantietoeslag_percentage)}</TableCell>
                    <TableCell>{formatPercentage(contract.bonus_percentage)}</TableCell>
                    <TableCell sx={{ textAlign: "center" }}>
                      <IconButton
                        size="small"
                        onClick={() => setDeleteDialog({ open: true, contract })}
                        sx={{
                          color: colors.redAccent[400],
                          "&:hover": {
                            backgroundColor: colors.redAccent[100],
                            color: colors.redAccent[600],
                          },
                        }}
                        title="Contract verwijderen"
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {contractHistory.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} sx={{ textAlign: "center", py: 4 }}>
                      Geen contract geschiedenis gevonden
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Divider sx={{ my: 4 }} />

          {/* Section 3: Overtime - Overview Table */}
          <OvertimeOverviewTable overtimeData={overtimeData} titleVariant="h4" showMarginBottom={true} />

          {/* Overtime Action Form - Convert or Payout */}
          <Box
            sx={{
              backgroundColor: tableColors.container.background,
              p: 3,
              borderRadius: "12px",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
              mb: 4,
            }}
          >
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h5" fontWeight="600" color={tableColors.cells.text}>
                Overuren Verwerken
              </Typography>
              <Box
                sx={{
                  backgroundColor: isDarkMode ? colors.taupeAccent[600] : colors.taupeAccent[200],
                  px: 2,
                  py: 0.75,
                  borderRadius: "8px",
                }}
              >
                <Typography variant="body2" fontWeight="600" color={colors.primary[900]}>
                  Beschikbaar: {availableOvertime} uur
                </Typography>
              </Box>
            </Box>
            <Box component="form" onSubmit={handleOvertimeAction} display="flex" gap={2} alignItems="center">
              <FormControl sx={{ ...inputStyles, minWidth: 180 }}>
                <InputLabel>Actie</InputLabel>
                <Select
                  value={overtimeActionForm.action}
                  onChange={(e) => setOvertimeActionForm({ ...overtimeActionForm, action: e.target.value })}
                  label="Actie"
                >
                  <MenuItem value="convert">Omzetten naar vakantie</MenuItem>
                  <MenuItem value="payout">Uitbetalen</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Uren"
                type="number"
                value={overtimeActionForm.hours}
                onChange={(e) => setOvertimeActionForm({ ...overtimeActionForm, hours: e.target.value })}
                required
                inputProps={{ step: "0.5", min: "0.5", max: availableOvertime }}
                sx={{ ...inputStyles, width: 120 }}
              />
              <TextField
                label="Beschrijving (optioneel)"
                value={overtimeActionForm.description}
                onChange={(e) => setOvertimeActionForm({ ...overtimeActionForm, description: e.target.value })}
                sx={{ ...inputStyles, flex: 1 }}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={availableOvertime <= 0}
                sx={{
                  backgroundColor: colors.taupeAccent[500],
                  color: "white",
                  px: 3,
                  py: 1.5,
                  height: 40,
                  "&:hover": { backgroundColor: colors.taupeAccent[600] },
                  "&:disabled": { backgroundColor: colors.grey[400] },
                }}
              >
                {overtimeActionForm.action === "convert" ? "Omzetten" : "Uitbetalen"}
              </Button>
            </Box>
          </Box>

          {/* Overtime Chart */}
          <OvertimeChart overtimeTransactions={overtimeTransactions} titleVariant="h5" containerPadding={3} />

          {/* Overtime Transaction History */}
          {overtimeTransactions.length > 0 && (
            <Box
              sx={{
                backgroundColor: tableColors.container.background,
                p: 3,
                borderRadius: "12px",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                mb: 4,
              }}
            >
              <Typography variant="h5" fontWeight="600" color={tableColors.cells.text} mb={2}>
                Overuren Transactie Geschiedenis
              </Typography>
              <TableContainer
                sx={{
                  borderRadius: "12px",
                  border: `1px solid ${isDarkMode ? colors.primary[300] : colors.taupeAccent[200]}`,
                  overflow: "hidden",
                }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow
                      sx={{
                        backgroundColor: tableColors.header.background,
                        "& th": {
                          fontWeight: "bold",
                          color: tableColors.header.text,
                          fontSize: "13px",
                          borderBottom: `2px solid ${colors.taupeAccent[300]}`,
                          py: 1.5,
                        },
                      }}
                    >
                      <TableCell>Datum</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Uren</TableCell>
                      <TableCell>Beschrijving</TableCell>
                      <TableCell>Saldo na</TableCell>
                      <TableCell sx={{ width: 50 }}></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[...overtimeTransactions]
                      .sort((a, b) => {
                        const dateCompare = new Date(b.transaction_date) - new Date(a.transaction_date);
                        if (dateCompare !== 0) return dateCompare;
                        return b.id - a.id;
                      })
                      .map((t) => (
                        <TableRow
                          key={t.id}
                          sx={{
                            "&:nth-of-type(odd)": { backgroundColor: tableColors.cells.backgroundOdd },
                            "&:nth-of-type(even)": { backgroundColor: tableColors.cells.backgroundEven },
                            "&:hover": { backgroundColor: tableColors.cells.backgroundHover },
                            "& td": {
                              borderBottom: `1px solid ${colors.primary[200]}`,
                              py: 1,
                              color: tableColors.cells.text,
                              fontSize: "13px",
                            },
                          }}
                        >
                          <TableCell>
                            {new Date(t.transaction_date).toLocaleDateString("nl-NL", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </TableCell>
                          <TableCell>
                            <Box
                              sx={{
                                display: "inline-block",
                                px: 1,
                                py: 0.25,
                                borderRadius: "4px",
                                backgroundColor: t.type === "added" 
                                  ? (isDarkMode ? colors.greenAccent[500] : colors.greenAccent[100])
                                  : t.type === "converted"
                                  ? (isDarkMode ? colors.redAccent[500] : colors.redAccent[100])
                                  : (isDarkMode ? colors.redAccent[500] : colors.redAccent[100]),
                                color: t.type === "added"
                                  ? (isDarkMode ? colors.primary[800] : colors.greenAccent[700])
                                  : t.type === "converted"
                                  ? (isDarkMode ? colors.primary[800] : colors.redAccent[700])
                                  : (isDarkMode ? colors.primary[800] : colors.redAccent[700]),
                                fontSize: "11px",
                                fontWeight: 600,
                              }}
                            >
                              {t.type === "added" ? "Toegevoegd" : t.type === "converted" ? "Omgezet" : "Uitbetaald"}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography
                              component="span"
                              sx={{
                                fontWeight: 600,
                                color: t.type === "added"
                                  ? colors.greenAccent[500] 
                                  : colors.redAccent[500],
                              }}
                            >
                              {t.type === "added" ? `+${t.hours}` : `-${t.hours}`}
                            </Typography>
                          </TableCell>
                          <TableCell>{t.description || "-"}</TableCell>
                          <TableCell>{t.balance_after} uur</TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => setDeleteOvertimeTransactionDialog({ open: true, transaction: t })}
                              sx={{
                                color: colors.redAccent[400],
                                "&:hover": {
                                  backgroundColor: colors.redAccent[100],
                                  color: colors.redAccent[600],
                                },
                              }}
                              title="Transactie verwijderen"
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          <Divider sx={{ my: 4 }} />

          {/* Section 4: Holiday Hours - Using shared component */}
          <HolidayOverviewTable holidayData={holidayData} titleVariant="h4" showMarginBottom={true} />

          {/* Add Hours Form */}
          <Box
            sx={{
              backgroundColor: tableColors.container.background,
              p: 3,
              borderRadius: "12px",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
              mb: 4,
            }}
          >
            <Typography variant="h5" fontWeight="600" color={tableColors.cells.text} mb={2}>
              Vakantie-uren Toevoegen
            </Typography>
            <Box component="form" onSubmit={handleAddHoursSubmit} display="flex" gap={2} alignItems="center">
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={nl}>
                <DatePicker
                  label="Datum"
                  value={addHoursForm.date}
                  onChange={(newDate) => setAddHoursForm({ ...addHoursForm, date: newDate })}
                  format="dd/MM/yyyy"
                  slotProps={{
                    textField: {
                      required: true,
                      sx: { 
                        ...inputStyles, 
                        width: 180,
                      },
                    },
                    day: {
                      sx: {
                        "&.Mui-selected": {
                          backgroundColor: colors.taupeAccent[500],
                          color: "#fff",
                          "&:hover": {
                            backgroundColor: colors.taupeAccent[600],
                            color: "#fff",
                          },
                        },
                        "&:hover": {
                          backgroundColor: colors.taupeAccent[200],
                          color: colors.taupeAccent[800],
                        },
                      },
                    },
                    actionBar: {
                      sx: {
                        "& .MuiButton-root": {
                          color: colors.taupeAccent[500],
                        },
                      },
                    },
                    layout: {
                      sx: {
                        "& .MuiPickersCalendarHeader-label": {
                          color: colors.taupeAccent[700],
                        },
                        "& .MuiPickersArrowSwitcher-button": {
                          color: colors.taupeAccent[500],
                        },
                        "& .MuiDayCalendar-weekDayLabel": {
                          color: colors.taupeAccent[600],
                        },
                      },
                    },
                    openPickerIcon: {
                      sx: {
                        color: colors.taupeAccent[500],
                      },
                    },
                  }}
                />
              </LocalizationProvider>
              <TextField
                label="Uren"
                type="number"
                value={addHoursForm.hours}
                onChange={(e) => setAddHoursForm({ ...addHoursForm, hours: e.target.value })}
                required
                inputProps={{ step: "0.5" }}
                sx={{ ...inputStyles, width: 120 }}
              />
              <TextField
                label="Beschrijving"
                value={addHoursForm.description}
                onChange={(e) => setAddHoursForm({ ...addHoursForm, description: e.target.value })}
                required
                sx={{ ...inputStyles, flex: 1 }}
              />
              <Button
                type="submit"
                variant="contained"
                startIcon={<AddOutlinedIcon />}
                sx={{
                  backgroundColor: colors.taupeAccent[500],
                  color: "white",
                  px: 3,
                  py: 1.5,
                  height: 40,
                  "&:hover": { backgroundColor: colors.taupeAccent[600] },
                }}
              >
                Toevoegen
              </Button>
            </Box>
          </Box>

          {/* Line Chart - Using shared component */}
          <HolidayChart holidayTransactions={holidayTransactions} titleVariant="h5" containerPadding={3} />

          {/* Transaction History */}
          {holidayTransactions.length > 0 && (
            <Box
              sx={{
                backgroundColor: tableColors.container.background,
                p: 3,
                borderRadius: "12px",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                mb: 4,
              }}
            >
              <Typography variant="h5" fontWeight="600" color={tableColors.cells.text} mb={2}>
                Vakantie Transactie Geschiedenis
              </Typography>
              <TableContainer
                sx={{
                  borderRadius: "12px",
                  border: `1px solid ${isDarkMode ? colors.primary[300] : colors.taupeAccent[200]}`,
                  overflow: "hidden",
                }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow
                      sx={{
                        backgroundColor: tableColors.header.background,
                        "& th": {
                          fontWeight: "bold",
                          color: tableColors.header.text,
                          fontSize: "13px",
                          borderBottom: `2px solid ${colors.taupeAccent[300]}`,
                          py: 1.5,
                        },
                      }}
                    >
                      <TableCell>Datum</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Uren</TableCell>
                      <TableCell>Beschrijving</TableCell>
                      <TableCell>Saldo na</TableCell>
                      <TableCell sx={{ width: 50 }}></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[...holidayTransactions]
                      .sort((a, b) => {
                        const dateCompare = new Date(b.transaction_date) - new Date(a.transaction_date);
                        if (dateCompare !== 0) return dateCompare;
                        return b.id - a.id; // Newer transactions (higher id) first for same date
                      })
                      .map((t) => (
                        <TableRow
                          key={t.id}
                          sx={{
                            "&:nth-of-type(odd)": { backgroundColor: tableColors.cells.backgroundOdd },
                            "&:nth-of-type(even)": { backgroundColor: tableColors.cells.backgroundEven },
                            "&:hover": { backgroundColor: tableColors.cells.backgroundHover },
                            "& td": {
                              borderBottom: `1px solid ${colors.primary[200]}`,
                              py: 1,
                              color: tableColors.cells.text,
                              fontSize: "13px",
                            },
                          }}
                        >
                          <TableCell>
                            {new Date(t.transaction_date).toLocaleDateString("nl-NL", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </TableCell>
                          <TableCell>
                            <Box
                              sx={{
                                display: "inline-block",
                                px: 1,
                                py: 0.25,
                                borderRadius: "4px",
                                backgroundColor: t.type === "added" 
                                  ? (isDarkMode ? colors.greenAccent[500] : colors.greenAccent[100])
                                  : (isDarkMode ? colors.redAccent[500] : colors.redAccent[100]),
                                color: t.type === "added"
                                  ? (isDarkMode ? colors.primary[800] : colors.greenAccent[700])
                                  : (isDarkMode ? colors.primary[800] : colors.redAccent[700]),
                                fontSize: "11px",
                                fontWeight: 600,
                              }}
                            >
                              {t.type === "added" ? "Toegevoegd" : "Gebruikt"}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography
                              component="span"
                              sx={{
                                fontWeight: 600,
                                color: t.type === "added" && parseFloat(t.hours) >= 0
                                  ? colors.greenAccent[500] 
                                  : colors.redAccent[500],
                              }}
                            >
                              {t.type === "added" 
                                ? (parseFloat(t.hours) >= 0 ? `+${t.hours}` : `${t.hours}`) 
                                : `-${t.hours}`}
                            </Typography>
                          </TableCell>
                          <TableCell>{t.description || "-"}</TableCell>
                          <TableCell>{t.balance_after} uur</TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => setDeleteTransactionDialog({ open: true, transaction: t })}
                              sx={{
                                color: colors.redAccent[400],
                                "&:hover": {
                                  backgroundColor: colors.redAccent[100],
                                  color: colors.redAccent[600],
                                },
                              }}
                              title="Transactie verwijderen"
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </>
      )}

      {/* Delete Contract Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, contract: null })}
      >
        <DialogTitle sx={{ fontWeight: "bold", color: colors.redAccent[500] }}>
          Contract verwijderen
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Weet u zeker dat u het contract van{" "}
            <strong>
              {deleteDialog.contract
                ? `${getMonthName(deleteDialog.contract.month)} ${deleteDialog.contract.year}`
                : ""}
            </strong>{" "}
            wilt verwijderen?
            <br />
            <strong>Let op: Dit kan niet ongedaan worden gemaakt!</strong>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialog({ open: false, contract: null })}
            sx={{
              color: colors.grey[600],
              "&:hover": { backgroundColor: colors.grey[200] },
            }}
          >
            Annuleren
          </Button>
          <Button
            onClick={handleDeleteContract}
            sx={{
              color: colors.redAccent[500],
              "&:hover": { backgroundColor: colors.redAccent[100] },
            }}
          >
            Verwijderen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Transaction Confirmation Dialog */}
      <Dialog
        open={deleteTransactionDialog.open}
        onClose={() => setDeleteTransactionDialog({ open: false, transaction: null })}
      >
        <DialogTitle sx={{ fontWeight: "bold", color: colors.redAccent[500] }}>
          Vakantie Transactie verwijderen
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Weet u zeker dat u deze transactie wilt verwijderen?
            {deleteTransactionDialog.transaction && (
              <>
                <br /><br />
                <strong>Datum:</strong>{" "}
                {new Date(deleteTransactionDialog.transaction.transaction_date).toLocaleDateString("nl-NL")}
                <br />
                <strong>Type:</strong>{" "}
                {deleteTransactionDialog.transaction.type === "added" ? "Toegevoegd" : "Gebruikt"}
                <br />
                <strong>Uren:</strong>{" "}
                {deleteTransactionDialog.transaction.type === "added" ? "+" : "-"}
                {deleteTransactionDialog.transaction.hours}
                <br />
                <strong>Beschrijving:</strong>{" "}
                {deleteTransactionDialog.transaction.description || "-"}
              </>
            )}
            <br /><br />
            <strong>Let op:</strong> Alle saldo's na deze transactie worden automatisch herberekend.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteTransactionDialog({ open: false, transaction: null })}
            sx={{
              color: colors.grey[600],
              "&:hover": { backgroundColor: colors.grey[200] },
            }}
          >
            Annuleren
          </Button>
          <Button
            onClick={handleDeleteTransaction}
            sx={{
              color: colors.redAccent[500],
              "&:hover": { backgroundColor: colors.redAccent[100] },
            }}
          >
            Verwijderen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Overtime Transaction Confirmation Dialog */}
      <Dialog
        open={deleteOvertimeTransactionDialog.open}
        onClose={() => setDeleteOvertimeTransactionDialog({ open: false, transaction: null })}
      >
        <DialogTitle sx={{ fontWeight: "bold", color: colors.redAccent[500] }}>
          Overuren Transactie verwijderen
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Weet u zeker dat u deze overuren transactie wilt verwijderen?
            {deleteOvertimeTransactionDialog.transaction && (
              <>
                <br /><br />
                <strong>Datum:</strong>{" "}
                {new Date(deleteOvertimeTransactionDialog.transaction.transaction_date).toLocaleDateString("nl-NL")}
                <br />
                <strong>Type:</strong>{" "}
                {deleteOvertimeTransactionDialog.transaction.type === "added" 
                  ? "Toegevoegd" 
                  : deleteOvertimeTransactionDialog.transaction.type === "converted" 
                  ? "Omgezet" 
                  : "Uitbetaald"}
                <br />
                <strong>Uren:</strong>{" "}
                {deleteOvertimeTransactionDialog.transaction.type === "added" ? "+" : "-"}
                {deleteOvertimeTransactionDialog.transaction.hours}
                <br />
                <strong>Beschrijving:</strong>{" "}
                {deleteOvertimeTransactionDialog.transaction.description || "-"}
              </>
            )}
            <br /><br />
            <strong>Let op:</strong> Alle saldo's na deze transactie worden automatisch herberekend.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteOvertimeTransactionDialog({ open: false, transaction: null })}
            sx={{
              color: colors.grey[600],
              "&:hover": { backgroundColor: colors.grey[200] },
            }}
          >
            Annuleren
          </Button>
          <Button
            onClick={handleDeleteOvertimeTransaction}
            sx={{
              color: colors.redAccent[500],
              "&:hover": { backgroundColor: colors.redAccent[100] },
            }}
          >
            Verwijderen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Medewerkers;
