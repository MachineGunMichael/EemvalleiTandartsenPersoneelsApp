import { useState, useEffect, useContext } from "react";
import API_BASE_URL from "../../config/api";
import {
  Box,
  IconButton,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Badge,
  Popover,
  Typography,
  Divider,
  TextField,
  CircularProgress,
} from "@mui/material";
import { ColorModeContext, tokens } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { useSidebar } from "../../context/SidebarContext";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import BeachAccessOutlinedIcon from "@mui/icons-material/BeachAccessOutlined";
import MoreTimeOutlinedIcon from "@mui/icons-material/MoreTimeOutlined";

const Topbar = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isDarkMode = theme.palette.mode === "dark";
  const colorMode = useContext(ColorModeContext);
  const { user, logout } = useAuth();
  const { openMobileSidebar } = useSidebar();
  
  // ========== RESPONSIVE ==========
  const isMobile = useMediaQuery(theme.breakpoints.down("md")); // < 900px

  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pendingOvertimeRequests, setPendingOvertimeRequests] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedRequestType, setSelectedRequestType] = useState("vacation"); // "vacation" or "overtime"

  // Fetch notifications and pending requests
  const fetchNotifications = async () => {
    if (!user?.id) return;

    try {
      // Fetch user's notifications
      const notifRes = await fetch(`${API_BASE_URL}/api/notifications/${user.id}?unread_only=true`);
      if (notifRes.ok) {
        const notifs = await notifRes.json();
        setNotifications(notifs);
      }

      // If user is manager or admin, also fetch pending vacation and overtime requests
      if (user.role === "manager" || user.role === "admin") {
        const [vacReqRes, otReqRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/vacation-requests?status=pending&reviewer_role=${user.role}`),
          fetch(`${API_BASE_URL}/api/overtime-requests?status=pending&reviewer_role=${user.role}`),
        ]);
        
        if (vacReqRes.ok) {
          const reqs = await vacReqRes.json();
          setPendingRequests(reqs);
        }
        
        if (otReqRes.ok) {
          const otReqs = await otReqRes.json();
          setPendingOvertimeRequests(otReqs);
        }
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  // Calculate notification count
  useEffect(() => {
    const count = notifications.length + pendingRequests.length + pendingOvertimeRequests.length;
    setNotificationCount(count);
  }, [notifications, pendingRequests, pendingOvertimeRequests]);

  // Fetch on mount and set up polling
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [user]);

  // Handle notification click
  const handleNotificationClick = (event) => {
    setNotificationAnchor(event.currentTarget);
    fetchNotifications(); // Refresh when opening
  };

  const handleNotificationClose = () => {
    setNotificationAnchor(null);
  };

  // Approve vacation request
  const handleApprove = async (requestId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/vacation-requests/${requestId}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewer_id: user.id }),
      });
      if (response.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error("Error approving request:", err);
    } finally {
      setLoading(false);
    }
  };

  // Approve overtime request
  const handleApproveOvertime = async (requestId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/overtime-requests/${requestId}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewer_id: user.id }),
      });
      if (response.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error("Error approving overtime request:", err);
    } finally {
      setLoading(false);
    }
  };

  // Open reject dialog
  const handleRejectClick = (request, type = "vacation") => {
    setSelectedRequest(request);
    setSelectedRequestType(type);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  // Confirm rejection
  const handleRejectConfirm = async () => {
    if (!selectedRequest) return;
    setLoading(true);
    try {
      const endpoint = selectedRequestType === "overtime" 
        ? `${API_BASE_URL}/api/overtime-requests/${selectedRequest.id}/reject`
        : `${API_BASE_URL}/api/vacation-requests/${selectedRequest.id}/reject`;
      
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewer_id: user.id, reason: rejectReason }),
      });
      if (response.ok) {
        fetchNotifications();
        setRejectDialogOpen(false);
        setSelectedRequest(null);
      }
    } catch (err) {
      console.error("Error rejecting request:", err);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
        method: "PUT",
      });
      fetchNotifications();
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  // Format date
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("nl-NL", { day: "2-digit", month: "short", year: "numeric" });
  };

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

  const notificationOpen = Boolean(notificationAnchor);

  // ========== TOPBAR STYLES ==========
  const topbarStyles = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    // Responsive height
    height: { xs: "80px", md: "140px" },
    // Responsive padding
    px: { xs: 2, md: 4 },
    pt: { xs: 2, md: 2 },
    pb: { xs: 3, md: 2 },
  };

  return (
    <Box sx={topbarStyles}>
      {/* Left side: Hamburger menu (mobile) or empty (desktop) */}
      <Box display="flex" alignItems="center" gap={3}>
        {/* Hamburger menu - only on mobile */}
        {isMobile && (
          <IconButton
            onClick={openMobileSidebar}
            sx={{ color: colors.primary[800] }}
          >
            <MenuOutlinedIcon />
          </IconButton>
        )}
        
        {/* Logo - only on mobile */}
        {isMobile && (
          <img
            alt="Eemvallei Tandartsen logo"
            height="35px"
            src="/assets/ET-logo.png"
            style={{ marginLeft: "4px" }}
          />
        )}
      </Box>

      {/* Right side: Action buttons */}
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
        
        {/* Notification Button with Badge */}
        <IconButton 
          onClick={handleNotificationClick}
          sx={{ color: colors.primary[800] }}
        >
          <Badge 
            badgeContent={notificationCount} 
            color="error"
            sx={{
              "& .MuiBadge-badge": {
                backgroundColor: colors.redAccent[500],
                color: "#fff",
              }
            }}
          >
            <NotificationsOutlinedIcon />
          </Badge>
        </IconButton>

        <IconButton
          onClick={handleLogoutClick}
          sx={{ color: colors.primary[800] }}
          title="Uitloggen"
        >
          <LogoutOutlinedIcon />
        </IconButton>
      </Box>

      {/* Notification Popover */}
      <Popover
        open={notificationOpen}
        anchorEl={notificationAnchor}
        onClose={handleNotificationClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 500,
            borderRadius: "12px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            backgroundColor: isDarkMode ? colors.primary[300] : colors.primary[100],
          }
        }}
      >
        <Box p={2}>
          <Typography variant="h5" fontWeight="600" color={colors.primary[800]} mb={2}>
            Meldingen
          </Typography>

          {loading && (
            <Box display="flex" justifyContent="center" py={2}>
              <CircularProgress size={24} />
            </Box>
          )}

          {/* Pending Vacation Requests (for managers/admins) */}
          {pendingRequests.length > 0 && (
            <>
              <Typography variant="subtitle2" color={colors.taupeAccent[600]} mb={1}>
                Vakantie Aanvragen
              </Typography>
              {pendingRequests.map((req) => (
                <Box
                  key={`vac-${req.id}`}
                  sx={{
                    p: 2,
                    mb: 1,
                    borderRadius: "8px",
                    backgroundColor: isDarkMode ? colors.primary[400] : "#fff",
                    border: `1px solid ${colors.taupeAccent[200]}`,
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <BeachAccessOutlinedIcon sx={{ color: colors.taupeAccent[500], fontSize: 20 }} />
                    <Typography variant="body2" fontWeight="600" color={colors.primary[800]}>
                      Vakantie aanvraag
                    </Typography>
                  </Box>
                  <Typography variant="body2" color={colors.primary[700]} mb={1}>
                    <strong>{req.employee_name}</strong> vraagt {Math.abs(req.hours)} uur vakantie aan
                  </Typography>
                  <Typography variant="caption" color={colors.primary[600]}>
                    Datum: {formatDate(req.request_date)} • {req.description}
                  </Typography>
                  <Box display="flex" gap={1} mt={2}>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<CheckCircleOutlinedIcon />}
                      onClick={() => handleApprove(req.id)}
                      disabled={loading}
                      sx={{
                        backgroundColor: colors.greenAccent[500],
                        color: "#fff",
                        textTransform: "none",
                        "&:hover": { backgroundColor: colors.greenAccent[600] },
                      }}
                    >
                      Goedkeuren
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<CancelOutlinedIcon />}
                      onClick={() => handleRejectClick(req, "vacation")}
                      disabled={loading}
                      sx={{
                        borderColor: colors.redAccent[400],
                        color: colors.redAccent[500],
                        textTransform: "none",
                        "&:hover": { 
                          borderColor: colors.redAccent[500],
                          backgroundColor: colors.redAccent[100],
                        },
                      }}
                    >
                      Afwijzen
                    </Button>
                  </Box>
                </Box>
              ))}
              <Divider sx={{ my: 2 }} />
            </>
          )}

          {/* Pending Overtime Requests (for managers/admins) */}
          {pendingOvertimeRequests.length > 0 && (
            <>
              <Typography variant="subtitle2" color={colors.taupeAccent[600]} mb={1}>
                Overuren Aanvragen
              </Typography>
              {pendingOvertimeRequests.map((req) => (
                <Box
                  key={`ot-${req.id}`}
                  sx={{
                    p: 2,
                    mb: 1,
                    borderRadius: "8px",
                    backgroundColor: isDarkMode ? colors.primary[400] : "#fff",
                    border: `1px solid ${colors.taupeAccent[200]}`,
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <MoreTimeOutlinedIcon sx={{ color: colors.taupeAccent[500], fontSize: 20 }} />
                    <Typography variant="body2" fontWeight="600" color={colors.primary[800]}>
                      Overuren aanvraag
                    </Typography>
                  </Box>
                  <Typography variant="body2" color={colors.primary[700]} mb={1}>
                    <strong>{req.employee_name}</strong> vraagt {Math.abs(req.hours)} overuren aan
                  </Typography>
                  <Typography variant="caption" color={colors.primary[600]}>
                    Datum: {formatDate(req.request_date)} • {req.description}
                  </Typography>
                  <Box display="flex" gap={1} mt={2}>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<CheckCircleOutlinedIcon />}
                      onClick={() => handleApproveOvertime(req.id)}
                      disabled={loading}
                      sx={{
                        backgroundColor: colors.greenAccent[500],
                        color: "#fff",
                        textTransform: "none",
                        "&:hover": { backgroundColor: colors.greenAccent[600] },
                      }}
                    >
                      Goedkeuren
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<CancelOutlinedIcon />}
                      onClick={() => handleRejectClick(req, "overtime")}
                      disabled={loading}
                      sx={{
                        borderColor: colors.redAccent[400],
                        color: colors.redAccent[500],
                        textTransform: "none",
                        "&:hover": { 
                          borderColor: colors.redAccent[500],
                          backgroundColor: colors.redAccent[100],
                        },
                      }}
                    >
                      Afwijzen
                    </Button>
                  </Box>
                </Box>
              ))}
              <Divider sx={{ my: 2 }} />
            </>
          )}

          {/* User Notifications */}
          {notifications.length > 0 ? (
            <>
              <Typography variant="subtitle2" color={colors.taupeAccent[600]} mb={1}>
                Notificaties
              </Typography>
              {notifications.map((notif) => (
                <Box
                  key={notif.id}
                  sx={{
                    p: 2,
                    mb: 1,
                    borderRadius: "8px",
                    backgroundColor: isDarkMode ? colors.primary[400] : "#fff",
                    border: `1px solid ${
                      notif.type.includes("approved") 
                        ? colors.greenAccent[300] 
                        : notif.type.includes("rejected")
                        ? colors.redAccent[300]
                        : colors.taupeAccent[200]
                    }`,
                    cursor: "pointer",
                    "&:hover": {
                      backgroundColor: isDarkMode ? colors.primary[500] : colors.primary[200],
                    }
                  }}
                  onClick={() => handleMarkAsRead(notif.id)}
                >
                  <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                    {notif.type.includes("approved") && (
                      <CheckCircleOutlinedIcon sx={{ color: colors.greenAccent[500], fontSize: 18 }} />
                    )}
                    {notif.type.includes("rejected") && (
                      <CancelOutlinedIcon sx={{ color: colors.redAccent[500], fontSize: 18 }} />
                    )}
                    {notif.type === "vacation_request" && (
                      <BeachAccessOutlinedIcon sx={{ color: colors.taupeAccent[500], fontSize: 18 }} />
                    )}
                    {notif.type === "overtime_request" && (
                      <MoreTimeOutlinedIcon sx={{ color: colors.taupeAccent[500], fontSize: 18 }} />
                    )}
                    <Typography 
                      variant="body2" 
                      fontWeight="500"
                      color={
                        notif.type.includes("approved") 
                          ? colors.greenAccent[600]
                          : notif.type.includes("rejected")
                          ? colors.redAccent[600]
                          : colors.primary[800]
                      }
                    >
                      {notif.type === "vacation_approved" && "Vakantie goedgekeurd"}
                      {notif.type === "vacation_rejected" && "Vakantie afgewezen"}
                      {notif.type === "vacation_request" && "Vakantie aanvraag"}
                      {notif.type === "overtime_approved" && "Overuren goedgekeurd"}
                      {notif.type === "overtime_rejected" && "Overuren afgewezen"}
                      {notif.type === "overtime_request" && "Overuren aanvraag"}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color={colors.primary[700]}>
                    {notif.message}
                  </Typography>
                  <Typography variant="caption" color={colors.primary[500]} mt={0.5} display="block">
                    {formatDate(notif.created_at)}
                  </Typography>
                </Box>
              ))}
            </>
          ) : pendingRequests.length === 0 && pendingOvertimeRequests.length === 0 ? (
            <Box py={3} textAlign="center">
              <Typography color={colors.primary[600]}>
                Geen nieuwe meldingen
              </Typography>
            </Box>
          ) : null}
        </Box>
      </Popover>

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: "16px",
            p: 1,
            minWidth: 400,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: "600", color: colors.primary[800] }}>
          Aanvraag afwijzen
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: colors.primary[600], mb: 2 }}>
            Voeg optioneel een reden toe voor de afwijzing:
          </DialogContentText>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Reden (optioneel)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={() => setRejectDialogOpen(false)}
            sx={{
              color: colors.primary[600],
              textTransform: "none",
              "&:hover": { backgroundColor: colors.primary[200] },
            }}
          >
            Annuleren
          </Button>
          <Button
            onClick={handleRejectConfirm}
            variant="contained"
            disabled={loading}
            sx={{
              backgroundColor: colors.redAccent[500],
              textTransform: "none",
              "&:hover": { backgroundColor: colors.redAccent[600] },
            }}
          >
            Afwijzen
          </Button>
        </DialogActions>
      </Dialog>

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
