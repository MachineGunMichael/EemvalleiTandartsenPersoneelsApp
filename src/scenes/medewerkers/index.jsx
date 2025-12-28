import { Box, Typography, useTheme } from "@mui/material";
import { tokens } from "../../theme";

const Medewerkers = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box m="20px" mt="-76px">
      <Typography variant="h2" color={colors.primary[800]} fontWeight="bold">
        Medewerkers
      </Typography>
      <Typography variant="h5" color={colors.taupeAccent[500]}>
        Overzicht van alle medewerkers
      </Typography>
    </Box>
  );
};

export default Medewerkers;

