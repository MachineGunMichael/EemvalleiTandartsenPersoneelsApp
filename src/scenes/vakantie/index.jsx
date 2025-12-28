import { Box, Typography, useTheme } from "@mui/material";
import { tokens } from "../../theme";

const Vakantie = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box m="20px" mt="-76px">
      <Typography variant="h2" color={colors.primary[800]} fontWeight="bold">
        Vakantie
      </Typography>
      <Typography variant="h5" color={colors.tealAccent[500]}>
        Beheer vakantiedagen en aanvragen
      </Typography>
    </Box>
  );
};

export default Vakantie;

