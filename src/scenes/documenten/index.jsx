import { useState, useEffect } from "react";
import API_BASE_URL from "../../config/api";
import {
  Box,
  Typography,
  useTheme,
  Button,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tooltip,
  Paper,
} from "@mui/material";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import { tokens } from "../../theme";
import { useAuth } from "../../context/AuthContext";

const Documenten = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isDarkMode = theme.palette.mode === "dark";
  const { user } = useAuth();
  
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadDisplayName, setUploadDisplayName] = useState("");
  const [uploading, setUploading] = useState(false);

  const canManage = user?.role === "admin" || user?.role === "manager";

  // Input field styling - matching Medewerkers page
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

  // Fetch documents
  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Handle file upload
  const handleUpload = async () => {
    if (!uploadFile || !uploadDisplayName.trim()) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("document", uploadFile);
    formData.append("display_name", uploadDisplayName.trim());
    formData.append("uploaded_by", user.id);

    try {
      const response = await fetch(`${API_BASE_URL}/api/documents`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setUploadDialogOpen(false);
        setUploadFile(null);
        setUploadDisplayName("");
        fetchDocuments();
      }
    } catch (error) {
      console.error("Error uploading document:", error);
    } finally {
      setUploading(false);
    }
  };

  // Handle rename
  const handleRename = async () => {
    if (!editingDocument || !newDisplayName.trim()) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/documents/${editingDocument.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ display_name: newDisplayName.trim() }),
        }
      );

      if (response.ok) {
        setEditDialogOpen(false);
        setEditingDocument(null);
        setNewDisplayName("");
        fetchDocuments();
        if (selectedDocument?.id === editingDocument.id) {
          setSelectedDocument({ ...selectedDocument, display_name: newDisplayName.trim() });
        }
      }
    } catch (error) {
      console.error("Error renaming document:", error);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!editingDocument) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/documents/${editingDocument.id}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        setDeleteDialogOpen(false);
        if (selectedDocument?.id === editingDocument.id) {
          setSelectedDocument(null);
        }
        setEditingDocument(null);
        fetchDocuments();
      }
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Box m="20px" mt="-76px" height="calc(100vh - 100px)">
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h2" color={colors.primary[800]} fontWeight="bold">
          Documenten
        </Typography>
        <Typography variant="h5" color={colors.taupeAccent[500]}>
          Richtlijnen en Protocollen
        </Typography>
      </Box>

      {/* Main Content */}
      <Box
        display="flex"
        gap={3}
        height="calc(100% - 80px)"
        sx={{ minHeight: 0 }}
      >
        {/* Document List */}
        <Paper
          elevation={0}
          sx={{
            width: selectedDocument ? "40%" : "100%",
            backgroundColor: isDarkMode ? colors.primary[200] : colors.primary[100],
            borderRadius: "16px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            transition: "width 0.3s ease",
          }}
        >
          <Box
            sx={{
              p: 2.5,
              borderBottom: `1px solid ${isDarkMode ? colors.primary[300] : colors.taupeAccent[200]}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              minHeight: "76px", // Consistent height regardless of button
            }}
          >
            <Box>
              <Typography
                variant="h5"
                fontWeight="600"
                color={colors.primary[800]}
              >
                Alle Documenten
              </Typography>
              <Typography variant="body2" color={colors.taupeAccent[500]}>
                {documents.length} document{documents.length !== 1 ? "en" : ""}
              </Typography>
            </Box>
            {canManage && (
              <Button
                variant="contained"
                startIcon={<UploadFileOutlinedIcon />}
                onClick={() => setUploadDialogOpen(true)}
                sx={{
                  backgroundColor: colors.taupeAccent[500],
                  color: "#fff",
                  fontWeight: 600,
                  px: 2.5,
                  py: 1,
                  borderRadius: "10px",
                  textTransform: "none",
                  "&:hover": {
                    backgroundColor: colors.taupeAccent[600],
                  },
                }}
              >
                Document Uploaden
              </Button>
            )}
          </Box>

          <Box
            sx={{
              flex: 1,
              overflow: "auto",
              p: 2,
            }}
          >
            {loading ? (
              <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                <CircularProgress sx={{ color: colors.taupeAccent[500] }} />
              </Box>
            ) : documents.length === 0 ? (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                height="200px"
                sx={{ opacity: 0.6 }}
              >
                <DescriptionOutlinedIcon
                  sx={{ fontSize: 64, color: colors.taupeAccent[400], mb: 2 }}
                />
                <Typography color={colors.primary[700]}>
                  Geen documenten gevonden
                </Typography>
                {canManage && (
                  <Typography variant="body2" color={colors.taupeAccent[500]}>
                    Upload uw eerste document
                  </Typography>
                )}
              </Box>
            ) : (
              <Box display="flex" flexDirection="column" gap={1.5}>
                {documents.map((doc) => (
                  <Box
                    key={doc.id}
                    onClick={() => setSelectedDocument(doc)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      p: 2,
                      borderRadius: "12px",
                      cursor: "pointer",
                      backgroundColor:
                        selectedDocument?.id === doc.id
                          ? isDarkMode
                            ? colors.taupeAccent[600]
                            : colors.taupeAccent[200]
                          : "transparent",
                      border: `1px solid ${
                        selectedDocument?.id === doc.id
                          ? colors.taupeAccent[400]
                          : "transparent"
                      }`,
                      transition: "all 0.2s ease",
                      "&:hover": {
                        backgroundColor: isDarkMode
                          ? colors.primary[300]
                          : colors.taupeAccent[100],
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: "10px",
                        backgroundColor: isDarkMode
                          ? colors.redAccent[700]
                          : colors.redAccent[100],
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <PictureAsPdfOutlinedIcon
                        sx={{
                          color: isDarkMode
                            ? colors.redAccent[200]
                            : colors.redAccent[500],
                          fontSize: 26,
                        }}
                      />
                    </Box>
                    <Box flex={1} minWidth={0}>
                      <Typography
                        fontWeight="600"
                        color={colors.primary[800]}
                        sx={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {doc.display_name}
                      </Typography>
                      <Typography variant="body2" color={colors.taupeAccent[500]}>
                        {formatFileSize(doc.size)} • {formatDate(doc.created_at)}
                      </Typography>
                    </Box>
                    {canManage && (
                      <Box display="flex" gap={0.5}>
                        <Tooltip title="Hernoemen">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingDocument(doc);
                              setNewDisplayName(doc.display_name);
                              setEditDialogOpen(true);
                            }}
                            sx={{
                              color: colors.taupeAccent[500],
                              "&:hover": {
                                backgroundColor: isDarkMode
                                  ? colors.primary[400]
                                  : colors.taupeAccent[200],
                              },
                            }}
                          >
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Verwijderen">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingDocument(doc);
                              setDeleteDialogOpen(true);
                            }}
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
                    )}
                    {/* Spacer to keep consistent layout when icons are hidden */}
                    {!canManage && <Box sx={{ width: 72 }} />}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Paper>

        {/* PDF Preview Pane */}
        {selectedDocument && (
          <Paper
            elevation={0}
            sx={{
              flex: 1,
              backgroundColor: isDarkMode ? colors.primary[200] : colors.primary[100],
              borderRadius: "16px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Preview Header */}
            <Box
              sx={{
                p: 2.5,
                borderBottom: `1px solid ${isDarkMode ? colors.primary[300] : colors.taupeAccent[200]}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box>
                <Typography
                  variant="h5"
                  fontWeight="600"
                  color={colors.primary[800]}
                >
                  {selectedDocument.display_name}
                </Typography>
                <Typography variant="body2" color={colors.taupeAccent[500]}>
                  Geüpload door {selectedDocument.uploaded_by_name} •{" "}
                  {formatDate(selectedDocument.created_at)}
                </Typography>
              </Box>
              <IconButton
                onClick={() => setSelectedDocument(null)}
                sx={{
                  color: colors.primary[700],
                  "&:hover": {
                    backgroundColor: isDarkMode
                      ? colors.primary[300]
                      : colors.taupeAccent[200],
                  },
                }}
              >
                <CloseOutlinedIcon />
              </IconButton>
            </Box>

            {/* PDF Viewer */}
            <Box
              sx={{
                flex: 1,
                p: 2,
                backgroundColor: isDarkMode ? colors.primary[300] : "#e8e4df",
                minHeight: "500px",
              }}
            >
              <iframe
                src={`${API_BASE_URL}/api/documents/${selectedDocument.id}/file#toolbar=1&navpanes=0`}
                title={selectedDocument.display_name}
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  borderRadius: "8px",
                  backgroundColor: "#fff",
                  minHeight: "480px",
                }}
              />
            </Box>
          </Paper>
        )}
      </Box>

      {/* Upload Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => !uploading && setUploadDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "16px",
            backgroundColor: isDarkMode ? colors.primary[200] : colors.primary[100],
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, color: colors.primary[800] }}>
          Document Uploaden
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2.5} mt={1}>
            <TextField
              label="Documentnaam"
              value={uploadDisplayName}
              onChange={(e) => setUploadDisplayName(e.target.value)}
              fullWidth
              placeholder="Bijv. Protocol Infectiepreventie"
              sx={inputStyles}
            />
            <Box
              component="label"
              htmlFor="document-file-input"
              sx={{
                border: `2px dashed ${colors.taupeAccent[400]}`,
                borderRadius: "12px",
                p: 4,
                textAlign: "center",
                backgroundColor: isDarkMode ? colors.primary[300] : colors.taupeAccent[50],
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "block",
                "&:hover": {
                  borderColor: colors.taupeAccent[500],
                  backgroundColor: isDarkMode
                    ? colors.primary[400]
                    : colors.taupeAccent[100],
                },
              }}
            >
              <input
                id="document-file-input"
                type="file"
                accept=".pdf,application/pdf"
                style={{ 
                  position: "absolute",
                  width: "1px",
                  height: "1px",
                  padding: 0,
                  margin: "-1px",
                  overflow: "hidden",
                  clip: "rect(0, 0, 0, 0)",
                  whiteSpace: "nowrap",
                  border: 0
                }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setUploadFile(file);
                    if (!uploadDisplayName) {
                      setUploadDisplayName(file.name.replace(/\.pdf$/i, ""));
                    }
                  }
                  // Reset input so same file can be selected again
                  e.target.value = "";
                }}
              />
              {uploadFile ? (
                <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                  <PictureAsPdfOutlinedIcon sx={{ color: colors.redAccent[500] }} />
                  <Typography color={colors.primary[800]} fontWeight="500">
                    {uploadFile.name}
                  </Typography>
                </Box>
              ) : (
                <>
                  <UploadFileOutlinedIcon
                    sx={{ fontSize: 40, color: colors.taupeAccent[400], mb: 1 }}
                  />
                  <Typography color={colors.primary[700]}>
                    Klik om een PDF te selecteren
                  </Typography>
                  <Typography variant="body2" color={colors.taupeAccent[500]}>
                    Maximaal 50 MB
                  </Typography>
                </>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0 }}>
          <Button
            onClick={() => {
              setUploadDialogOpen(false);
              setUploadFile(null);
              setUploadDisplayName("");
            }}
            disabled={uploading}
            sx={{ 
              color: isDarkMode ? colors.primary[900] : colors.primary[700],
              "&:hover": {
                backgroundColor: isDarkMode ? colors.primary[300] : colors.taupeAccent[100],
              },
            }}
          >
            Annuleren
          </Button>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={!uploadFile || !uploadDisplayName.trim() || uploading}
            sx={{
              backgroundColor: colors.taupeAccent[500],
              color: "#fff",
              borderRadius: "10px",
              px: 3,
              "&:hover": {
                backgroundColor: colors.taupeAccent[700],
              },
              "&:disabled": {
                backgroundColor: colors.taupeAccent[300],
              },
            }}
          >
            {uploading ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "Uploaden"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "16px",
            backgroundColor: isDarkMode ? colors.primary[200] : colors.primary[100],
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, color: colors.primary[800] }}>
          Document Hernoemen
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Nieuwe naam"
            value={newDisplayName}
            onChange={(e) => setNewDisplayName(e.target.value)}
            fullWidth
            autoFocus
            sx={{ mt: 1, ...inputStyles }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0 }}>
          <Button 
            onClick={() => setEditDialogOpen(false)} 
            sx={{ 
              color: isDarkMode ? colors.primary[900] : colors.primary[700],
              "&:hover": {
                backgroundColor: isDarkMode ? colors.primary[300] : colors.taupeAccent[100],
              },
            }}
          >
            Annuleren
          </Button>
          <Button
            variant="contained"
            onClick={handleRename}
            disabled={!newDisplayName.trim()}
            sx={{
              backgroundColor: colors.taupeAccent[500],
              color: "#fff",
              borderRadius: "10px",
              px: 3,
              "&:hover": {
                backgroundColor: colors.taupeAccent[600],
              },
            }}
          >
            Opslaan
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: "16px",
            backgroundColor: isDarkMode ? colors.primary[200] : colors.primary[100],
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, color: colors.redAccent[500] }}>
          Document Verwijderen
        </DialogTitle>
        <DialogContent>
          <Typography color={colors.primary[800]}>
            Weet u zeker dat u "{editingDocument?.display_name}" wilt verwijderen?
          </Typography>
          <Typography variant="body2" color={colors.taupeAccent[500]} mt={1}>
            Deze actie kan niet ongedaan worden gemaakt.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0 }}>
          <Button 
            onClick={() => setDeleteDialogOpen(false)} 
            sx={{ 
              color: isDarkMode ? colors.primary[900] : colors.primary[700],
              "&:hover": {
                backgroundColor: isDarkMode ? colors.primary[300] : colors.taupeAccent[100],
              },
            }}
          >
            Annuleren
          </Button>
          <Button
            variant="contained"
            onClick={handleDelete}
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
            Verwijderen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Documenten;
