import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  useTheme,
  Button,
  TextField,
  Alert,
  CircularProgress,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { nl } from "date-fns/locale";
import { tokens } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import OvertimeOverviewTable from "../../components/OvertimeOverviewTable";
import OvertimeChart from "../../components/OvertimeChart";

const Overuren = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isDarkMode = theme.palette.mode === "dark";
  const { user } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [overtimeData, setOvertimeData] = useState([]);
  const [overtimeTransactions, setOvertimeTransactions] = useState([]);
  const [formSuccess, setFormSuccess] = useState("");
  const [formError, setFormError] = useState("");

  // Form state - single day only
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [hours, setHours] = useState("");
  const [description, setDescription] = useState("");

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

  // Fetch employee data on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.employee_id) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [overtimeRes, transRes] = await Promise.all([
          fetch(`http://localhost:5001/api/employees/${user.employee_id}/overtime`),
          fetch(`http://localhost:5001/api/employees/${user.employee_id}/overtime-transactions`),
        ]);

        if (overtimeRes.ok) setOvertimeData(await overtimeRes.json());
        if (transRes.ok) setOvertimeTransactions(await transRes.json());
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

  // Handle overtime request submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    const hoursToSubmit = parseFloat(hours);

    if (!hoursToSubmit || hoursToSubmit <= 0) {
      setFormError("Voer een geldig aantal uren in");
      return;
    }
    if (!description.trim()) {
      setFormError("Beschrijving is verplicht");
      return;
    }

    const formattedDate = selectedDate.toISOString().split("T")[0];

    try {
      // Submit overtime REQUEST (pending approval)
      const response = await fetch(
        `http://localhost:5001/api/overtime-requests`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employee_id: user.employee_id,
            user_id: user.id,
            request_date: formattedDate,
            hours: hoursToSubmit,
            description: description,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Fout bij indienen aanvraag");
      }

      setFormSuccess(`Overuren aanvraag ingediend: ${hoursToSubmit} uur. Wacht op goedkeuring.`);
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
          Overuren
        </Typography>
        <Typography variant="h5" color={colors.taupeAccent[500]}>
          Overuren doorgeven en overzicht
        </Typography>
      </Box>

      {/* Overtime Request Form */}
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
          Overuren Doorgeven
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={nl}>
              <DatePicker
                label="Datum"
                value={selectedDate}
                onChange={(newDate) => setSelectedDate(newDate)}
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
            </LocalizationProvider>

            <TextField
              label="Uren"
              type="number"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              required
              inputProps={{ step: "0.5", min: "0.5" }}
              sx={{ ...inputStyles, width: 100 }}
            />

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
                height: 40,
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

      {/* Overtime Overview Table - wrapped in container box like form */}
      <Box
        sx={{
          backgroundColor: tableColors.container.background,
          p: 4,
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
          mb: 4,
        }}
      >
        <OvertimeOverviewTable overtimeData={overtimeData} />
      </Box>

      {/* Overtime Chart */}
      <OvertimeChart overtimeTransactions={overtimeTransactions} />
    </Box>
  );
};

export default Overuren;

