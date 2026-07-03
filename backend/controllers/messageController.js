const mongoose = require('mongoose');
const Message = require('../models/Message');

// GET /api/messages/:userId
const getChatMessages = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, recipient: userId },
        { sender: userId, recipient: currentUserId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/messages/:userId/read
const markAsRead = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // Mark messages sent by userId to currentUserId as read
    await Message.updateMany(
      { sender: userId, recipient: currentUserId, read: false },
      { $set: { read: true, delivered: true } }
    );

    // Emit read notification to the sender
    const io = req.app.get('socketio');
    if (io) {
      io.to(String(userId)).emit('messages-read', { recipientId: currentUserId });
    }

    res.status(200).json({
      success: true,
      message: 'Messages marked as read',
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/messages/unread/counts
const getUnreadCounts = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized, please log in' });
    }

    const currentUserId = req.user.id;
    if (!mongoose.Types.ObjectId.isValid(currentUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid user session identification' });
    }

    // Aggregate counts of unread messages sent to currentUserId, grouped by sender
    const unreadList = await Message.aggregate([
      { $match: { recipient: new mongoose.Types.ObjectId(currentUserId), read: false } },
      { $group: { _id: '$sender', count: { $sum: 1 } } }
    ]);

    // Format as mapping object: senderId -> count
    const counts = {};
    unreadList.forEach(item => {
      counts[item._id.toString()] = item.count;
    });

    res.status(200).json({
      success: true,
      counts,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getChatMessages,
  markAsRead,
  getUnreadCounts,
};
