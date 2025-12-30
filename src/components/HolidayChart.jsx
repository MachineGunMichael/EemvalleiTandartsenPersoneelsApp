import { useMemo, useState, useEffect } from "react";
import { Box, Typography, useTheme, Select, MenuItem, FormControl } from "@mui/material";
import { ResponsiveLine } from "@nivo/line";
import { tokens } from "../theme";

const HolidayChart = ({ holidayTransactions, title = "Vakantie-uren Verloop" }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isDarkMode = theme.palette.mode === "dark";

  // Get available years from transactions
  const availableYears = useMemo(() => {
    if (!holidayTransactions || !holidayTransactions.length) return [new Date().getFullYear()];
    const years = new Set();
    holidayTransactions.forEach((t) => {
      const year = new Date(t.transaction_date).getFullYear();
      years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a); // Most recent first
  }, [holidayTransactions]);

  const [selectedYear, setSelectedYear] = useState(availableYears[0] || new Date().getFullYear());

  // Keep selectedYear in sync with availableYears
  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      // If current selection is not valid, reset to most recent year
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  // Table colors for container styling
  const tableColors = {
    cells: {
      text: isDarkMode ? colors.primary[900] : colors.primary[800],
    },
    container: {
      background: isDarkMode ? colors.primary[200] : colors.primary[100],
    },
  };

  // Chart theme
  const chartTheme = {
    axis: {
      ticks: {
        text: {
          fill: isDarkMode ? colors.primary[800] : colors.primary[700],
          fontSize: 11,
        },
      },
      legend: {
        text: {
          fill: isDarkMode ? colors.primary[800] : colors.primary[700],
          fontSize: 12,
        },
      },
    },
    grid: {
      line: {
        stroke: isDarkMode ? colors.primary[300] : colors.primary[200],
        strokeWidth: 1,
      },
    },
    crosshair: {
      line: {
        stroke: colors.taupeAccent[500],
        strokeWidth: 1,
      },
    },
  };

  // Fixed tick dates for the selected year (as Date objects for time scale)
  const fixedTickDates = useMemo(() => {
    return [
      new Date(`${selectedYear}-01-01`), // 1 Jan
      new Date(`${selectedYear}-04-01`), // 1 Apr
      new Date(`${selectedYear}-07-01`), // 1 Jul
      new Date(`${selectedYear}-10-01`), // 1 Oct
      new Date(`${selectedYear}-12-31`), // 31 Dec
    ];
  }, [selectedYear]);

  // Format date for display (short format for axis)
  const formatAxisLabel = (value) => {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    const day = date.getDate();
    const monthNames = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
    return `${day} ${monthNames[date.getMonth()]}`;
  };

  // Format date for tooltip
  const formatTimeLabel = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Build chart data from transactions, filtered by selected year (using Date objects for time scale)
  const chartData = useMemo(() => {
    if (!holidayTransactions || !holidayTransactions.length) return [];

    const sorted = [...holidayTransactions].sort(
      (a, b) => new Date(a.transaction_date) - new Date(b.transaction_date)
    );

    // Find the last balance before the selected year starts
    const yearStart = new Date(`${selectedYear}-01-01`);
    const yearEnd = new Date(`${selectedYear}-12-31`);
    
    let startingBalance = 0;
    let hasDataBeforeYear = false;
    
    for (const t of sorted) {
      const tDate = new Date(t.transaction_date);
      if (tDate < yearStart) {
        startingBalance = t.balance_after;
        hasDataBeforeYear = true;
      }
    }

    const dataPoints = [];
    
    // Add starting point at Jan 1 if we have data from before
    if (hasDataBeforeYear) {
      dataPoints.push({
        x: new Date(`${selectedYear}-01-01`),
        y: startingBalance,
        description: "Startsaldo",
      });
    }

    // Filter and add transactions for the selected year
    sorted.forEach((t, idx) => {
      const tDate = new Date(t.transaction_date);
      if (tDate >= yearStart && tDate <= yearEnd) {
        if (t.type === "used" && idx > 0) {
          const prevBalance = sorted[idx - 1].balance_after;
          dataPoints.push({
            x: tDate,
            y: prevBalance,
            description: t.description,
          });
        }
        dataPoints.push({
          x: tDate,
          y: t.balance_after,
          description: t.description,
        });
      }
    });

    // Add ending point at Dec 31 if we have data
    if (dataPoints.length > 0) {
      const lastPoint = dataPoints[dataPoints.length - 1];
      const dec31 = new Date(`${selectedYear}-12-31`);
      if (lastPoint.x < dec31) {
        dataPoints.push({
          x: dec31,
          y: lastPoint.y,
          description: "Eindsaldo",
        });
      }
    }

    if (dataPoints.length === 0) return [];

    return [
      {
        id: "Vakantie-uren",
        color: colors.taupeAccent[500],
        data: dataPoints,
      },
    ];
  }, [holidayTransactions, colors.taupeAccent, selectedYear]);

  // Don't render if no data
  if (!chartData.length || !chartData[0].data.length) {
    return (
      <Box
        sx={{
          backgroundColor: tableColors.container.background,
          p: 3,
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
          height: 350,
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h5" fontWeight="600" color={tableColors.cells.text}>
            {title}
          </Typography>
          <FormControl size="small">
            <Select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              sx={{
                minWidth: 100,
                backgroundColor: isDarkMode ? colors.primary[300] : colors.primary[50],
                color: tableColors.cells.text,
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: colors.taupeAccent[400],
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: colors.taupeAccent[500],
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: colors.taupeAccent[500],
                },
                "& .MuiSvgIcon-root": {
                  color: tableColors.cells.text,
                },
              }}
            >
              {availableYears.map((year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: 240 }}>
          <Typography color={tableColors.cells.text}>Geen data voor {selectedYear}</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        backgroundColor: tableColors.container.background,
        p: 3,
        borderRadius: "12px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
        height: 350,
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h5" fontWeight="600" color={tableColors.cells.text}>
          {title}
        </Typography>
        <FormControl size="small">
          <Select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            sx={{
              minWidth: 100,
              backgroundColor: isDarkMode ? colors.primary[300] : colors.primary[50],
              color: tableColors.cells.text,
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: colors.taupeAccent[400],
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: colors.taupeAccent[500],
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: colors.taupeAccent[500],
              },
              "& .MuiSvgIcon-root": {
                color: tableColors.cells.text,
              },
            }}
          >
            {availableYears.map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Box sx={{ height: 280 }}>
        <ResponsiveLine
          data={chartData}
          margin={{ top: 10, right: 30, bottom: 50, left: 40 }}
          xScale={{
            type: "time",
            format: "native",
            min: new Date(`${selectedYear}-01-01`),
            max: new Date(`${selectedYear}-12-31`),
          }}
          xFormat="time:%d-%m-%Y"
          yScale={{ type: "linear", min: 0, max: "auto" }}
          curve="stepAfter"
          enableArea={true}
          areaOpacity={0.15}
          colors={[colors.taupeAccent[500]]}
          lineWidth={2}
          pointSize={6}
          pointColor={colors.taupeAccent[500]}
          pointBorderWidth={2}
          pointBorderColor={{ from: "serieColor" }}
          useMesh={true}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            format: (value) => formatAxisLabel(value),
            tickRotation: 0,
            tickSize: 5,
            tickPadding: 5,
            tickValues: fixedTickDates,
          }}
          axisLeft={{
            tickValues: 5,
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: "Uren",
            legendOffset: -35,
            legendPosition: "middle",
          }}
          theme={chartTheme}
          enableGridX={false}
          enableGridY={false}
          tooltip={({ point }) => {
            if (!point) return null;
            return (
              <Box
                sx={{
                  background: isDarkMode ? colors.primary[400] : colors.primary[100],
                  padding: "12px 16px",
                  borderRadius: "4px",
                  border: `1px solid ${colors.taupeAccent[500]}`,
                  minWidth: "260px",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ color: isDarkMode ? "#eee" : "#111", fontWeight: "bold", mb: 0.5 }}
                >
                  Vakantie-uren
                </Typography>
                <Typography variant="body2" sx={{ color: isDarkMode ? "#eee" : "#111" }}>
                  Datum: {formatTimeLabel(point.data.x)}
                </Typography>
                <Typography variant="body2" sx={{ color: isDarkMode ? "#eee" : "#111" }}>
                  Saldo: {Number(point.data.y).toFixed(1)} uur
                </Typography>
                {point.data.description && (
                  <Typography variant="body2" sx={{ color: isDarkMode ? "#eee" : "#111" }}>
                    Beschrijving: {point.data.description}
                  </Typography>
                )}
              </Box>
            );
          }}
        />
      </Box>
    </Box>
  );
};

export default HolidayChart;

