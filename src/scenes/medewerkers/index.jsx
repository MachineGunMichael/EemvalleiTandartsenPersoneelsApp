import { useState, useEffect, useMemo } from "react";
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
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { nl } from "date-fns/locale";
import { ResponsiveLine } from "@nivo/line";
import { tokens } from "../../theme";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";

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
  const [formSuccess, setFormSuccess] = useState("");
  const [formError, setFormError] = useState("");

  // Contract form state
  const [contractForm, setContractForm] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    dienstverband: "tijdelijk",
    hours_per_week: "",
    hourly_rate: "",
    vakantietoeslag_percentage: "8",
    bonus_percentage: "0",
  });

  // Add hours form state
  const [addHoursForm, setAddHoursForm] = useState({
    date: new Date(), // Date object for MUI DatePicker
    hours: "",
    description: "",
  });

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

  // Chart theme
  const chartTheme = {
    axis: {
      ticks: {
        text: { fill: isDarkMode ? colors.primary[900] : colors.primary[800] },
        line: { stroke: isDarkMode ? colors.primary[600] : colors.primary[400] },
      },
      legend: {
        text: { fill: isDarkMode ? colors.primary[900] : colors.primary[800] },
      },
    },
    grid: {
      line: { stroke: isDarkMode ? colors.primary[500] : colors.primary[300] },
    },
  };

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
        const response = await fetch("http://localhost:5001/api/employees");
        if (!response.ok) throw new Error("Kon medewerkers niet ophalen");
        const data = await response.json();
        setEmployees(data || []);
        
        // Restore selected employee from localStorage
        const savedEmployeeId = localStorage.getItem("selectedEmployeeId");
        if (savedEmployeeId && data) {
          const savedEmployee = data.find((e) => e.employee_id === parseInt(savedEmployeeId));
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

  // Fetch employee data when selection changes
  useEffect(() => {
    if (!selectedEmployee) {
      setContractHistory([]);
      setHolidayData([]);
      setHolidayTransactions([]);
      return;
    }

    const fetchEmployeeData = async () => {
      try {
        // Fetch contract history
        const contractRes = await fetch(
          `http://localhost:5001/api/employees/${selectedEmployee.employee_id}/contract-history`
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
              hours_per_week: current.hours_per_week.toString(),
              hourly_rate: current.hourly_rate.toString(),
              vakantietoeslag_percentage: current.vakantietoeslag_percentage.toString(),
              bonus_percentage: current.bonus_percentage.toString(),
            });
          }
        }

        // Fetch holiday data
        const holidayRes = await fetch(
          `http://localhost:5001/api/employees/${selectedEmployee.employee_id}/holidays`
        );
        if (holidayRes.ok) {
          const holidays = await holidayRes.json();
          setHolidayData(holidays);
        }

        // Fetch holiday transactions
        const transRes = await fetch(
          `http://localhost:5001/api/employees/${selectedEmployee.employee_id}/holiday-transactions`
        );
        if (transRes.ok) {
          const transactions = await transRes.json();
          setHolidayTransactions(transactions);
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
    // Save to localStorage
    if (emp) {
      localStorage.setItem("selectedEmployeeId", emp.employee_id.toString());
    } else {
      localStorage.removeItem("selectedEmployeeId");
    }
  };

  // Handle contract form submit
  const handleContractSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    try {
      const response = await fetch(
        `http://localhost:5001/api/employees/${selectedEmployee.employee_id}/contracts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            year: parseInt(contractForm.year),
            month: parseInt(contractForm.month),
            dienstverband: contractForm.dienstverband,
            hours_per_week: parseFloat(contractForm.hours_per_week),
            hourly_rate: parseFloat(contractForm.hourly_rate),
            vakantietoeslag_percentage: parseFloat(contractForm.vakantietoeslag_percentage),
            bonus_percentage: parseFloat(contractForm.bonus_percentage),
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
        `http://localhost:5001/api/employees/${selectedEmployee.employee_id}/contract-history`
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
        `http://localhost:5001/api/employees/${selectedEmployee.employee_id}/holiday-transactions`,
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
        `http://localhost:5001/api/employees/${selectedEmployee.employee_id}/holidays`
      );
      if (holidayRes.ok) setHolidayData(await holidayRes.json());

      const transRes = await fetch(
        `http://localhost:5001/api/employees/${selectedEmployee.employee_id}/holiday-transactions`
      );
      if (transRes.ok) setHolidayTransactions(await transRes.json());
    } catch (err) {
      setFormError(err.message);
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

  // Format time label for chart (dd-MM-YYYY)
  const formatTimeLabel = (value) => {
    if (!value) return "";
    const date = new Date(value);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Build chart data from transactions
  const chartData = useMemo(() => {
    if (!holidayTransactions.length) return [];

    // Sort by date
    const sorted = [...holidayTransactions].sort(
      (a, b) => new Date(a.transaction_date) - new Date(b.transaction_date)
    );

    // Build data points with step-down effect
    const dataPoints = [];
    sorted.forEach((t, idx) => {
      // For "used" transactions, show a vertical drop (step down)
      if (t.type === "used" && idx > 0) {
        // Add point at same x but previous y to create step
        const prevBalance = idx > 0 ? sorted[idx - 1].balance_after : t.balance_after + t.hours;
        dataPoints.push({
          x: t.transaction_date,
          y: prevBalance,
          description: "",
        });
      }
      dataPoints.push({
        x: t.transaction_date,
        y: t.balance_after,
        description: t.description || "",
      });
    });

    return [
      {
        id: "Vakantie-uren",
        color: colors.taupeAccent[500],
        data: dataPoints,
      },
    ];
  }, [holidayTransactions, colors.taupeAccent]);

  // X-axis tick values
  const xTicks = useMemo(() => {
    return chartData[0]?.data.map((d) => d.x) || [];
  }, [chartData]);

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
                <TextField
                  label="Uren per week"
                  type="number"
                  value={contractForm.hours_per_week}
                  onChange={(e) => setContractForm({ ...contractForm, hours_per_week: e.target.value })}
                  required
                  inputProps={{ step: "0.5", min: "0" }}
                  sx={inputStyles}
                />
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
                <Box display="flex" alignItems="center">
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
                {contractHistory.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ textAlign: "center", py: 4 }}>
                      Geen contract geschiedenis gevonden
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Divider sx={{ my: 4 }} />

          {/* Section 3: Holiday Hours */}
          <Typography variant="h4" fontWeight="600" color={tableColors.cells.text} mb={2}>
            Vakantie-uren Overzicht
          </Typography>

          {/* Holiday Hours Table */}
          <TableContainer
            component={Paper}
            sx={{
              backgroundColor: tableColors.container.background,
              borderRadius: "12px",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
              overflow: "hidden",
              mb: 4,
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
                  <TableCell>Jaar</TableCell>
                  <TableCell>Beschikbaar</TableCell>
                  <TableCell>Gebruikt</TableCell>
                  <TableCell>Resterend</TableCell>
                </TableRow>
              </TableHead>
              <TableBody
                sx={{
                  "& tr:last-of-type td:first-of-type": { borderBottomLeftRadius: "12px" },
                  "& tr:last-of-type td:last-of-type": { borderBottomRightRadius: "12px" },
                }}
              >
                {holidayData.map((holiday, idx) => (
                  <TableRow
                    key={holiday.id || idx}
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
                    <TableCell>{holiday.year}</TableCell>
                    <TableCell>{holiday.available_hours} uur</TableCell>
                    <TableCell>{holiday.used_hours} uur</TableCell>
                    <TableCell fontWeight="600">
                      {(holiday.available_hours - holiday.used_hours).toFixed(1)} uur
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

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
                inputProps={{ step: "0.5", min: "0" }}
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

          {/* Line Chart */}
          {chartData.length > 0 && chartData[0].data.length > 0 && (
            <Box
              sx={{
                backgroundColor: tableColors.container.background,
                p: 3,
                borderRadius: "12px",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                height: 350,
              }}
            >
              <Typography variant="h5" fontWeight="600" color={tableColors.cells.text} mb={2}>
                Vakantie-uren Verloop
              </Typography>
              <Box sx={{ height: 280 }}>
                <ResponsiveLine
                  data={chartData}
                  margin={{ top: 10, right: 60, bottom: 50, left: 40 }}
                  xScale={{ type: "point" }}
                  yScale={{ type: "linear", min: 0, max: "auto" }}
                  curve="stepAfter"
                  enableArea={true}
                  areaOpacity={0.15}
                  colors={[colors.taupeAccent[500]]}
                  lineWidth={2}
                  pointSize={6}
                  pointColor={colors.taupeAccent[500]}
                  pointBorderWidth={2}
                  pointBorderColor={{ from: "serieColor" }}
                  useMesh={true}
                  axisTop={null}
                  axisRight={null}
                  axisBottom={{
                    format: (value) => formatTimeLabel(value),
                    tickRotation: 0,
                    tickSize: 5,
                    tickPadding: 5,
                    tickValues: (() => {
                      const arr = xTicks.filter((t) => t != null);
                      if (!arr.length) return [];
                      const last = arr.length - 1;
                      if (last === 0) return [arr[0]];
                      const i2 = Math.floor(last / 3);
                      const i3 = Math.floor((2 * last) / 3);
                      return [arr[0], arr[i2], arr[i3], arr[last]].filter((t) => t != null);
                    })(),
                  }}
                  axisLeft={{
                    tickValues: 5,
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: "Uren",
                    legendOffset: -35,
                    legendPosition: "middle",
                  }}
                  theme={chartTheme}
                  enableGridX={false}
                  enableGridY={false}
                  tooltip={({ point }) => {
                    if (!point) return null;
                    return (
                      <Box
                        sx={{
                          background: isDarkMode ? colors.primary[400] : colors.primary[100],
                          padding: "12px 16px",
                          borderRadius: "4px",
                          border: `1px solid ${colors.taupeAccent[500]}`,
                          minWidth: "260px",
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ color: isDarkMode ? "#eee" : "#111", fontWeight: "bold", mb: 0.5 }}
                        >
                          Vakantie-uren
                        </Typography>
                        <Typography variant="body2" sx={{ color: isDarkMode ? "#eee" : "#111" }}>
                          Datum: {formatTimeLabel(point.data.x)}
                        </Typography>
                        <Typography variant="body2" sx={{ color: isDarkMode ? "#eee" : "#111" }}>
                          Saldo: {Number(point.data.y).toFixed(1)} uur
                        </Typography>
                        {point.data.description && (
                          <Typography variant="body2" sx={{ color: isDarkMode ? "#eee" : "#111" }}>
                            Beschrijving: {point.data.description}
                          </Typography>
                        )}
                      </Box>
                    );
                  }}
                />
              </Box>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default Medewerkers;
