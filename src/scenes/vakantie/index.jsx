import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  useTheme,
  Button,
  TextField,
  Alert,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { nl } from "date-fns/locale";
import { tokens } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import DateRangeOutlinedIcon from "@mui/icons-material/DateRangeOutlined";
import HolidayOverviewTable from "../../components/HolidayOverviewTable";
import HolidayChart from "../../components/HolidayChart";

const Vakantie = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isDarkMode = theme.palette.mode === "dark";
  const { user } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [holidayData, setHolidayData] = useState([]);
  const [holidayTransactions, setHolidayTransactions] = useState([]);
  const [workSchedule, setWorkSchedule] = useState(null);
  const [formSuccess, setFormSuccess] = useState("");
  const [formError, setFormError] = useState("");

  // Date selection state
  const [selectionMode, setSelectionMode] = useState("single");
  const [singleDate, setSingleDate] = useState(new Date());
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [hours, setHours] = useState("");
  const [description, setDescription] = useState("");
  const [calculatedHours, setCalculatedHours] = useState(0);

  // Table/container colors
  const tableColors = {
    container: {
      background: isDarkMode ? colors.primary[200] : colors.primary[100],
    },
    cells: {
      text: isDarkMode ? colors.primary[900] : colors.primary[800],
    },
  };

  // Input styling
  const inputStyles = {
    "& .MuiOutlinedInput-root": {
      color: isDarkMode ? colors.primary[900] : colors.primary[800],
      "& fieldset": { borderColor: colors.taupeAccent[300] },
      "&:hover fieldset": { borderColor: colors.taupeAccent[500] },
      "&.Mui-focused fieldset": { borderColor: colors.taupeAccent[500] },
    },
    "& .MuiInputLabel-root": {
      color: isDarkMode ? colors.primary[600] : colors.primary[600],
      "&.Mui-focused": { color: colors.taupeAccent[600] },
      "&.MuiInputLabel-shrink": { color: colors.taupeAccent[600] },
    },
  };

  // Format date for display
  const formatTimeLabel = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Get work hours for a specific day of week
  const getWorkHoursForDay = (dayOfWeek, schedule) => {
    if (!schedule) return 0;
    const dayMap = {
      0: schedule.sunday_hours,
      1: schedule.monday_hours,
      2: schedule.tuesday_hours,
      3: schedule.wednesday_hours,
      4: schedule.thursday_hours,
      5: schedule.friday_hours,
      6: schedule.saturday_hours,
    };
    return dayMap[dayOfWeek] || 0;
  };

  // Calculate total hours for a date range
  const calculateRangeHours = (start, end, schedule) => {
    if (!schedule || !start || !end) return 0;
    let totalHours = 0;
    const currentDate = new Date(start);
    const endDateTime = new Date(end).getTime();
    while (currentDate.getTime() <= endDateTime) {
      totalHours += getWorkHoursForDay(currentDate.getDay(), schedule);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return totalHours;
  };

  // Fetch employee data on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.employee_id) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [holidayRes, transRes, scheduleRes] = await Promise.all([
          fetch(`http://localhost:5001/api/employees/${user.employee_id}/holidays`),
          fetch(`http://localhost:5001/api/employees/${user.employee_id}/holiday-transactions`),
          fetch(`http://localhost:5001/api/employees/${user.employee_id}/work-schedule`),
        ]);

        if (holidayRes.ok) setHolidayData(await holidayRes.json());
        if (transRes.ok) setHolidayTransactions(await transRes.json());
        if (scheduleRes.ok) setWorkSchedule(await scheduleRes.json());
      } catch (err) {
        console.error("Error fetching data:", err);
        setFormError("Kon gegevens niet ophalen");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

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

  // Calculate hours when date range changes
  useEffect(() => {
    if (selectionMode === "range" && workSchedule) {
      setCalculatedHours(calculateRangeHours(startDate, endDate, workSchedule));
    }
  }, [selectionMode, startDate, endDate, workSchedule]);

  // Handle vacation request submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    const hoursToSubmit = selectionMode === "single" ? parseFloat(hours) : calculatedHours;

    if (!hoursToSubmit || hoursToSubmit <= 0) {
      setFormError("Voer een geldig aantal uren in");
      return;
    }
    if (!description.trim()) {
      setFormError("Beschrijving is verplicht");
      return;
    }

    const dateToSubmit = selectionMode === "single" ? singleDate : startDate;
    const formattedDate = dateToSubmit.toISOString().split("T")[0];

    let fullDescription = description;
    if (selectionMode === "range") {
      fullDescription = `${description} (${formatTimeLabel(startDate.toISOString())} t/m ${formatTimeLabel(endDate.toISOString())})`;
    }

    try {
      // Submit vacation REQUEST (pending approval) instead of directly adding hours
      const response = await fetch(
        `http://localhost:5001/api/vacation-requests`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employee_id: user.employee_id,
            user_id: user.id,
            request_date: formattedDate,
            hours: hoursToSubmit,
            description: fullDescription,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Fout bij indienen aanvraag");
      }

      setFormSuccess(`Vakantie aanvraag ingediend: ${hoursToSubmit} uur. Wacht op goedkeuring.`);
      setHours("");
      setDescription("");
    } catch (err) {
      setFormError(err.message);
    }
  };

  if (loading) {
    return (
      <Box m="20px" mt="-76px" display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box m="20px" mt="-76px" pb={4}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h2" color={colors.primary[800]} fontWeight="bold">
          Vakantie
        </Typography>
        <Typography variant="h5" color={colors.taupeAccent[500]}>
          Vakantie-uren aanvragen en overzicht
        </Typography>
      </Box>

      {/* Vacation Request Form */}
      <Box
        sx={{
          backgroundColor: tableColors.container.background,
          p: 4,
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
          mb: 4,
        }}
      >
        <Typography variant="h4" fontWeight="600" color={tableColors.cells.text} mb={3}>
          Vakantie Aanvragen
        </Typography>

        {/* Selection Mode Toggle */}
        <Box mb={3}>
          <ToggleButtonGroup
            value={selectionMode}
            exclusive
            onChange={(e, newMode) => newMode && setSelectionMode(newMode)}
            sx={{
              "& .MuiToggleButton-root": {
                color: colors.taupeAccent[600],
                borderColor: colors.taupeAccent[300],
                "&.Mui-selected": {
                  backgroundColor: colors.taupeAccent[500],
                  color: "#fff",
                  "&:hover": { backgroundColor: colors.taupeAccent[600] },
                },
                "&:hover": { backgroundColor: colors.taupeAccent[100] },
              },
            }}
          >
            <ToggleButton value="single">
              <CalendarTodayOutlinedIcon sx={{ mr: 1 }} />
              Enkele dag
            </ToggleButton>
            <ToggleButton value="range">
              <DateRangeOutlinedIcon sx={{ mr: 1 }} />
              Periode
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box component="form" onSubmit={handleSubmit}>
          <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={nl}>
              {selectionMode === "single" ? (
                <DatePicker
                  label="Datum"
                  value={singleDate}
                  onChange={(newDate) => setSingleDate(newDate)}
                  format="dd/MM/yyyy"
                  slotProps={{
                    textField: { required: true, sx: { ...inputStyles, width: 180 } },
                    day: {
                      sx: {
                        "&.Mui-selected": {
                          backgroundColor: colors.taupeAccent[500],
                          color: "#fff",
                          "&:hover": { backgroundColor: colors.taupeAccent[600], color: "#fff" },
                        },
                        "&:hover": { backgroundColor: colors.taupeAccent[200], color: colors.taupeAccent[800] },
                      },
                    },
                    openPickerIcon: { sx: { color: colors.taupeAccent[500] } },
                  }}
                />
              ) : (
                <>
                  <DatePicker
                    label="Van"
                    value={startDate}
                    onChange={(newDate) => setStartDate(newDate)}
                    format="dd/MM/yyyy"
                    slotProps={{
                      textField: { required: true, sx: { ...inputStyles, width: 160 } },
                      day: {
                        sx: {
                          "&.Mui-selected": {
                            backgroundColor: colors.taupeAccent[500],
                            color: "#fff",
                            "&:hover": { backgroundColor: colors.taupeAccent[600], color: "#fff" },
                          },
                          "&:hover": { backgroundColor: colors.taupeAccent[200], color: colors.taupeAccent[800] },
                        },
                      },
                      openPickerIcon: { sx: { color: colors.taupeAccent[500] } },
                    }}
                  />
                  <DatePicker
                    label="Tot en met"
                    value={endDate}
                    onChange={(newDate) => setEndDate(newDate)}
                    format="dd/MM/yyyy"
                    minDate={startDate}
                    slotProps={{
                      textField: { required: true, sx: { ...inputStyles, width: 160 } },
                      day: {
                        sx: {
                          "&.Mui-selected": {
                            backgroundColor: colors.taupeAccent[500],
                            color: "#fff",
                            "&:hover": { backgroundColor: colors.taupeAccent[600], color: "#fff" },
                          },
                          "&:hover": { backgroundColor: colors.taupeAccent[200], color: colors.taupeAccent[800] },
                        },
                      },
                      openPickerIcon: { sx: { color: colors.taupeAccent[500] } },
                    }}
                  />
                </>
              )}
            </LocalizationProvider>

            {selectionMode === "single" ? (
              <TextField
                label="Uren"
                type="number"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                required
                inputProps={{ step: "0.5", min: "0.5" }}
                sx={{ ...inputStyles, width: 100 }}
              />
            ) : (
              <Box
                sx={{
                  // ============================================
                  // BEREKENDE UREN BOX BACKGROUND COLOR
                  // ============================================
                  backgroundColor: isDarkMode 
                    ? colors.taupeAccent[500]  // ← DARK MODE BACKGROUND
                    : colors.taupeAccent[200], // ← LIGHT MODE BACKGROUND
                  // ============================================
                  px: 3,
                  borderRadius: "8px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  height: 54, // ← BEREKENDE UREN BOX HEIGHT (match input fields)
                  minWidth: 120,
                }}
              >
                {/* ============================================ */}
                {/* BEREKENDE UREN TEXT COLORS */}
                {/* ============================================ */}
                <Typography 
                  variant="caption" 
                  color={isDarkMode 
                    ? colors.taupeAccent[100]  // ← LABEL DARK MODE
                    : colors.taupeAccent[600]} // ← LABEL LIGHT MODE
                >
                  Berekende uren
                </Typography>
                <Typography 
                  variant="h5" 
                  fontWeight="600" 
                  color={isDarkMode 
                    ? colors.taupeAccent[100]  // ← VALUE DARK MODE
                    : colors.taupeAccent[700]} // ← VALUE LIGHT MODE
                >
                  {calculatedHours} uur
                </Typography>
                {/* ============================================ */}
              </Box>
            )}

            <TextField
              label="Reden / Beschrijving"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              sx={{ ...inputStyles, flex: 1, minWidth: 200 }}
            />

            <Button
              type="submit"
              variant="contained"
              startIcon={<SendOutlinedIcon />}
              sx={{
                backgroundColor: colors.taupeAccent[500],
                color: "white",
                px: 3,
                height: 40, // ← AANVRAGEN BUTTON HEIGHT (match input fields)
                "&:hover": { backgroundColor: colors.taupeAccent[600] },
              }}
            >
              Aanvragen
            </Button>
          </Box>

          {/* Success/Error Messages */}
          {formSuccess && (
            <Alert
              severity="success"
              sx={{
                mt: 2,
                backgroundColor: isDarkMode ? colors.greenAccent[400] : colors.greenAccent[100],
                color: isDarkMode ? colors.primary[900] : colors.greenAccent[700],
                "& .MuiAlert-icon": { color: isDarkMode ? colors.primary[900] : colors.greenAccent[700] },
              }}
            >
              {formSuccess}
            </Alert>
          )}
          {formError && (
            <Alert
              severity="error"
              sx={{
                mt: 2,
                backgroundColor: isDarkMode ? colors.redAccent[400] : colors.redAccent[100],
                color: isDarkMode ? colors.primary[900] : colors.redAccent[700],
                "& .MuiAlert-icon": { color: isDarkMode ? colors.primary[900] : colors.redAccent[700] },
              }}
            >
              {formError}
            </Alert>
          )}
        </Box>
      </Box>

      {/* Reusable Holiday Overview Table - wrapped in container box like form */}
      <Box
        sx={{
          backgroundColor: tableColors.container.background,
          p: 4,
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
          mb: 4,
        }}
      >
        <HolidayOverviewTable holidayData={holidayData} />
      </Box>

      {/* Reusable Holiday Chart */}
      <HolidayChart holidayTransactions={holidayTransactions} />
    </Box>
  );
};

export default Vakantie;
