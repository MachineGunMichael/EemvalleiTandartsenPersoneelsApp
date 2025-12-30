import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useTheme,
} from "@mui/material";
import { tokens } from "../theme";

const OvertimeOverviewTable = ({ overtimeData, title = "Overuren Overzicht", titleVariant = "h4", showMarginBottom = false }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isDarkMode = theme.palette.mode === "dark";

  // Table color configuration - identical to HolidayOverviewTable
  const tableColors = {
    header: {
      background: isDarkMode ? colors.taupeAccent[600] : colors.taupeAccent[200],
      text: isDarkMode ? colors.primary[900] : colors.primary[900],
    },
    cells: {
      backgroundOdd: isDarkMode ? colors.primary[400] : colors.primary[100],
      backgroundEven: isDarkMode ? colors.primary[400] : colors.primary[100],
      backgroundHover: isDarkMode ? colors.taupeAccent[800] : colors.taupeAccent[100],
      text: isDarkMode ? colors.primary[900] : colors.primary[800],
    },
    container: {
      background: isDarkMode ? colors.primary[200] : colors.primary[100],
    },
  };

  return (
    <Box sx={{ mb: showMarginBottom ? 4 : 0 }}>
      <Typography variant={titleVariant} fontWeight="600" color={tableColors.cells.text} mb={3}>
        {title}
      </Typography>

      <TableContainer
        component={Paper}
        sx={{
          backgroundColor: "transparent",
          borderRadius: "12px",
          boxShadow: "none",
          overflow: "hidden",
          border: `1px solid ${isDarkMode ? colors.primary[300] : colors.taupeAccent[200]}`,
        }}
      >
        <Table>
          <TableHead>
            <TableRow
              sx={{
                backgroundColor: tableColors.header.background,
                "& th:first-of-type": { pl: 3 },
                "& th": {
                  fontWeight: "bold",
                  color: tableColors.header.text,
                  fontSize: "14px",
                  borderBottom: `2px solid ${colors.taupeAccent[300]}`,
                  py: 2.5,
                },
              }}
            >
              <TableCell>Jaar</TableCell>
              <TableCell>Opgebouwd</TableCell>
              <TableCell>Omgezet</TableCell>
              <TableCell>Uitbetaald</TableCell>
              <TableCell>Beschikbaar</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {overtimeData && overtimeData.length > 0 ? (
              overtimeData.map((row, idx) => (
                <TableRow
                  key={row.id || row.year || idx}
                  sx={{
                    "&:nth-of-type(odd)": { backgroundColor: tableColors.cells.backgroundOdd },
                    "&:nth-of-type(even)": { backgroundColor: tableColors.cells.backgroundEven },
                    "&:hover": { backgroundColor: tableColors.cells.backgroundHover },
                    "& td": {
                      borderBottom: `1px solid ${colors.primary[200]}`,
                      py: 2,
                      color: tableColors.cells.text,
                    },
                    "& td:first-of-type": { pl: 3 },
                    "&:last-of-type td": { borderBottom: "none" },
                  }}
                >
                  <TableCell>{row.year}</TableCell>
                  <TableCell>{row.total_hours || 0} uur</TableCell>
                  <TableCell>{row.converted_hours || 0} uur</TableCell>
                  <TableCell>{row.paid_hours || 0} uur</TableCell>
                  <TableCell>
                    <Typography fontWeight="600" component="span">
                      {((row.total_hours || 0) - (row.converted_hours || 0) - (row.paid_hours || 0)).toFixed(1)} uur
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} sx={{ textAlign: "center", py: 4 }}>
                  Geen overuren geregistreerd
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default OvertimeOverviewTable;
