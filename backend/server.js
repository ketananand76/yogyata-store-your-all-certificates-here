require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('mongo-sanitize');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Import controllers & middleware
const { login, logout, getMe } = require('./controllers/authController');
const {
  getCertificates,
  getCertificateById,
  createCertificate,
  updateCertificate,
  deleteCertificate,
} = require('./controllers/certificateController');
const { protect } = require('./middleware/authMiddleware');
const { loginLimiter } = require('./middleware/rateLimiter');
const { validateLogin, validateCertificate } = require('./utils/validations');
const upload = require('./config/upload');

// Initialize DB Connection
connectDB();

const app = express();

// Trust Render's proxy for express-rate-limit
app.set('trust proxy', 1);

// Security and utility middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Essential for allowing frontend to load local /uploads images
  })
);

const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// NoSQL Query Injection Sanitizer
app.use((req, res, next) => {
  req.body = mongoSanitize(req.body);
  req.query = mongoSanitize(req.query);
  req.params = mongoSanitize(req.params);
  next();
});

// Import new controllers
const {
  registerUser,
  loginUser,
  logoutUser,
  getMe: getMeUser,
  getUserCertificates,
  uploadUserCertificate,
  deleteUserCertificate,
} = require('./controllers/userPortalController');
const { getUsersAndCertificates } = require('./controllers/adminMonitorController');
const { protectUser } = require('./middleware/authMiddleware');

// Serve local static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
// 1. Admin Auth routes
app.post('/api/auth/login', loginLimiter, validateLogin, login);
app.post('/api/auth/logout', logout);
app.get('/api/auth/me', protect, getMe);

// 2. User Portal Auth & Vault routes
app.post('/api/users/register', registerUser);
app.post('/api/users/login', loginUser);
app.post('/api/users/logout', logoutUser);
app.get('/api/users/me', protectUser, getMeUser);
app.get('/api/users/certificates', protectUser, getUserCertificates);
app.post('/api/users/certificates', protectUser, upload.single('file'), validateCertificate, uploadUserCertificate);
app.delete('/api/users/certificates/:id', protectUser, deleteUserCertificate);

// 3. Admin Monitoring routes
app.get('/api/admin/users-monitor', protect, getUsersAndCertificates);

// 4. Certificate public routes
app.get('/api/certificates', getCertificates);
app.get('/api/certificates/:id', getCertificateById);

// 5. Certificate protected admin routes
app.post('/api/certificates', protect, upload.single('file'), validateCertificate, createCertificate);
app.put('/api/certificates/:id', protect, upload.single('file'), (req, res, next) => {
  next();
}, validateCertificate, updateCertificate);
app.delete('/api/certificates/:id', protect, deleteCertificate);

// Centralized error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
