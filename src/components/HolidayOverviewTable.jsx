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

const HolidayOverviewTable = ({ holidayData, title = "Vakantie-uren Overzicht", titleVariant = "h4", showMarginBottom = false }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isDarkMode = theme.palette.mode === "dark";

  // Table color configuration
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
          overflowX: "auto",
          border: `1px solid ${isDarkMode ? colors.primary[300] : colors.taupeAccent[200]}`,
        }}
      >
        <Table sx={{ minWidth: 450 }}>
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
              <TableCell>Beschikbaar</TableCell>
              <TableCell>Gebruikt</TableCell>
              <TableCell>Resterend</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {holidayData.map((holiday, idx) => (
              <TableRow
                key={holiday.id || holiday.year || idx}
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
                <TableCell>{holiday.year}</TableCell>
                <TableCell>{holiday.available_hours} uur</TableCell>
                <TableCell>{holiday.used_hours} uur</TableCell>
                <TableCell>
                  <Typography fontWeight="600" component="span">
                    {(holiday.available_hours - holiday.used_hours).toFixed(1)} uur
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
            {holidayData.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} sx={{ textAlign: "center", py: 4 }}>
                  Geen vakantie-uren gegevens gevonden
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default HolidayOverviewTable;
