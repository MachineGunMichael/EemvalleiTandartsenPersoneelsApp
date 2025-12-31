// API Configuration
// In development, uses localhost:5001
// In production, uses empty string (same origin - frontend and backend served together)

const isDevelopment = process.env.NODE_ENV === 'development';
const API_BASE_URL = isDevelopment ? 'http://localhost:5001' : '';

export default API_BASE_URL;

