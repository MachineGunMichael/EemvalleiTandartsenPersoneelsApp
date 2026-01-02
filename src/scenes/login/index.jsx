import { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { tokens } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

const Login = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { login, isAuthenticated, serverOnline, checkServerStatus } = useAuth();
  const navigate = useNavigate();
  
  // ========== RESPONSIVE ==========
  const isMobile = useMediaQuery(theme.breakpoints.down("md")); // < 900px

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isServerOffline, setIsServerOffline] = useState(false);

  // Check server status on mount
  useEffect(() => {
    const checkStatus = async () => {
      const online = await checkServerStatus();
      setIsServerOffline(!online);
    };
    checkStatus();
  }, [checkServerStatus]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await login(email, password);

    if (result.success) {
      navigate("/");
    } else {
      if (result.error === "server_offline") {
        setIsServerOffline(true);
      } else {
        setError(result.error || "Inloggen mislukt. Controleer uw gegevens.");
      }
    }
    setIsLoading(false);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${colors.taupeAccent[100]} 0%, ${colors.taupeAccent[200]} 50%, ${colors.taupeAccent[300]} 100%)`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative circles */}
      <Box
        sx={{
          position: "absolute",
          top: "-20%",
          right: "-10%",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.taupeAccent[500]}22 0%, transparent 70%)`,
        }}
      />
      <Box
        sx={{
          position: "absolute",
          bottom: "-15%",
          left: "-5%",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.taupeAccent[600]}22 0%, transparent 70%)`,
        }}
      />

      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: "420px",
          mx: { xs: 2, md: 3 },
          p: { xs: 3, md: 5 },
          borderRadius: { xs: "16px", md: "24px" },
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
        }}
      >
        {/* Logo */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            mb: 4,
          }}
        >
          <img
            src="/assets/ET-logo.png"
            alt="Eemvallei Tandartsen"
            style={{ height: "80px" }}
          />
        </Box>

        {/* Title */}
        <Typography
          variant="h3"
          sx={{
            textAlign: "center",
            fontWeight: "600",
            color: colors.primary[800],
            mb: 1,
          }}
        >
          Welkom terug
        </Typography>
        <Typography
          variant="body1"
          sx={{
            textAlign: "center",
            color: colors.primary[500],
            mb: 4,
          }}
        >
          Log in op uw account
        </Typography>

        {/* Server Offline Alert */}
        {isServerOffline && (
          <Alert
            severity="error"
            sx={{
              mb: 3,
              borderRadius: "12px",
              "& .MuiAlert-icon": {
                color: colors.redAccent[500],
              },
            }}
          >
            <Typography variant="body2" fontWeight="500">
              Inloggen tijdelijk niet mogelijk
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              De server is offline. Neem contact op met de beheerder.
            </Typography>
          </Alert>
        )}

        {/* Error Alert */}
        {error && !isServerOffline && (
          <Alert
            severity="error"
            sx={{
              mb: 3,
              borderRadius: "12px",
            }}
          >
            {error}
          </Alert>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="E-mailadres"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isServerOffline || isLoading}
            sx={{
              mb: 2.5,
              "& .MuiOutlinedInput-root": {
                borderRadius: "12px",
                backgroundColor: colors.taupeAccent[100],
                "&:hover fieldset": {
                  borderColor: colors.taupeAccent[400],
                },
                "&.Mui-focused fieldset": {
                  borderColor: colors.taupeAccent[500],
                },
              },
              "& .MuiInputLabel-root.Mui-focused": {
                color: colors.taupeAccent[600],
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailOutlinedIcon sx={{ color: colors.primary[400] }} />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label="Wachtwoord"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isServerOffline || isLoading}
            sx={{
              mb: 3,
              "& .MuiOutlinedInput-root": {
                borderRadius: "12px",
                backgroundColor: colors.taupeAccent[100],
                "&:hover fieldset": {
                  borderColor: colors.taupeAccent[400],
                },
                "&.Mui-focused fieldset": {
                  borderColor: colors.taupeAccent[500],
                },
              },
              "& .MuiInputLabel-root.Mui-focused": {
                color: colors.taupeAccent[600],
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon sx={{ color: colors.primary[400] }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    disabled={isServerOffline || isLoading}
                  >
                    {showPassword ? (
                      <VisibilityOffOutlinedIcon sx={{ color: colors.primary[400] }} />
                    ) : (
                      <VisibilityOutlinedIcon sx={{ color: colors.primary[400] }} />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={isServerOffline || isLoading || !email || !password}
            sx={{
              py: 1.5,
              borderRadius: "12px",
              fontSize: "1rem",
              fontWeight: "600",
              textTransform: "none",
              backgroundColor: colors.taupeAccent[500],
              boxShadow: `0 4px 14px ${colors.taupeAccent[500]}44`,
              "&:hover": {
                backgroundColor: colors.taupeAccent[600],
                boxShadow: `0 6px 20px ${colors.taupeAccent[500]}66`,
              },
              "&:disabled": {
                backgroundColor: colors.primary[300],
                color: colors.primary[500],
              },
            }}
          >
            {isLoading ? (
              <CircularProgress size={24} sx={{ color: "white" }} />
            ) : (
              "Inloggen"
            )}
          </Button>
        </form>

        {/* Footer */}
        <Typography
          variant="body2"
          sx={{
            textAlign: "center",
            color: colors.primary[400],
            mt: 4,
            fontSize: "0.85rem",
          }}
        >
          Eemvallei Tandartsen © {new Date().getFullYear()}
        </Typography>
      </Paper>
    </Box>
  );
};

export default Login;

