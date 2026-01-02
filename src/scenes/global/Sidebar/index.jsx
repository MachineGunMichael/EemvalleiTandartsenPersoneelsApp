import { useMediaQuery, useTheme } from "@mui/material";
import SidebarDesktop from "./SidebarDesktop";
import SidebarMobile from "./SidebarMobile";

/**
 * Responsive Sidebar Component
 * 
 * - Desktop (≥900px): Permanent sidebar with collapse functionality
 * - Mobile (<900px): Drawer that slides in from left, triggered by hamburger menu
 */
const Sidebar = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md")); // < 900px

  // Mobile: Render drawer (controlled by SidebarContext)
  // Desktop: Render permanent sidebar
  return isMobile ? <SidebarMobile /> : <SidebarDesktop />;
};

export default Sidebar;

