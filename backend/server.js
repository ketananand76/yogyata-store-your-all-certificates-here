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
const {
  toggleFollow,
  searchUsers,
  toggleLikeCertificate,
  addComment,
  deleteComment,
  updateAdvancedProfile,
  deleteAccount,
  getAllUsers,
  getUserProfile,
} = require('./controllers/socialController');
const { getChatMessages } = require('./controllers/messageController');
const { getUsersAndCertificates, approveCertificate, rejectCertificate } = require('./controllers/adminMonitorController');
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

// 3. Social Portal routes (Follows, Likes, Comments, Profiles, settings)
app.post('/api/social/follow/:id', protectUser, toggleFollow);
app.get('/api/social/search', protectUser, searchUsers);
app.post('/api/social/like/:id', protectUser, toggleLikeCertificate);
app.post('/api/social/comment/:id', protectUser, addComment);
app.delete('/api/social/comment/:certId/:commentId', protectUser, deleteComment);
app.put('/api/social/profile', protectUser, upload.single('file'), updateAdvancedProfile);
app.delete('/api/social/profile', protectUser, deleteAccount);
app.get('/api/social/users', protectUser, getAllUsers);
app.get('/api/social/profile/:id', protectUser, getUserProfile);

// 4. Message / Chat routes
app.get('/api/messages/:userId', protectUser, getChatMessages);

// 5. Admin Monitoring routes
app.get('/api/admin/users-monitor', protect, getUsersAndCertificates);
app.put('/api/admin/certificates/:id/approve', protect, approveCertificate);
app.put('/api/admin/certificates/:id/reject', protect, rejectCertificate);

// 6. Certificate public routes
app.get('/api/certificates', getCertificates);
app.get('/api/certificates/:id', getCertificateById);

// 7. Certificate protected admin routes
app.post('/api/certificates', protect, upload.single('file'), validateCertificate, createCertificate);
app.put('/api/certificates/:id', protect, upload.single('file'), (req, res, next) => {
  next();
}, validateCertificate, updateCertificate);
app.delete('/api/certificates/:id', protect, deleteCertificate);

// Centralized error handler
app.use(errorHandler);

// Wraps express in HTTP server to support Socket.io connections
const http = require('http');
const { Server } = require('socket.io');
const Message = require('./models/Message');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
    credentials: true,
  },
});

app.set('socketio', io);

// Sockets User Registry
const onlineUsers = {}; // socket.id -> userId
const userSockets = {}; // userId -> socket.id

io.on('connection', (socket) => {
  console.log('Socket client connected:', socket.id);

  socket.on('register-user', (userId) => {
    if (userId) {
      onlineUsers[socket.id] = userId;
      userSockets[userId] = socket.id;
      socket.join(String(userId)); // Join standard user room
      io.emit('online-users', Object.values(onlineUsers));
    }
  });

  socket.on('send-message', async ({ senderId, recipientId, content }) => {
    try {
      const msg = await Message.create({
        sender: senderId,
        recipient: recipientId,
        content,
      });

      const recipientSocketId = userSockets[recipientId];
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('receive-message', msg);
      }
      socket.emit('message-sent', msg);
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });

  // Video/Audio signaling
  socket.on('call-user', ({ callerId, recipientId, signalData, type, callerName }) => {
    const recipientSocketId = userSockets[recipientId];
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('incoming-call', {
        callerId,
        callerName,
        signalData,
        type,
      });
    }
  });

  socket.on('answer-call', ({ callerId, recipientId, signalData }) => {
    const callerSocketId = userSockets[callerId];
    if (callerSocketId) {
      io.to(callerSocketId).emit('call-accepted', {
        recipientId,
        signalData,
      });
    }
  });

  socket.on('ice-candidate', ({ targetId, candidate, senderId }) => {
    const targetSocketId = userSockets[targetId];
    if (targetSocketId) {
      io.to(targetSocketId).emit('ice-candidate', {
        candidate,
        senderId,
      });
    }
  });

  socket.on('end-call', ({ targetId, senderId }) => {
    const targetSocketId = userSockets[targetId];
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-ended', { senderId });
    }
  });

  socket.on('disconnect', () => {
    const userId = onlineUsers[socket.id];
    if (userId) {
      delete userSockets[userId];
      delete onlineUsers[socket.id];
      io.emit('online-users', Object.values(onlineUsers));
    }
    console.log('Socket client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
