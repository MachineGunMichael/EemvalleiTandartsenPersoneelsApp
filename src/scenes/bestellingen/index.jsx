import { useState, useEffect } from "react";
import API_BASE_URL from "../../config/api";
import {
  Box,
  Typography,
  useTheme,
  TextField,
  Button,
  IconButton,
  Paper,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ClearAllOutlinedIcon from "@mui/icons-material/ClearAllOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import { tokens } from "../../theme";
import { useAuth } from "../../context/AuthContext";

const Bestellingen = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isDarkMode = theme.palette.mode === "dark";
  const { user } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState("");
  const [adding, setAdding] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const canClearList = user?.role === "admin" || user?.role === "manager";

  // Input field styling
  const inputStyles = {
    "& .MuiOutlinedInput-root": {
      color: isDarkMode ? colors.primary[900] : colors.primary[800],
      "& fieldset": {
        borderColor: colors.taupeAccent[300],
      },
      "&:hover fieldset": {
        borderColor: colors.taupeAccent[500],
      },
      "&.Mui-focused fieldset": {
        borderColor: colors.taupeAccent[500],
      },
    },
    "& .MuiInputLabel-root": {
      color: isDarkMode ? colors.primary[600] : colors.primary[600],
      "&.Mui-focused": {
        color: colors.taupeAccent[600],
      },
    },
  };

  // Fetch order items
  const fetchItems = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders`);
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Add item
  const handleAddItem = async () => {
    if (!newItem.trim()) return;

    setAdding(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_text: newItem.trim(),
          added_by: user.id,
        }),
      });

      if (response.ok) {
        setNewItem("");
        fetchItems();
      }
    } catch (error) {
      console.error("Error adding item:", error);
    } finally {
      setAdding(false);
    }
  };

  // Delete single item
  const handleDeleteItem = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchItems();
      }
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  // Clear all items
  const handleClearAll = async () => {
    setClearing(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/orders?role=${user.role}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        setClearDialogOpen(false);
        fetchItems();
      }
    } catch (error) {
      console.error("Error clearing items:", error);
    } finally {
      setClearing(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !adding) {
      handleAddItem();
    }
  };

  return (
    <Box m="20px" mt="-76px" height="calc(100vh - 100px)">
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h2" color={colors.primary[800]} fontWeight="bold">
          Bestellingen
        </Typography>
        <Typography variant="h5" color={colors.taupeAccent[500]}>
          Bestellijst voor praktijkbenodigdheden
        </Typography>
      </Box>

      {/* Main Content */}
      <Paper
        elevation={0}
        sx={{
          backgroundColor: isDarkMode ? colors.primary[200] : colors.primary[100],
          borderRadius: "16px",
          overflow: "hidden",
          height: "calc(100% - 80px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header with Add Input */}
        <Box
          sx={{
            p: 2,
            borderBottom: `1px solid ${isDarkMode ? colors.primary[300] : colors.taupeAccent[200]}`,
          }}
        >
          <Box display="flex" gap={2} alignItems="center">
            <TextField
              fullWidth
              placeholder="Voeg een item toe..."
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={adding}
              sx={{
                ...inputStyles,
                "& .MuiOutlinedInput-root": {
                  ...inputStyles["& .MuiOutlinedInput-root"],
                  borderRadius: "12px",
                  backgroundColor: isDarkMode ? colors.primary[300] : "#fff",
                },
              }}
              InputProps={{
                endAdornment: (
                  <Button
                    variant="contained"
                    onClick={handleAddItem}
                    disabled={!newItem.trim() || adding}
                    sx={{
                      minWidth: "auto",
                      px: 3,
                      py: 1.2,
                      borderRadius: "10px",
                      backgroundColor: colors.taupeAccent[500],
                      color: "#fff",
                      fontWeight: 600,
                      textTransform: "none",
                      "&:hover": {
                        backgroundColor: colors.taupeAccent[600],
                      },
                      "&:disabled": {
                        backgroundColor: colors.taupeAccent[300],
                        color: "#fff",
                      },
                    }}
                    startIcon={
                      adding ? (
                        <CircularProgress size={18} sx={{ color: "#fff" }} />
                      ) : (
                        <AddOutlinedIcon />
                      )
                    }
                  >
                    Toevoegen
                  </Button>
                ),
              }}
            />
          </Box>

          {/* List Stats & Clear Button */}
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mt={2}
          >
            <Typography variant="body2" color={colors.taupeAccent[500]}>
              {items.length} item{items.length !== 1 ? "s" : ""} op de lijst
            </Typography>
            {canClearList && items.length > 0 && (
              <Button
                variant="outlined"
                size="small"
                onClick={() => setClearDialogOpen(true)}
                startIcon={<ClearAllOutlinedIcon />}
                sx={{
                  borderColor: colors.redAccent[400],
                  color: colors.redAccent[500],
                  textTransform: "none",
                  borderRadius: "8px",
                  "&:hover": {
                    borderColor: colors.redAccent[500],
                    backgroundColor: isDarkMode
                      ? colors.redAccent[800]
                      : colors.redAccent[100],
                  },
                }}
              >
                Lijst legen
              </Button>
            )}
          </Box>
        </Box>

        {/* Items List */}
        <Box
          sx={{
            flex: 1,
            overflow: "auto",
            p: 2,
          }}
        >
          {loading ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              height="200px"
            >
              <CircularProgress sx={{ color: colors.taupeAccent[500] }} />
            </Box>
          ) : items.length === 0 ? (
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              height="300px"
              sx={{ opacity: 0.6 }}
            >
              <ShoppingCartOutlinedIcon
                sx={{ fontSize: 80, color: colors.taupeAccent[400], mb: 2 }}
              />
              <Typography variant="h5" color={colors.primary[700]} mb={1}>
                De bestellijst is leeg
              </Typography>
              <Typography variant="body2" color={colors.taupeAccent[500]}>
                Voeg items toe die besteld moeten worden
              </Typography>
            </Box>
          ) : (
            <Box display="flex" flexDirection="column" gap={1}>
              {items.map((item, index) => (
                <Box
                  key={item.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 2,
                    borderRadius: "12px",
                    backgroundColor: isDarkMode
                      ? colors.primary[300]
                      : index % 2 === 0
                      ? "#fff"
                      : colors.taupeAccent[50],
                    border: `1px solid ${
                      isDarkMode ? colors.primary[400] : colors.taupeAccent[200]
                    }`,
                    transition: "all 0.2s ease",
                    "&:hover": {
                      backgroundColor: isDarkMode
                        ? colors.primary[400]
                        : colors.taupeAccent[100],
                    },
                  }}
                >
                  {/* Item Number */}
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "8px",
                      backgroundColor: isDarkMode
                        ? colors.taupeAccent[600]
                        : colors.taupeAccent[200],
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Typography
                      variant="body2"
                      fontWeight="600"
                      color={
                        isDarkMode
                          ? colors.taupeAccent[100]
                          : colors.taupeAccent[700]
                      }
                    >
                      {index + 1}
                    </Typography>
                  </Box>

                  {/* Item Text */}
                  <Box flex={1}>
                    <Typography
                      fontWeight="500"
                      color={colors.primary[800]}
                      sx={{ wordBreak: "break-word" }}
                    >
                      {item.item_text}
                    </Typography>
                    <Typography variant="caption" color={colors.taupeAccent[500]}>
                      Toegevoegd door {item.added_by_name} •{" "}
                      {formatDate(item.created_at)}
                    </Typography>
                  </Box>

                  {/* Delete Button */}
                  <Tooltip title="Verwijderen">
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteItem(item.id)}
                      sx={{
                        color: colors.redAccent[500],
                        "&:hover": {
                          backgroundColor: isDarkMode
                            ? colors.redAccent[800]
                            : colors.redAccent[100],
                        },
                      }}
                    >
                      <DeleteOutlineOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Paper>

      {/* Clear All Confirmation Dialog */}
      <Dialog
        open={clearDialogOpen}
        onClose={() => !clearing && setClearDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: "16px",
            backgroundColor: isDarkMode ? colors.primary[200] : colors.primary[100],
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, color: colors.redAccent[500] }}>
          Lijst legen
        </DialogTitle>
        <DialogContent>
          <Typography color={colors.primary[800]}>
            Weet je zeker dat je alle {items.length} items wilt verwijderen?
          </Typography>
          <Typography variant="body2" color={colors.taupeAccent[500]} mt={1}>
            Deze actie kan niet ongedaan worden gemaakt.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0 }}>
          <Button
            onClick={() => setClearDialogOpen(false)}
            disabled={clearing}
            sx={{
              color: isDarkMode ? colors.primary[900] : colors.primary[700],
              "&:hover": {
                backgroundColor: isDarkMode
                  ? colors.primary[300]
                  : colors.taupeAccent[100],
              },
            }}
          >
            Annuleren
          </Button>
          <Button
            variant="contained"
            onClick={handleClearAll}
            disabled={clearing}
            sx={{
              backgroundColor: colors.redAccent[500],
              color: "#fff",
              borderRadius: "10px",
              px: 3,
              "&:hover": {
                backgroundColor: colors.redAccent[600],
              },
            }}
          >
            {clearing ? (
              <CircularProgress size={20} sx={{ color: "#fff" }} />
            ) : (
              "Lijst legen"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Bestellingen;

