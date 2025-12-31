import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import API_BASE_URL from "../../config/api";
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
  IconButton,
  Tooltip,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { tokens } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { useAppContext } from "../../context/AppContext";

const Dashboard = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isDarkMode = theme.palette.mode === "dark";
  const { user } = useAuth();
  const { currentRole } = useAppContext();
  const location = useLocation(); // Used to trigger refetch on navigation
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contractHistory, setContractHistory] = useState([]);
  
  // Calendar state for work schedule view
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [holidayTransactions, setHolidayTransactions] = useState([]);

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

  // Calendar navigation
  const navigateMonth = (direction) => {
    if (direction === "prev") {
      if (calendarMonth === 0) {
        setCalendarMonth(11);
        setCalendarYear(calendarYear - 1);
      } else {
        setCalendarMonth(calendarMonth - 1);
      }
    } else {
      if (calendarMonth === 11) {
        setCalendarMonth(0);
        setCalendarYear(calendarYear + 1);
      } else {
        setCalendarMonth(calendarMonth + 1);
      }
    }
  };

  // Get days in a month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get day of week (0 = Monday, 6 = Sunday)
  const getDayOfWeek = (year, month, day) => {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert Sunday (0) to 6, Monday (1) to 0
  };

  // Get employees working on a specific day of week
  const getEmployeesForDayOfWeek = (dayIndex) => {
    const dayKeys = [
      "monday_hours", "tuesday_hours", "wednesday_hours", 
      "thursday_hours", "friday_hours", "saturday_hours", "sunday_hours"
    ];
    return employees.filter(emp => emp[dayKeys[dayIndex]] > 0);
  };

  // Get position counts for a day
  const getPositionCounts = (workingEmployees) => {
    const counts = {};
    workingEmployees.forEach(emp => {
      const pos = emp.positie || "assistent";
      counts[pos] = (counts[pos] || 0) + 1;
    });
    return counts;
  };

  // Format position name for display
  const formatPositie = (pos) => {
    const names = {
      "eigenaar": "Eigenaar",
      "praktijkmanager": "Praktijkmanager",
      "tandarts": "Tandarts",
      "mondhygienist": "Mondhygiënist",
      "preventie-assistent": "Prev. Ass.",
      "assistent": "Assistent",
      "balie-medewerker": "Balie",
      "vakantie": "Vakantie"
    };
    return names[pos] || capitalize(pos);
  };

  // Get position color
  const getPositieColor = (pos) => {
    const posColors = {
      "eigenaar": colors.taupeAccent[800],
      "praktijkmanager": colors.taupeAccent[700],
      "tandarts": colors.taupeAccent[600],
      "mondhygienist": colors.taupeAccent[500],
      "preventie-assistent": colors.taupeAccent[400],
      "assistent": colors.taupeAccent[300],
      "balie-medewerker": colors.taupeAccent[200],
      "vakantie": colors.redAccent[500]
    };
    return posColors[pos] || colors.grey[400];
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
      background: isDarkMode ? colors.primary[400] : colors.primary[100],
    },
  };
  // ============================================

  // ============================================
  // EMPLOYEE CALENDAR COLOR CONFIGURATION
  // Customize colors for dark/light mode here
  // ============================================
  const calendarColors = {
    // Werkdag (working day)
    werkdag: {
      background: isDarkMode ? colors.taupeAccent[300] : colors.taupeAccent[100],
      dayNumber: isDarkMode ? colors.primary[300] : colors.primary[800],
      label: isDarkMode ? colors.primary[200] : colors.taupeAccent[600],       // "Werkdag" text
      hours: isDarkMode ? colors.primary[300] : colors.taupeAccent[500],       // "8 uur" text
    },
    // Vrij (free weekday, not weekend)
    vrij: {
      background: isDarkMode ? colors.taupeAccent[100] : "white",
      dayNumber: isDarkMode ? colors.primary[300] : colors.primary[800],
      label: isDarkMode ? colors.grey[400] : colors.grey[400],              // "Vrij" text
    },
    // Weekend (Saturday/Sunday)
    weekend: {
      background: isDarkMode ? colors.primary[700] : colors.primary[200],
      dayNumber: isDarkMode ? colors.grey[300] : colors.primary[800],
      label: isDarkMode ? colors.grey[400] : colors.grey[400],              // "Vrij" text
    },
    // Today (current day)
    today: {
      background: isDarkMode ? colors.taupeAccent[600] : colors.taupeAccent[200],
      dayNumber: isDarkMode ? colors.primary[900] : colors.taupeAccent[800],
      border: colors.taupeAccent[500],
    },
    // Vakantie (vacation)
    vakantie: {
      background: isDarkMode ? colors.redAccent[300] : colors.redAccent[100],
      dayNumber: isDarkMode ? colors.primary[300] : colors.primary[800],
      label: isDarkMode ? colors.redAccent[600] : colors.redAccent[500],    // "Vakantie" text
      description: isDarkMode ? colors.redAccent[600] : colors.redAccent[400], // Description text
      border: colors.redAccent[700],
    },
    // Default border
    border: isDarkMode ? colors.primary[900] : colors.primary[200],
  };
  // ============================================

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        setError(null);

        let url = `${API_BASE_URL}/api/employees`;
        
        // If employee, only fetch their own data
        if (currentRole === "employee" && user?.id) {
          url = `${API_BASE_URL}/api/employees/user/${user.id}`;
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
  }, [currentRole, user, location.key]); // location.key triggers refetch on navigation

  // Fetch contract history for employee role
  useEffect(() => {
    const fetchContractHistory = async () => {
      if (currentRole !== "employee" || !user?.employee_id) return;
      
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/employees/${user.employee_id}/contract-history`
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
  }, [currentRole, user, location.key]); // location.key triggers refetch on navigation

  // Fetch holiday transactions for employees for the calendar month
  useEffect(() => {
    const fetchHolidayTransactions = async () => {
      try {
        // Fetch for all employees (admin/manager) or just self (employee)
        const allTransactions = [];
        for (const emp of employees) {
          const response = await fetch(
            `${API_BASE_URL}/api/employees/${emp.employee_id}/holiday-transactions`
          );
          if (response.ok) {
            const data = await response.json();
            // Add employee info to each transaction
            data.forEach(t => {
              t.employee_name = emp.name;
              t.employee_id = emp.employee_id;
            });
            allTransactions.push(...data);
          }
        }
        setHolidayTransactions(allTransactions);
      } catch (err) {
        console.error("Error fetching holiday transactions:", err);
      }
    };

    if (employees.length > 0) {
      fetchHolidayTransactions();
    }
  }, [employees, calendarMonth, calendarYear]);

  // Check if an employee has a vacation on a specific date
  const getEmployeeVacationForDate = (employeeId, year, month, day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Find vacation transactions that cover this date
    const vacation = holidayTransactions.find(t => {
      if (t.employee_id !== employeeId || t.type !== 'used') return false;
      
      // Check if this is a date range (contains "t/m")
      if (t.description && t.description.includes('t/m')) {
        // Parse date range from description like "blabla (01-03-2026 t/m 06-03-2026)"
        const rangeMatch = t.description.match(/\((\d{2})-(\d{2})-(\d{4})\s+t\/m\s+(\d{2})-(\d{2})-(\d{4})\)/);
        if (rangeMatch) {
          const startDate = new Date(rangeMatch[3], parseInt(rangeMatch[2]) - 1, parseInt(rangeMatch[1]));
          const endDate = new Date(rangeMatch[6], parseInt(rangeMatch[5]) - 1, parseInt(rangeMatch[4]));
          const checkDate = new Date(year, month, day);
          return checkDate >= startDate && checkDate <= endDate;
        }
      }
      
      // Single date match
      return t.transaction_date === dateStr;
    });
    
    return vacation;
  };

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
                <TableCell>Vakantie beschikbaar</TableCell>
                <TableCell>Vakantie gebruikt</TableCell>
                <TableCell>Overuren</TableCell>
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
                    <Typography fontSize="13px">
                      {employee.positie ? capitalize(employee.positie.replace("-", " ")) : "-"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography>
                      {employee.hours_per_week ? `${employee.hours_per_week} uur` : "-"}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ px: 1 }}>
                    <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
                      {[
                        employee.monday_hours,
                        employee.tuesday_hours,
                        employee.wednesday_hours,
                        employee.thursday_hours,
                        employee.friday_hours,
                        employee.saturday_hours,
                        employee.sunday_hours,
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
                  <TableCell>
                    <Box
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        backgroundColor: (employee.overtime_balance || 0) > 0 
                          ? colors.taupeAccent[300] 
                          : colors.primary[300],
                        px: 1.5,
                        py: 0.5,
                        borderRadius: "8px",
                      }}
                    >
                      <Typography fontWeight="500" color={colors.primary[900]}>
                        {employee.overtime_balance !== null && employee.overtime_balance !== undefined
                          ? `${employee.overtime_balance} uur` 
                          : "0 uur"}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Monthly Work Schedule Calendar - Admin/Manager only */}
      {(currentRole === "admin" || currentRole === "manager") && !loading && !error && employees.length > 0 && (
        <Box
          sx={{
            mt: 5,
            p: 3,
            backgroundColor: tableColors.container.background,
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
          }}
        >
          {/* Header with navigation */}
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
            <Box display="flex" alignItems="center" gap={1}>
              <CalendarMonthIcon sx={{ color: colors.taupeAccent[500], fontSize: 28 }} />
              <Typography variant="h4" fontWeight="600" color={tableColors.cells.text}>
                Werkrooster
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <IconButton 
                onClick={() => navigateMonth("prev")}
                sx={{ 
                  color: colors.taupeAccent[500],
                  "&:hover": { backgroundColor: colors.taupeAccent[100] }
                }}
              >
                <ChevronLeftIcon />
              </IconButton>
              <Typography 
                variant="h5" 
                fontWeight="500" 
                color={tableColors.cells.text}
                sx={{ minWidth: 160, textAlign: "center" }}
              >
                {getMonthName(calendarMonth + 1)} {calendarYear}
              </Typography>
              <IconButton 
                onClick={() => navigateMonth("next")}
                sx={{ 
                  color: colors.taupeAccent[500],
                  "&:hover": { backgroundColor: colors.taupeAccent[100] }
                }}
              >
                <ChevronRightIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Calendar Grid */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 1,
            }}
          >
            {/* Day headers */}
            {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((day, idx) => (
              <Box
                key={day}
                sx={{
                  py: 1.5,
                  textAlign: "center",
                  backgroundColor: tableColors.header.background,
                  borderRadius: "8px",
                  mb: 1,
                }}
              >
                <Typography 
                  fontWeight="600" 
                  fontSize="13px"
                  color={tableColors.header.text}
                >
                  {day}
                </Typography>
              </Box>
            ))}

            {/* Empty cells for days before first of month */}
            {[...Array(getDayOfWeek(calendarYear, calendarMonth, 1))].map((_, i) => (
              <Box key={`empty-${i}`} sx={{ minHeight: 100 }} />
            ))}

            {/* Calendar days */}
            {[...Array(getDaysInMonth(calendarYear, calendarMonth))].map((_, dayIndex) => {
              const day = dayIndex + 1;
              const dayOfWeek = getDayOfWeek(calendarYear, calendarMonth, day);
              const scheduledEmployees = getEmployeesForDayOfWeek(dayOfWeek);
              
              // Separate employees on vacation from working employees
              const vacationEmployees = [];
              const workingEmployees = [];
              scheduledEmployees.forEach(emp => {
                const vacation = getEmployeeVacationForDate(emp.employee_id, calendarYear, calendarMonth, day);
                if (vacation) {
                  vacationEmployees.push({ ...emp, vacationDescription: vacation.description });
                } else {
                  workingEmployees.push(emp);
                }
              });
              
              // Calculate position counts excluding vacation employees
              const positionCounts = getPositionCounts(workingEmployees);
              // Add vacation count if any
              if (vacationEmployees.length > 0) {
                positionCounts["vakantie"] = vacationEmployees.length;
              }
              
              const isToday = 
                day === new Date().getDate() && 
                calendarMonth === new Date().getMonth() && 
                calendarYear === new Date().getFullYear();
              const isWeekend = dayOfWeek >= 5;

              return (
                <Box
                  key={day}
                  sx={{
                    minHeight: 100,
                    p: 1,
                    backgroundColor: isToday 
                      ? isDarkMode ? colors.taupeAccent[700] : colors.taupeAccent[100]
                      : isWeekend 
                        ? isDarkMode ? colors.primary[500] : colors.primary[200]
                        : isDarkMode ? colors.primary[400] : "white",
                    borderRadius: "8px",
                    border: isToday 
                      ? `2px solid ${colors.taupeAccent[500]}`
                      : `1px solid ${isDarkMode ? colors.primary[600] : colors.primary[200]}`,
                    transition: "all 0.2s ease",
                    "&:hover": {
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      transform: "translateY(-1px)",
                    },
                  }}
                >
                  {/* Day number */}
                  <Typography 
                    fontWeight={isToday ? "700" : "500"} 
                    fontSize="14px"
                    color={isToday ? colors.taupeAccent[600] : tableColors.cells.text}
                    sx={{ mb: 0.5 }}
                  >
                    {day}
                  </Typography>

                  {/* Working employees count (excluding vacation) */}
                  {(workingEmployees.length > 0 || vacationEmployees.length > 0) && (
                    <Box>
                      <Typography 
                        fontSize="10px" 
                        color={colors.taupeAccent[500]}
                        fontWeight="600"
                        sx={{ mb: 0.5 }}
                      >
                        {workingEmployees.length} medewerker{workingEmployees.length !== 1 ? "s" : ""}
                      </Typography>

                      {/* Position chips */}
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.3 }}>
                        {Object.entries(positionCounts).map(([pos, count]) => (
                          <Tooltip 
                            key={pos} 
                            title={pos === "vakantie" 
                              ? `${count}x Vakantie` 
                              : `${count}x ${formatPositie(pos)}`}
                            arrow
                          >
                            <Box
                              sx={{
                                minWidth: 18,
                                minHeight: 18,
                                borderRadius: "4px",
                                backgroundColor: getPositieColor(pos),
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Typography 
                                fontSize="10px" 
                                fontWeight="600"
                                color="white"
                                sx={{ lineHeight: 1 }}
                              >
                                {count}
                              </Typography>
                            </Box>
                          </Tooltip>
                        ))}
                      </Box>

                      {/* Employee names on hover */}
                      <Tooltip
                        title={
                          <Box>
                            {/* Working employees */}
                            {workingEmployees.map(emp => (
                              <Typography key={emp.employee_id} fontSize="12px">
                                {emp.name} ({formatPositie(emp.positie || "assistent")})
                              </Typography>
                            ))}
                            {/* Vacation employees in red */}
                            {vacationEmployees.map(emp => (
                              <Typography 
                                key={emp.employee_id} 
                                fontSize="12px"
                                sx={{ color: colors.redAccent[400] }}
                              >
                                {emp.name} ({emp.vacationDescription ? emp.vacationDescription.split('(')[0].trim() : 'Vakantie'})
                              </Typography>
                            ))}
                          </Box>
                        }
                        arrow
                        placement="top"
                      >
                        <Box
                          sx={{
                            mt: 0.5,
                            overflow: "hidden",
                            cursor: "pointer",
                          }}
                        >
                          {/* Show first 2 working employees */}
                          {workingEmployees.slice(0, 2).map(emp => (
                            <Typography 
                              key={emp.employee_id}
                              fontSize="9px" 
                              color={tableColors.cells.text}
                              sx={{ 
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                opacity: 0.8,
                              }}
                            >
                              {emp.name.split(" ")[0]}
                            </Typography>
                          ))}
                          {/* Show vacation employees in red if space allows */}
                          {workingEmployees.length < 2 && vacationEmployees.slice(0, 2 - workingEmployees.length).map(emp => (
                            <Typography 
                              key={emp.employee_id}
                              fontSize="9px" 
                              color={colors.redAccent[500]}
                              sx={{ 
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                opacity: 0.9,
                              }}
                            >
                              {emp.name.split(" ")[0]}
                            </Typography>
                          ))}
                          {(workingEmployees.length + vacationEmployees.length) > 2 && (
                            <Typography 
                              fontSize="9px" 
                              color={colors.taupeAccent[500]}
                              fontWeight="500"
                            >
                              +{workingEmployees.length + vacationEmployees.length - 2} meer
                            </Typography>
                          )}
                        </Box>
                      </Tooltip>
                    </Box>
                  )}

                  {/* No employees indicator - only show if no one is scheduled (neither working nor on vacation) */}
                  {scheduledEmployees.length === 0 && (
                    <Typography 
                      fontSize="10px" 
                      color={colors.grey[400]}
                      fontStyle="italic"
                    >
                      Vrij
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>

          {/* Legend */}
          <Box 
            sx={{ 
              mt: 3, 
              pt: 2, 
              borderTop: `1px solid ${isDarkMode ? colors.primary[600] : colors.primary[200]}`,
              display: "flex",
              flexWrap: "wrap",
              gap: 2,
              alignItems: "center",
            }}
          >
            <Typography fontSize="12px" color={tableColors.cells.text} fontWeight="500">
              Legenda:
            </Typography>
            {["praktijkmanager", "tandarts", "mondhygienist", "preventie-assistent", "assistent", "balie-medewerker", "vakantie"].map(pos => (
              <Box key={pos} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "3px",
                    backgroundColor: getPositieColor(pos),
                  }}
                />
                <Typography fontSize="11px" color={tableColors.cells.text}>
                  {formatPositie(pos)}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
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

          {/* Personal Werkrooster Calendar for Employee */}
          <Box
            sx={{
              mt: 5,
              p: 3,
              backgroundColor: tableColors.container.background,
              borderRadius: "12px",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
            }}
          >
            {/* Header with navigation */}
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
              <Box display="flex" alignItems="center" gap={1}>
                <CalendarMonthIcon sx={{ color: colors.taupeAccent[500], fontSize: 28 }} />
                <Typography variant="h4" fontWeight="600" color={tableColors.cells.text}>
                  Mijn Werkrooster
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <IconButton 
                  onClick={() => navigateMonth("prev")}
                  sx={{ 
                    color: colors.taupeAccent[500],
                    "&:hover": { backgroundColor: colors.taupeAccent[100] }
                  }}
                >
                  <ChevronLeftIcon />
                </IconButton>
                <Typography 
                  variant="h5" 
                  fontWeight="500" 
                  color={tableColors.cells.text}
                  sx={{ minWidth: 160, textAlign: "center" }}
                >
                  {getMonthName(calendarMonth + 1)} {calendarYear}
                </Typography>
                <IconButton 
                  onClick={() => navigateMonth("next")}
                  sx={{ 
                    color: colors.taupeAccent[500],
                    "&:hover": { backgroundColor: colors.taupeAccent[100] }
                  }}
                >
                  <ChevronRightIcon />
                </IconButton>
              </Box>
            </Box>

            {/* Calendar Grid */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 1,
              }}
            >
              {/* Day headers */}
              {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((day) => (
                <Box
                  key={day}
                  sx={{
                    py: 1.5,
                    textAlign: "center",
                    backgroundColor: tableColors.header.background,
                    borderRadius: "8px",
                    mb: 1,
                  }}
                >
                  <Typography 
                    fontWeight="600" 
                    fontSize="13px"
                    color={tableColors.header.text}
                  >
                    {day}
                  </Typography>
                </Box>
              ))}

              {/* Empty cells for days before first of month */}
              {[...Array(getDayOfWeek(calendarYear, calendarMonth, 1))].map((_, i) => (
                <Box key={`empty-${i}`} sx={{ minHeight: 80 }} />
              ))}

              {/* Calendar days */}
              {[...Array(getDaysInMonth(calendarYear, calendarMonth))].map((_, dayIndex) => {
                const day = dayIndex + 1;
                const dayOfWeek = getDayOfWeek(calendarYear, calendarMonth, day);
                const dayKeys = [
                  "monday_hours", "tuesday_hours", "wednesday_hours", 
                  "thursday_hours", "friday_hours", "saturday_hours", "sunday_hours"
                ];
                const myEmployee = employees[0]; // Employee only sees themselves
                const myHours = myEmployee ? myEmployee[dayKeys[dayOfWeek]] : 0;
                const isWorking = myHours > 0;
                
                // Check if employee is on vacation this day
                const vacation = myEmployee ? getEmployeeVacationForDate(
                  myEmployee.employee_id, 
                  calendarYear, 
                  calendarMonth, 
                  day
                ) : null;
                
                const isToday = 
                  day === new Date().getDate() && 
                  calendarMonth === new Date().getMonth() && 
                  calendarYear === new Date().getFullYear();
                const isWeekend = dayOfWeek >= 5;

                // Determine which color set to use
                const getBoxColors = () => {
                  if (vacation) return calendarColors.vakantie;
                  if (isToday) return calendarColors.today;
                  if (isWorking) return calendarColors.werkdag;
                  if (isWeekend) return calendarColors.weekend;
                  return calendarColors.vrij;
                };
                const boxColors = getBoxColors();

                return (
                  <Box
                    key={day}
                    sx={{
                      minHeight: 80,
                      p: 1,
                      backgroundColor: boxColors.background,
                      borderRadius: "8px",
                      border: isToday 
                        ? `2px solid ${calendarColors.today.border}`
                        : vacation
                          ? `1px solid ${calendarColors.vakantie.border}`
                          : `1px solid ${calendarColors.border}`,
                      transition: "all 0.2s ease",
                    }}
                  >
                    {/* Day number */}
                    <Typography 
                      fontWeight={isToday ? "700" : "500"} 
                      fontSize="14px"
                      color={boxColors.dayNumber}
                      sx={{ mb: 0.5 }}
                    >
                      {day}
                    </Typography>

                    {/* Vacation indicator */}
                    {vacation && (
                      <Tooltip title={vacation.description || "Vakantie"} arrow>
                        <Box>
                          <Typography 
                            fontSize="10px" 
                            fontWeight="600"
                            color={calendarColors.vakantie.label}
                          >
                            Vakantie
                          </Typography>
                          <Typography 
                            fontSize="9px" 
                            color={calendarColors.vakantie.description}
                            sx={{ 
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {vacation.description ? vacation.description.split('(')[0].trim() : ''}
                          </Typography>
                        </Box>
                      </Tooltip>
                    )}

                    {/* Working hours indicator */}
                    {!vacation && isWorking && (
                      <Box>
                        <Typography 
                          fontSize="10px" 
                          color={calendarColors.werkdag.label}
                          fontWeight="600"
                        >
                          Werkdag
                        </Typography>
                        <Typography 
                          fontSize="12px" 
                          color={calendarColors.werkdag.hours}
                          fontWeight="500"
                        >
                          {myHours} uur
                        </Typography>
                      </Box>
                    )}

                    {/* Free day indicator */}
                    {!vacation && !isWorking && (
                      <Typography 
                        fontSize="10px" 
                        color={isWeekend ? calendarColors.weekend.label : calendarColors.vrij.label}
                        fontStyle="italic"
                      >
                        Vrij
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Box>

            {/* Legend */}
            <Box 
              sx={{ 
                mt: 3, 
                pt: 2, 
                borderTop: `1px solid ${isDarkMode ? colors.primary[600] : colors.primary[200]}`,
                display: "flex",
                flexWrap: "wrap",
                gap: 2,
                alignItems: "center",
              }}
            >
              <Typography fontSize="12px" color={tableColors.cells.text} fontWeight="500">
                Legenda:
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "3px",
                    backgroundColor: isDarkMode ? colors.taupeAccent[600] : colors.taupeAccent[100],
                    border: `1px solid ${colors.taupeAccent[300]}`,
                  }}
                />
                <Typography fontSize="11px" color={tableColors.cells.text}>
                  Werkdag
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "3px",
                    backgroundColor: isDarkMode ? colors.primary[400] : "white",
                    border: `1px solid ${colors.primary[200]}`,
                  }}
                />
                <Typography fontSize="11px" color={tableColors.cells.text}>
                  Vrij
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "3px",
                    backgroundColor: colors.redAccent[500],
                  }}
                />
                <Typography fontSize="11px" color={tableColors.cells.text}>
                  Vakantie
                </Typography>
              </Box>
            </Box>
          </Box>
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
