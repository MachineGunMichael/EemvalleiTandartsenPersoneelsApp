import { Box, Typography, useTheme } from "@mui/material";
import { tokens } from "../../theme";

const Dashboard = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box m="20px" mt="-76px">
      <Typography variant="h2" color={colors.primary[800]} fontWeight="bold">
        Dashboard
      </Typography>
      <Typography variant="h5" color={colors.taupeAccent[500]}>
        Welkom bij de Personeels App
      </Typography>
    </Box>
  );
};

export default Dashboard;

