import { Box, Typography, useTheme } from "@mui/material";
import { tokens } from "../../theme";

const Instellingen = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box m="20px" mt="-76px">
      <Typography variant="h2" color={colors.primary[800]} fontWeight="bold">
        Instellingen
      </Typography>
      <Typography variant="h5" color={colors.taupeAccent[500]}>
        Beheer applicatie instellingen
      </Typography>
    </Box>
  );
};

export default Instellingen;

