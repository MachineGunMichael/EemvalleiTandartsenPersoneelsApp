import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  useTheme,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Snackbar,
  InputAdornment,
  Divider,
} from "@mui/material";
import { tokens } from "../../theme";
import PersonAddOutlinedIcon from "@mui/icons-material/PersonAddOutlined";
import PersonOffOutlinedIcon from "@mui/icons-material/PersonOffOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";

const Instellingen = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isDarkMode = theme.palette.mode === "dark";

  // Users list state
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visiblePasswords, setVisiblePasswords] = useState({});

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "employee",
    dienstverband: "tijdelijk",
    hourly_rate: "",
    vakantietoeslag_percentage: "8",
    bonus_percentage: "0",
    available_hours: "",
  });

  // Werkrooster state (separate for cleaner handling)
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
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Deactivate dialog state
  const [deactivateDialog, setDeactivateDialog] = useState({ open: false, user: null });

  // Remove dialog state (complete deletion)
  const [removeDialog, setRemoveDialog] = useState({ open: false, user: null });

  // Snackbar state
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // Edit user state
  const [selectedEditUser, setSelectedEditUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "employee",
  });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editFormError, setEditFormError] = useState("");
  const [editFormSuccess, setEditFormSuccess] = useState("");

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
    // INACTIVE USER ROW STYLING
    inactive: {
      background: isDarkMode ? colors.grey[300] : colors.grey[100],
      text: isDarkMode ? colors.grey[500] : colors.grey[300],
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
        borderColor: isDarkMode ? colors.primary[600] : colors.taupeAccent[300],
      },
      "&:hover fieldset": {
        borderColor: isDarkMode ? colors.taupeAccent[400] : colors.taupeAccent[500],
      },
      "&.Mui-focused fieldset": {
        borderColor: colors.taupeAccent[500],
      },
    },
    "& .MuiInputLabel-root": {
      color: isDarkMode ? colors.primary[700] : colors.primary[600],
    },
    "& .MuiInputLabel-root.Mui-focused": {
      color: colors.taupeAccent[500],
    },
    "& .MuiInputBase-input": {
      color: isDarkMode ? colors.primary[900] : colors.primary[800],
    },
    "& .MuiInputBase-input::placeholder": {
      color: isDarkMode ? colors.primary[600] : colors.primary[500],
      opacity: 1,
    },
  };
  // ============================================

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:5001/api/users");
      if (!response.ok) throw new Error("Kon gebruikers niet ophalen");
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      console.error("Error fetching users:", err);
      setSnackbar({ open: true, message: err.message, severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Auto-dismiss success message after 3 seconds
  useEffect(() => {
    if (formSuccess) {
      const timer = setTimeout(() => {
        setFormSuccess("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [formSuccess]);

  // Auto-dismiss error message after 3 seconds
  useEffect(() => {
    if (formError) {
      const timer = setTimeout(() => {
        setFormError("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [formError]);

  // Auto-dismiss edit form messages
  useEffect(() => {
    if (editFormSuccess) {
      const timer = setTimeout(() => setEditFormSuccess(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [editFormSuccess]);

  useEffect(() => {
    if (editFormError) {
      const timer = setTimeout(() => setEditFormError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [editFormError]);

  // Populate edit form when user is selected
  useEffect(() => {
    if (selectedEditUser) {
      setEditFormData({
        name: selectedEditUser.name || "",
        email: selectedEditUser.email || "",
        password: "", // Don't prefill password for security
        role: selectedEditUser.role || "employee",
      });
      setShowEditPassword(false);
    }
  }, [selectedEditUser]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    // Validate required fields
    if (!formData.name || !formData.email || !formData.password) {
      setFormError("Naam, e-mailadres en wachtwoord zijn verplicht");
      return;
    }

    // For employees, validate contract fields
    if (formData.role === "employee") {
      if (!formData.hourly_rate || !formData.available_hours) {
        setFormError("Vul alle contract- en vakantiegegevens in voor medewerkers");
        return;
      }
      if (calculatedHoursPerWeek === 0) {
        setFormError("Vul minimaal één werkdag in voor het werkrooster");
        return;
      }
    }

    try {
      const response = await fetch("http://localhost:5001/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          hours_per_week: calculatedHoursPerWeek,
          hourly_rate: parseFloat(formData.hourly_rate),
          vakantietoeslag_percentage: parseFloat(formData.vakantietoeslag_percentage),
          bonus_percentage: parseFloat(formData.bonus_percentage),
          available_hours: parseFloat(formData.available_hours),
          werkrooster: formData.role === "employee" ? {
            monday_hours: parseFloat(werkrooster.monday_hours) || 0,
            tuesday_hours: parseFloat(werkrooster.tuesday_hours) || 0,
            wednesday_hours: parseFloat(werkrooster.wednesday_hours) || 0,
            thursday_hours: parseFloat(werkrooster.thursday_hours) || 0,
            friday_hours: parseFloat(werkrooster.friday_hours) || 0,
            saturday_hours: parseFloat(werkrooster.saturday_hours) || 0,
            sunday_hours: parseFloat(werkrooster.sunday_hours) || 0,
          } : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Fout bij aanmaken gebruiker");
      }

      setFormSuccess("Gebruiker succesvol aangemaakt");
      setFormData({
        name: "",
        email: "",
        password: "",
        role: "employee",
        dienstverband: "tijdelijk",
        hourly_rate: "",
        vakantietoeslag_percentage: "8",
        bonus_percentage: "0",
        available_hours: "",
      });
      setWerkrooster({
        monday_hours: 0,
        tuesday_hours: 0,
        wednesday_hours: 0,
        thursday_hours: 0,
        friday_hours: 0,
        saturday_hours: 0,
        sunday_hours: 0,
      });
      fetchUsers();
    } catch (err) {
      setFormError(err.message);
    }
  };

  // Handle deactivate user
  const handleDeactivate = async () => {
    if (!deactivateDialog.user) return;

    try {
      const response = await fetch(
        `http://localhost:5001/api/users/${deactivateDialog.user.id}/deactivate`,
        { method: "PUT" }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Fout bij deactiveren gebruiker");
      }

      setSnackbar({ open: true, message: "Gebruiker gedeactiveerd", severity: "success" });
      fetchUsers();
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: "error" });
    } finally {
      setDeactivateDialog({ open: false, user: null });
    }
  };

  // Handle complete removal of user (deletes all data)
  const handleRemove = async () => {
    if (!removeDialog.user) return;

    try {
      const response = await fetch(
        `http://localhost:5001/api/users/${removeDialog.user.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Fout bij verwijderen gebruiker");
      }

      setSnackbar({ open: true, message: "Gebruiker volledig verwijderd", severity: "success" });
      fetchUsers();
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: "error" });
    } finally {
      setRemoveDialog({ open: false, user: null });
    }
  };

  // Handle edit user submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditFormError("");
    setEditFormSuccess("");

    if (!selectedEditUser) {
      setEditFormError("Selecteer eerst een gebruiker");
      return;
    }

    if (!editFormData.name || !editFormData.email) {
      setEditFormError("Naam en e-mailadres zijn verplicht");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5001/api/users/${selectedEditUser.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editFormData.name,
            email: editFormData.email,
            password: editFormData.password || undefined, // Only update if provided
            role: editFormData.role,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Fout bij bijwerken gebruiker");
      }

      setEditFormSuccess("Gebruiker succesvol bijgewerkt");
      fetchUsers();
      
      // Update the selected user in the dropdown
      const updatedUser = users.find(u => u.id === selectedEditUser.id);
      if (updatedUser) {
        setSelectedEditUser({
          ...updatedUser,
          name: editFormData.name,
          email: editFormData.email,
          role: editFormData.role,
        });
      }
    } catch (err) {
      setEditFormError(err.message);
    }
  };

  // Handle reactivate user
  const handleReactivate = async (userId) => {
    try {
      const response = await fetch(
        `http://localhost:5001/api/users/${userId}/reactivate`,
        { method: "PUT" }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Fout bij activeren gebruiker");
      }

      setSnackbar({ open: true, message: "Gebruiker geactiveerd", severity: "success" });
      fetchUsers();
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: "error" });
    }
  };

  // Toggle password visibility for a specific user
  const togglePasswordVisibility = (userId) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  // Get role display name
  const getRoleDisplay = (role) => {
    switch (role) {
      case "admin": return "Beheerder";
      case "manager": return "Manager";
      case "employee": return "Medewerker";
      default: return role;
    }
  };

  // Get role chip color
  const getRoleColor = (role) => {
    switch (role) {
      case "admin": return colors.taupeAccent[700];
      case "manager": return colors.taupeAccent[500];
      case "employee": return colors.taupeAccent[400];
      default: return colors.grey[500];
    }
  };

  return (
    <Box m="20px" mt="-76px" pb={4}>
      {/* Header */}
      <Box>
        <Typography variant="h2" color={colors.primary[800]} fontWeight="bold">
          Instellingen
        </Typography>
        <Typography variant="h5" color={colors.taupeAccent[500]}>
          Gebruikersbeheer
        </Typography>
      </Box>

      {/* Create User Form */}
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          mt: 5,
          p: 4,
          backgroundColor: tableColors.container.background,
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
        }}
      >
        <Box display="flex" alignItems="center" gap={1} mb={3}>
          <PersonAddOutlinedIcon sx={{ color: colors.taupeAccent[500], fontSize: 28 }} />
          <Typography variant="h4" fontWeight="600" color={tableColors.cells.text}>
            Nieuwe gebruiker aanmaken
          </Typography>
        </Box>

        <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={3}>
          {/* Basic Info */}
          <TextField
            name="name"
            label="Volledige naam"
            value={formData.name}
            onChange={handleInputChange}
            required
            fullWidth
            sx={inputStyles}
          />
          <TextField
            name="email"
            label="E-mailadres"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            fullWidth
            sx={inputStyles}
          />
          <TextField
            name="password"
            label="Wachtwoord"
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={handleInputChange}
            required
            fullWidth
            sx={inputStyles}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                    {showPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <FormControl fullWidth sx={inputStyles}>
            <InputLabel>Rol</InputLabel>
            <Select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              label="Rol"
            >
              <MenuItem value="employee">Medewerker</MenuItem>
              <MenuItem value="manager">Manager</MenuItem>
              <MenuItem value="admin">Beheerder</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Employee-specific fields */}
        {formData.role === "employee" && (
          <>
            <Divider sx={{ my: 3 }} />
            <Typography variant="h5" fontWeight="600" color={tableColors.cells.text} mb={2}>
              Contractgegevens
            </Typography>
            <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={3}>
              <FormControl fullWidth sx={inputStyles}>
                <InputLabel>Dienstverband</InputLabel>
                <Select
                  name="dienstverband"
                  value={formData.dienstverband}
                  onChange={handleInputChange}
                  label="Dienstverband"
                >
                  <MenuItem value="proeftijd">Proeftijd</MenuItem>
                  <MenuItem value="tijdelijk">Tijdelijk</MenuItem>
                  <MenuItem value="vast">Vast</MenuItem>
                </Select>
              </FormControl>
              <TextField
                name="hourly_rate"
                label="Bruto uurloon (€)"
                type="number"
                value={formData.hourly_rate}
                onChange={handleInputChange}
                required
                sx={inputStyles}
                fullWidth
                inputProps={{ step: "0.01", min: "0" }}
              />
              <TextField
                name="vakantietoeslag_percentage"
                label="Vakantietoeslag (%)"
                type="number"
                value={formData.vakantietoeslag_percentage}
                onChange={handleInputChange}
                fullWidth
                sx={inputStyles}
                inputProps={{ step: "0.1", min: "0", max: "100" }}
              />
              <TextField
                name="bonus_percentage"
                label="Bonus (%)"
                type="number"
                value={formData.bonus_percentage}
                onChange={handleInputChange}
                fullWidth
                sx={inputStyles}
                inputProps={{ step: "0.1", min: "0", max: "100" }}
              />
              <TextField
                name="available_hours"
                label="Beschikbare vakantie-uren"
                type="number"
                sx={inputStyles}
                value={formData.available_hours}
                onChange={handleInputChange}
                required
                fullWidth
                inputProps={{ step: "1", min: "0" }}
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
          </>
        )}

        <Box mt={3} display="flex" justifyContent="flex-end" flexDirection="column" alignItems="flex-end" gap={2}>
          <Button
            type="submit"
            variant="contained"
            startIcon={<PersonAddOutlinedIcon />}
            sx={{
              backgroundColor: colors.taupeAccent[500],
              color: "white",
              px: 4,
              py: 1.5,
              "&:hover": {
                backgroundColor: colors.taupeAccent[600],
              },
            }}
          >
            Gebruiker aanmaken
          </Button>
          {formSuccess && (
            <Alert 
              severity="success" 
              sx={{ 
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
                backgroundColor: isDarkMode ? colors.redAccent[400] : colors.redAccent[100],
                color: isDarkMode ? colors.primary[900] : colors.redAccent[700],
                "& .MuiAlert-icon": {
                  color: isDarkMode ? colors.primary[900] : colors.redAccent[700],
                },
              }}
            >
              {formError}
            </Alert>
          )}
        </Box>
      </Box>

      {/* Edit User Form */}
      <Box
        component="form"
        onSubmit={handleEditSubmit}
        sx={{
          mt: 5,
          p: 4,
          backgroundColor: tableColors.container.background,
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
        }}
      >
        <Box display="flex" alignItems="center" gap={1} mb={3}>
          <EditOutlinedIcon sx={{ color: colors.taupeAccent[500], fontSize: 28 }} />
          <Typography variant="h4" fontWeight="600" color={tableColors.cells.text}>
            Gebruiker Aanpassen
          </Typography>
        </Box>

        {/* User Selector */}
        <FormControl fullWidth sx={{ ...inputStyles, mb: 3 }}>
          <InputLabel>Selecteer gebruiker</InputLabel>
          <Select
            value={selectedEditUser?.id || ""}
            onChange={(e) => {
              const user = users.find((u) => u.id === e.target.value);
              setSelectedEditUser(user);
              setEditFormError("");
              setEditFormSuccess("");
            }}
            label="Selecteer gebruiker"
          >
            {users.map((user) => (
              <MenuItem key={user.id} value={user.id}>
                {user.name} ({user.email})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedEditUser && (
          <>
            <Divider sx={{ mb: 3 }} />
            <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={3}>
              <TextField
                label="Naam"
                name="name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                required
                fullWidth
                sx={inputStyles}
              />
              <TextField
                label="E-mailadres"
                name="email"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                required
                fullWidth
                sx={inputStyles}
              />
              <TextField
                label="Nieuw wachtwoord"
                name="password"
                type={showEditPassword ? "text" : "password"}
                value={editFormData.password}
                onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                fullWidth
                placeholder="Laat leeg om niet te wijzigen"
                sx={inputStyles}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        edge="end"
                        sx={{ color: colors.taupeAccent[500] }}
                      >
                        {showEditPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <FormControl fullWidth sx={inputStyles}>
                <InputLabel>Rol</InputLabel>
                <Select
                  name="role"
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                  label="Rol"
                >
                  <MenuItem value="employee">Medewerker</MenuItem>
                  <MenuItem value="manager">Manager</MenuItem>
                  <MenuItem value="admin">Beheerder</MenuItem>
                </Select>
              </FormControl>
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
          </>
        )}

        {/* Success/Error Messages */}
        <Box mt={2}>
          {editFormSuccess && (
            <Alert
              severity="success"
              sx={{
                backgroundColor: isDarkMode ? colors.greenAccent[400] : colors.greenAccent[100],
                color: isDarkMode ? colors.primary[900] : colors.greenAccent[700],
                "& .MuiAlert-icon": {
                  color: isDarkMode ? colors.primary[900] : colors.greenAccent[700],
                },
              }}
            >
              {editFormSuccess}
            </Alert>
          )}
          {editFormError && (
            <Alert
              severity="error"
              sx={{
                backgroundColor: isDarkMode ? colors.redAccent[400] : colors.redAccent[100],
                color: isDarkMode ? colors.primary[900] : colors.redAccent[700],
                "& .MuiAlert-icon": {
                  color: isDarkMode ? colors.primary[900] : colors.redAccent[700],
                },
              }}
            >
              {editFormError}
            </Alert>
          )}
        </Box>
      </Box>

      {/* Users Table */}
      <Typography variant="h4" fontWeight="600" color={tableColors.cells.text} mt={8} mb={2}>
        Gebruikersoverzicht
      </Typography>
      <TableContainer
        sx={{
          backgroundColor: "transparent",
        }}
      >
        <Table
          sx={{
            backgroundColor: tableColors.container.background,
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
            overflow: "hidden",
          }}
        >
          <TableHead>
            <TableRow
              sx={{
                backgroundColor: tableColors.header.background,
                "& th:first-of-type": {
                  borderTopLeftRadius: "12px",
                },
                "& th:last-of-type": {
                  borderTopRightRadius: "12px",
                },
                "& th": {
                  fontWeight: "bold",
                  color: tableColors.header.text,
                  fontSize: "14px",
                  borderBottom: `2px solid ${colors.taupeAccent[300]}`,
                  py: 2.5,
                },
                "& th:first-of-type": {
                  pl: 3,
                },
              }}
            >
              <TableCell>Naam</TableCell>
              <TableCell>E-mailadres</TableCell>
              <TableCell>Wachtwoord</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Acties</TableCell>
            </TableRow>
          </TableHead>
          <TableBody
            sx={{
              "& tr:last-of-type td:first-of-type": {
                borderBottomLeftRadius: "12px",
              },
              "& tr:last-of-type td:last-of-type": {
                borderBottomRightRadius: "12px",
              },
            }}
          >
            {[...users].sort((a, b) => b.is_active - a.is_active).map((user, index) => (
              <TableRow
                key={user.id}
                sx={{
                  "&:nth-of-type(odd)": { backgroundColor: tableColors.cells.backgroundOdd },
                  "&:nth-of-type(even)": { backgroundColor: tableColors.cells.backgroundEven },
                  "&:hover": { backgroundColor: tableColors.cells.backgroundHover },
                  "& td": {
                    borderBottom: `1px solid ${colors.primary[200]}`,
                    py: 2,
                    color: tableColors.cells.text,
                  },
                  "& td:first-of-type": {
                    pl: 3,
                  },
                  transition: "background-color 0.2s ease",
                  // Inactive user styling
                  ...(user.is_active ? {} : {
                    backgroundColor: `${tableColors.inactive.background} !important`,
                    "& td": {
                      color: tableColors.inactive.text,
                    },
                  }),
                }}
              >
                <TableCell>
                  <Typography fontWeight="600" color={user.is_active ? tableColors.cells.text : tableColors.inactive.text}>
                    {user.name}
                  </Typography>
                </TableCell>
                <TableCell sx={{ color: user.is_active ? tableColors.cells.text : tableColors.inactive.text }}>{user.email}</TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography 
                      sx={{ 
                        fontFamily: "monospace",
                        fontSize: "13px",
                        color: tableColors.cells.text,
                        minWidth: "80px",
                      }}
                    >
                      {visiblePasswords[user.id] ? (user.plain_password || "-") : "••••••••"}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => togglePasswordVisibility(user.id)}
                      sx={{ 
                        color: colors.taupeAccent[500],
                        padding: "4px",
                      }}
                    >
                      {visiblePasswords[user.id] ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                    </IconButton>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={getRoleDisplay(user.role)}
                    size="small"
                    sx={{
                      backgroundColor: getRoleColor(user.role),
                      color: "white",
                      fontWeight: 500,
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.is_active ? "Actief" : "Inactief"}
                    size="small"
                    sx={{
                      backgroundColor: user.is_active ? colors.taupeAccent[400] : colors.grey[400],
                      color: "white",
                      fontWeight: 500,
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Box display="flex" gap={1}>
                    {user.is_active ? (
                      <IconButton
                        onClick={() => setDeactivateDialog({ open: true, user })}
                        sx={{ color: colors.grey[500] }}
                        title="Deactiveren"
                      >
                        <PersonOffOutlinedIcon />
                      </IconButton>
                    ) : (
                      <IconButton
                        onClick={() => handleReactivate(user.id)}
                        sx={{ color: colors.taupeAccent[500] }}
                        title="Activeren"
                      >
                        <PersonOutlinedIcon />
                      </IconButton>
                    )}
                    <IconButton
                      onClick={() => setRemoveDialog({ open: true, user })}
                      sx={{ 
                        color: colors.redAccent[500],
                        "&:hover": {
                          backgroundColor: colors.redAccent[100],
                        }
                      }}
                      title="Volledig verwijderen"
                    >
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Deactivate Confirmation Dialog */}
      <Dialog
        open={deactivateDialog.open}
        onClose={() => setDeactivateDialog({ open: false, user: null })}
      >
        <DialogTitle sx={{ fontWeight: "bold" }}>Gebruiker deactiveren</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Weet u zeker dat u <strong>{deactivateDialog.user?.name}</strong> wilt deactiveren?
            <br />
            De gebruiker kan niet meer inloggen, maar alle gegevens blijven bewaard.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeactivateDialog({ open: false, user: null })}
            sx={{ 
              color: colors.grey[600],
              "&:hover": {
                backgroundColor: colors.grey[200],
              }
            }}
          >
            Annuleren
          </Button>
          <Button
            onClick={handleDeactivate}
            sx={{ 
              color: colors.redAccent[500],
              "&:hover": {
                backgroundColor: colors.redAccent[200],
              }
            }}
          >
            Deactiveren
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove Confirmation Dialog (Complete Deletion) */}
      <Dialog
        open={removeDialog.open}
        onClose={() => setRemoveDialog({ open: false, user: null })}
      >
        <DialogTitle sx={{ fontWeight: "bold", color: colors.redAccent[500] }}>
          Gebruiker volledig verwijderen
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Weet u zeker dat u <strong>{removeDialog.user?.name}</strong> volledig wilt verwijderen?
            <br />
            <strong>Let op: Alle gegevens worden permanent verwijderd en kunnen niet worden hersteld!</strong>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setRemoveDialog({ open: false, user: null })}
            sx={{ 
              color: colors.grey[600],
              "&:hover": {
                backgroundColor: colors.grey[200],
              }
            }}
          >
            Annuleren
          </Button>
          <Button
            onClick={handleRemove}
            sx={{ 
              color: colors.redAccent[500],
              "&:hover": {
                backgroundColor: colors.redAccent[100],
              }
            }}
          >
            Verwijderen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Instellingen;
