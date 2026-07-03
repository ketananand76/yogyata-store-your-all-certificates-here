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
  verifyUser,
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
  reportAbusiveLanguage,
} = require('./controllers/socialController');
const { getChatMessages, markAsRead, getUnreadCounts } = require('./controllers/messageController');
const { getNotifications, markAllAsRead } = require('./controllers/notificationController');
const { 
  getUsersAndCertificates, approveCertificate, rejectCertificate, 
  getAdminAlerts, deleteAlert, unblockUser 
} = require('./controllers/adminMonitorController');
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
app.get('/api/users/verify/:token', verifyUser);
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
app.post('/api/social/report-abusive', protectUser, reportAbusiveLanguage);

// 4. Message / Chat routes
app.get('/api/messages/unread/counts', protectUser, getUnreadCounts);
app.get('/api/messages/:userId', protectUser, getChatMessages);
app.put('/api/messages/:userId/read', protectUser, markAsRead);
app.get('/api/notifications', protectUser, getNotifications);
app.put('/api/notifications/read', protectUser, markAllAsRead);
app.post('/api/messages/upload', protectUser, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const { uploadToCloudinary } = require('./config/cloudinary');
    const cloudinaryResult = await uploadToCloudinary(req.file.path);
    let fileUrl = '';
    if (cloudinaryResult) {
      fileUrl = cloudinaryResult.url;
    } else {
      fileUrl = `/uploads/${req.file.filename}`;
    }
    res.status(200).json({ success: true, fileUrl });
  } catch (error) {
    next(error);
  }
});

// 5. Admin Monitoring routes
app.get('/api/admin/users-monitor', protect, getUsersAndCertificates);
app.put('/api/admin/certificates/:id/approve', protect, approveCertificate);
app.put('/api/admin/certificates/:id/reject', protect, rejectCertificate);
app.get('/api/admin/alerts', protect, getAdminAlerts);
app.delete('/api/admin/alerts/:id', protect, deleteAlert);
app.put('/api/admin/users/:userId/unblock', protect, unblockUser);

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
const pendingAdminAlerts = []; // Buffer for alerts when no admin is online

// Abusive Words list (Hindi, English, etc.)
const ABUSIVE_WORDS = [
  'fuck', 'shit', 'asshole', 'bitch', 'bastard', 'cunt', 'dick', 'pussy', 'slut', 'whore',
  'chutiya', 'madarchod', 'behenchod', 'gandu', 'bhosdike', 'harami', 'saala', 'kamina',
  'चूतिया', 'मादरचोद', 'बहनचोद', 'गांडू', 'भोसड़ीके', 'हरामी', 'साला', 'कमीना'
];

const checkAbusiveText = (text) => {
  if (!text) return false;
  // Remove basic punctuation and check words
  const words = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").split(/\s+/);
  return words.some(word => ABUSIVE_WORDS.includes(word) || ABUSIVE_WORDS.some(bad => word.includes(bad)));
};

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

  socket.on('register-admin', () => {
    socket.join('admin');
    console.log(`[Socket] Admin registered in admin room: ${socket.id}`);
    // Flush any buffered alerts that were created before admin connected
    if (pendingAdminAlerts.length > 0) {
      pendingAdminAlerts.forEach(alert => {
        socket.emit('admin-alert-created', alert);
      });
      console.log(`[Socket] Flushed ${pendingAdminAlerts.length} pending alert(s) to admin`);
      pendingAdminAlerts.length = 0; // clear buffer
    }
  });

  socket.on('send-message', async ({ senderId, recipientId, content, messageType, fileUrl }) => {
    try {
      // Abusive words moderation check
      if (messageType !== 'image' && checkAbusiveText(content)) {
        const { blockUserAndAlert } = require('./controllers/socialController');
        const alert = await blockUserAndAlert(senderId, `Automated block: Abusive word used in direct chat text: "${content}"`);
        
        // Notify sender of immediate block
        io.to(String(senderId)).emit('blocked-user', { 
          message: 'Your account has been automatically blocked for violating our abusive language policy.' 
        });
        
        // Notify admins of live alert (also buffer for late-connecting admins)
        if (alert) {
          const adminRoomSockets = io.sockets.adapter.rooms.get('admin');
          if (adminRoomSockets && adminRoomSockets.size > 0) {
            io.to('admin').emit('admin-alert-created', alert);
          } else {
            // No admin online yet — buffer the alert
            pendingAdminAlerts.push(alert);
            console.log(`[Alert] No admin online. Alert buffered for later delivery.`);
          }
        }
        return; // Reject message emission
      }

      const msg = await Message.create({
        sender: senderId,
        recipient: recipientId,
        content,
        messageType: messageType || 'text',
        fileUrl: fileUrl || '',
      });

      // Broadcast to both participants' rooms for multi-tab sync
      io.to(String(recipientId)).emit('receive-message', msg);
      io.to(String(senderId)).emit('receive-message', msg);
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });

  // Group Chats
  socket.on('join-group', (groupId) => {
    socket.join(groupId);
    console.log(`[Socket] User joined group room: ${groupId}`);
  });

  socket.on('send-group-message', async ({ senderId, senderName, groupId, content }) => {
    try {
      // Abusive words moderation check
      if (checkAbusiveText(content)) {
        const { blockUserAndAlert } = require('./controllers/socialController');
        const alert = await blockUserAndAlert(senderId, `Automated block: Abusive word used in group chat room "${groupId}": "${content}"`);
        
        // Notify sender of immediate block
        io.to(String(senderId)).emit('blocked-user', { 
          message: 'Your account has been automatically blocked for violating our abusive language policy.' 
        });
        
        // Notify admins of live alert (also buffer for late-connecting admins)
        if (alert) {
          const adminRoomSockets = io.sockets.adapter.rooms.get('admin');
          if (adminRoomSockets && adminRoomSockets.size > 0) {
            io.to('admin').emit('admin-alert-created', alert);
          } else {
            pendingAdminAlerts.push(alert);
            console.log(`[Alert] No admin online. Group alert buffered for later delivery.`);
          }
        }
        return; // Reject message emission
      }

      io.to(groupId).emit('receive-group-message', {
        senderId,
        senderName,
        groupId,
        content,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error handling group message:', err);
    }
  });

  // Typing indicators
  socket.on('typing', ({ senderId, recipientId, isTyping }) => {
    io.to(String(recipientId)).emit('incoming-typing', { senderId, isTyping });
  });

  // Message Reactions
  socket.on('react-message', async ({ messageId, userId, emoji }) => {
    try {
      const msg = await Message.findById(messageId);
      if (msg) {
        const existingReactionIndex = msg.reactions.findIndex(r => String(r.user) === String(userId));
        if (existingReactionIndex > -1) {
          if (msg.reactions[existingReactionIndex].emoji === emoji) {
            // Remove if same emoji is clicked
            msg.reactions.splice(existingReactionIndex, 1);
          } else {
            // Update to new emoji
            msg.reactions[existingReactionIndex].emoji = emoji;
          }
        } else {
          // Add new emoji reaction
          msg.reactions.push({ user: userId, emoji });
        }
        await msg.save();
        
        // Broadcast updated reactions list to sender and recipient rooms
        io.to(String(msg.sender)).to(String(msg.recipient)).emit('message-reaction-updated', {
          messageId: msg._id,
          reactions: msg.reactions,
        });
      }
    } catch (err) {
      console.error('Error reacting to message:', err);
    }
  });

  // Video/Audio signaling
  socket.on('call-user', ({ callerId, recipientId, signalData, type, callerName }) => {
    console.log(`[Calling] call-user: from ${callerId} (${callerName}) to recipient ${recipientId} (${type})`);
    io.to(String(recipientId)).emit('incoming-call', {
      callerId,
      callerName,
      signalData,
      type,
    });
  });

  socket.on('answer-call', ({ callerId, recipientId, signalData }) => {
    console.log(`[Calling] answer-call: from ${recipientId} to caller ${callerId}`);
    io.to(String(callerId)).emit('call-accepted', {
      recipientId,
      signalData,
    });
  });

  socket.on('ice-candidate', ({ targetId, candidate, senderId }) => {
    console.log(`[Calling] ice-candidate: from ${senderId} to target ${targetId}`);
    io.to(String(targetId)).emit('ice-candidate', {
      candidate,
      senderId,
    });
  });

  socket.on('end-call', ({ targetId, senderId }) => {
    console.log(`[Calling] end-call: from ${senderId} to target ${targetId}`);
    io.to(String(targetId)).emit('call-ended', { senderId });
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
