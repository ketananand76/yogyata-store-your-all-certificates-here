const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, please log in' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey123');
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Session expired, please log in again' });
  }
};

const protectUser = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, please log in' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey123');
    
    const User = require('../models/User');
    const userExists = await User.findById(decoded.id);
    if (!userExists) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    if (userExists.status === 'blocked') {
      res.clearCookie('token');
      return res.status(403).json({ success: false, message: 'Your account has been automatically blocked for violating moderation guidelines.' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Session expired, please log in again' });
  }
};

module.exports = { protect, protectUser };
