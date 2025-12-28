import { useState } from "react";
import {
  Box,
  IconButton,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import { useContext } from "react";
import { ColorModeContext, tokens } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";

const Topbar = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const colorMode = useContext(ColorModeContext);
  const { logout } = useAuth();

  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const handleLogoutClick = () => {
    setLogoutDialogOpen(true);
  };

  const handleLogoutConfirm = () => {
    setLogoutDialogOpen(false);
    logout();
  };

  const handleLogoutCancel = () => {
    setLogoutDialogOpen(false);
  };

  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      height="140px"
      px={4}
      py={2}
    >
      <Box></Box>

      <Box display="flex">
        <IconButton
          onClick={colorMode?.toggleColorMode || (() => {})}
          sx={{ color: colors.primary[800] }}
        >
          {theme.palette.mode === "light" ? (
            <DarkModeOutlinedIcon />
          ) : (
            <LightModeOutlinedIcon />
          )}
        </IconButton>
        <IconButton sx={{ color: colors.primary[800] }}>
          <NotificationsOutlinedIcon />
        </IconButton>
        <IconButton sx={{ color: colors.primary[800] }}>
          <SettingsOutlinedIcon />
        </IconButton>
        <IconButton
          onClick={handleLogoutClick}
          sx={{ color: colors.primary[800] }}
          title="Uitloggen"
        >
          <LogoutOutlinedIcon />
        </IconButton>
      </Box>

      {/* Logout Confirmation Dialog */}
      <Dialog
        open={logoutDialogOpen}
        onClose={handleLogoutCancel}
        PaperProps={{
          sx: {
            borderRadius: "16px",
            p: 1,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: "600",
            color: colors.primary[800],
          }}
        >
          Uitloggen bevestigen
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: colors.primary[600] }}>
            Weet u zeker dat u wilt uitloggen? U wordt teruggebracht naar het
            inlogscherm.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={handleLogoutCancel}
            sx={{
              color: colors.primary[600],
              textTransform: "none",
              fontWeight: "500",
              "&:hover": {
                backgroundColor: colors.primary[200],
              },
            }}
          >
            Annuleren
          </Button>
          <Button
            onClick={handleLogoutConfirm}
            variant="contained"
            sx={{
              backgroundColor: colors.taupeAccent[500],
              textTransform: "none",
              fontWeight: "500",
              borderRadius: "8px",
              "&:hover": {
                backgroundColor: colors.taupeAccent[600],
              },
            }}
          >
            Uitloggen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Topbar;
