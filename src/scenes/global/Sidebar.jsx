import { useState } from "react";
import { Sidebar as ProSidebar, Menu, MenuItem } from "react-pro-sidebar";
import { Box, Typography, useTheme } from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import { tokens } from "../../theme";
import DashboardIcon from "@mui/icons-material/DashboardOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";

const Item = ({ title, to, icon, selected, setSelected }) => {
  return (
    <MenuItem
      active={selected === title}
      onClick={() => setSelected(title)}
      icon={icon}
      component={<Link to={to} />}
    >
      <Typography variant="h4">{title}</Typography>
    </MenuItem>
  );
};

const Sidebar = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selected, setSelected] = useState("Dashboard");
  const location = useLocation();

  return (
    <Box
      sx={{
        height: "100vh",
        width: isCollapsed ? "80px" : "400px",
        transition: "width 0.3s ease",
        borderRight: "none",
        backgroundColor: `${colors.primary[100]}`,
        position: "relative",
        "&::after": {
          content: '""',
          position: "absolute",
          top: 0,
          right: 0,
          height: "100%",
          width: "1px",
          backgroundColor: colors.primary[400],
          zIndex: 1000,
        },
        "& .ps-sidebar-root": {
          borderRight: "none",
          width: "100% !important",
          height: "100% !important",
          backgroundColor: `${colors.primary[100]} !important`,
        },
        "& .ps-sidebar-container": {
          backgroundColor: `${colors.primary[100]} !important`,
          height: "100% !important",
          overflow: "hidden !important",
        },
        "& .ps-menu-root": {
          height: "100%",
          backgroundColor: `${colors.primary[100]} !important`,
        },
        "& .ps-menu-button": {
          display: "flex !important",
          flexDirection: "row !important",
          alignItems: "center !important",
          justifyContent: "center !important",
          padding: "40px 20px",
          color: `${colors.primary[800]} !important`,
          backgroundColor: "transparent !important",
        },
        "& .ps-menu-button .ps-menu-icon": {
          minWidth: "20px !important",
          display: "flex !important",
          alignItems: "center !important",
          justifyContent: "center !important",
          marginRight: isCollapsed ? "0 !important" : "25px !important",
          marginLeft: isCollapsed ? "0 !important" : "5px !important",
        },
        "& .ps-menu-button .ps-menu-icon svg": {
          fontSize: "40px !important",
        },
        "& .ps-menu-button .ps-menu-label": {
          display: isCollapsed ? "none !important" : "inline-flex !important",
          textAlign: "left !important",
          padding: "0 !important",
        },
        "& .ps-menuitem-root": {
          width: "100%",
        },
        "& .ps-menuitem-root > div": {
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        },
        "& .ps-menu-button:hover": {
          color: `${colors.taupeAccent[500]} !important`,
          backgroundColor: "transparent !important",
        },
        "& .ps-menuitem-root.ps-active .ps-menu-button": {
          color: `${colors.taupeAccent[500]} !important`,
          backgroundColor: "transparent !important",
        },
      }}
    >
      {/* Logo */}
      {!isCollapsed && (
        <>
          <Box
            sx={{
              position: "absolute",
              top: "50px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 5,
              pointerEvents: "none",
            }}
          >
            <img
              alt="Eemvallei Tandartsen logo"
              height="70px"
              src="/assets/ET-logo.png"
            />
          </Box>
          <Box
            onClick={() => setIsCollapsed(!isCollapsed)}
            sx={{
              position: "absolute",
              top: "-30px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "300px",
              height: "190px",
              cursor: "pointer",
              zIndex: 100,
            }}
          />
        </>
      )}

      <ProSidebar
        collapsed={isCollapsed}
        style={{
          height: "100%",
          backgroundColor: colors.primary[800],
        }}
      >
        <Menu
          iconShape="square"
          style={{
            height: "100%",
            backgroundColor: colors.primary[800],
          }}
        >
          {/* Toggle button when collapsed - adjust marginTop to control Y position */}
          {isCollapsed && (
            <MenuItem
              onClick={() => setIsCollapsed(!isCollapsed)}
              icon={<HomeOutlinedIcon />}
              style={{
                marginTop: "40px",
                marginBottom: "50px",
                color: colors.primary[800],
              }}
            />
          )}

          {/* Spacer to push menu items below the logo */}
          {!isCollapsed && <Box sx={{ height: "160px" }} />}

          {/* Menu Items */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
            }}
          >
            <Item
              title="Dashboard"
              to="/"
              icon={<DashboardIcon />}
              selected={selected}
              setSelected={setSelected}
            />
          </Box>
        </Menu>
      </ProSidebar>
    </Box>
  );
};

export default Sidebar;
