import { useState, useEffect } from "react";
import { Box, Drawer, Typography, useTheme, IconButton } from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import { tokens } from "../../../theme";
import { useAppContext } from "../../../context/AppContext";
import { useSidebar } from "../../../context/SidebarContext";
import CloseIcon from "@mui/icons-material/Close";
import DashboardIcon from "@mui/icons-material/DashboardOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import BeachAccessOutlinedIcon from "@mui/icons-material/BeachAccessOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import MoreTimeOutlinedIcon from "@mui/icons-material/MoreTimeOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";

// Map icon names to actual icon components
const getIcon = (iconName) => {
  switch (iconName) {
    case "dashboard":
      return <DashboardIcon />;
    case "people":
      return <PeopleOutlinedIcon />;
    case "settings":
      return <SettingsOutlinedIcon />;
    case "vacation":
      return <BeachAccessOutlinedIcon />;
    case "folder":
      return <FolderOutlinedIcon />;
    case "overtime":
      return <MoreTimeOutlinedIcon />;
    case "orders":
      return <ShoppingCartOutlinedIcon />;
    default:
      return <DashboardIcon />;
  }
};

const MenuItem = ({ title, to, icon, isActive, onClick }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box
      component={Link}
      to={to}
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        padding: "16px 24px",
        textDecoration: "none",
        color: isActive ? colors.taupeAccent[500] : colors.primary[800],
        backgroundColor: "transparent",
        transition: "all 0.2s ease",
        "&:hover": {
          color: colors.taupeAccent[500],
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          "& svg": {
            fontSize: "28px",
          },
        }}
      >
        {icon}
      </Box>
      <Typography variant="h5" sx={{ fontWeight: isActive ? 600 : 400 }}>
        {title}
      </Typography>
    </Box>
  );
};

const SidebarMobile = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [selected, setSelected] = useState("Dashboard");
  const location = useLocation();
  const { availableRoutes } = useAppContext();
  const { isMobileOpen, closeMobileSidebar } = useSidebar();

  // Sync selected state with current route
  useEffect(() => {
    const currentRoute = availableRoutes.find(
      (route) => route.path === location.pathname
    );
    if (currentRoute) {
      setSelected(currentRoute.name);
    }
  }, [location.pathname, availableRoutes]);

  const handleMenuItemClick = (title) => {
    setSelected(title);
    closeMobileSidebar();
  };

  // ========== MOBILE STYLES ==========
  const drawerStyles = {
    "& .MuiDrawer-paper": {
      width: "280px",
      backgroundColor: colors.primary[100],
      borderRight: `1px solid ${colors.primary[400]}`,
    },
  };

  const headerStyles = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 16px 16px 24px",
    borderBottom: `1px solid ${colors.primary[300]}`,
  };

  const logoContainerStyles = {
    display: "flex",
    alignItems: "center",
    gap: 1,
  };

  const menuContainerStyles = {
    paddingTop: 2,
    display: "flex",
    flexDirection: "column",
  };

  return (
    <Drawer
      anchor="left"
      open={isMobileOpen}
      onClose={closeMobileSidebar}
      sx={drawerStyles}
    >
      {/* Header with logo and close button */}
      <Box sx={headerStyles}>
        <Box sx={logoContainerStyles}>
          <img
            alt="Eemvallei Tandartsen logo"
            height="40px"
            src="/assets/ET-logo.png"
          />
        </Box>
        <IconButton
          onClick={closeMobileSidebar}
          sx={{
            color: colors.primary[800],
            "&:hover": {
              backgroundColor: colors.primary[200],
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Menu Items */}
      <Box sx={menuContainerStyles}>
        {availableRoutes.map((route) => (
          <MenuItem
            key={route.path}
            title={route.name}
            to={route.path}
            icon={getIcon(route.icon)}
            isActive={selected === route.name}
            onClick={() => handleMenuItemClick(route.name)}
          />
        ))}
      </Box>
    </Drawer>
  );
};

export default SidebarMobile;

