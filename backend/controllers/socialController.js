const User = require('../models/User');
const Certificate = require('../models/Certificate');
const bcrypt = require('bcryptjs');
const { uploadToCloudinary } = require('../config/cloudinary');

const toggleFollow = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user.id;

    if (String(targetUserId) === String(currentUserId)) {
      res.status(400);
      throw new Error('You cannot follow yourself');
    }

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser || !currentUser) {
      res.status(404);
      throw new Error('User not found');
    }

    // Safety: check using string-based match to avoid Mongoose gotchas
    const isFollowing = currentUser.following.some(id => String(id) === String(targetUserId));

    if (isFollowing) {
      // Unfollow (Atomic pulls to prevent duplicate array mismatching)
      await User.findByIdAndUpdate(currentUserId, { $pull: { following: targetUserId } });
      await User.findByIdAndUpdate(targetUserId, { $pull: { followers: currentUserId } });
    } else {
      // Follow (Atomic addToSet to guarantee single entry uniqueness)
      await User.findByIdAndUpdate(currentUserId, { $addToSet: { following: targetUserId } });
      await User.findByIdAndUpdate(targetUserId, { $addToSet: { followers: currentUserId } });

      // Trigger follow notification
      const { createNotification } = require('./notificationController');
      await createNotification(req.app, {
        recipient: targetUserId,
        sender: currentUserId,
        type: 'follow',
        message: `${currentUser.name} started following you.`,
        relatedId: currentUserId,
      });
    }

    res.status(200).json({
      success: true,
      isFollowing: !isFollowing,
      message: isFollowing ? 'Unfollowed successfully' : 'Followed successfully',
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/social/search
const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(200).json({ success: true, users: [] });
    }

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user.id } },
        {
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } },
          ],
        },
      ],
    })
      .select('name email profilePicture bio followers following')
      .limit(20);

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/social/like/:id
const toggleLikeCertificate = async (req, res, next) => {
  try {
    const certId = req.params.id;
    const userId = req.user.id;

    const certificate = await Certificate.findById(certId);
    if (!certificate) {
      res.status(404);
      throw new Error('Certificate not found');
    }

    const isLiked = certificate.likes.includes(userId);

    if (isLiked) {
      // Unlike
      certificate.likes = certificate.likes.filter(id => String(id) !== String(userId));
    } else {
      // Like
      certificate.likes.push(userId);

      // Trigger like notification
      if (certificate.uploadedBy && String(certificate.uploadedBy) !== String(userId)) {
        const { createNotification } = require('./notificationController');
        const User = require('../models/User');
        const senderUser = await User.findById(userId);
        await createNotification(req.app, {
          recipient: certificate.uploadedBy,
          sender: userId,
          type: 'like',
          message: `${senderUser?.name || 'A user'} liked your certificate: "${certificate.title}"`,
          relatedId: certificate._id,
        });
      }
    }

    await certificate.save();

    res.status(200).json({
      success: true,
      isLiked: !isLiked,
      likesCount: certificate.likes.length,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/social/comment/:id
const addComment = async (req, res, next) => {
  try {
    const certId = req.params.id;
    const userId = req.user.id;
    const { text } = req.body;

    if (!text || !text.trim()) {
      res.status(400);
      throw new Error('Comment text is required');
    }

    const certificate = await Certificate.findById(certId);
    if (!certificate) {
      res.status(404);
      throw new Error('Certificate not found');
    }

    const user = await User.findById(userId);

    const newComment = {
      user: userId,
      userName: user.name,
      userProfilePicture: user.profilePicture || '',
      text: text.trim(),
      createdAt: new Date(),
    };

    certificate.comments.push(newComment);
    await certificate.save();

    // Trigger comment notification
    if (certificate.uploadedBy && String(certificate.uploadedBy) !== String(userId)) {
      const { createNotification } = require('./notificationController');
      await createNotification(req.app, {
        recipient: certificate.uploadedBy,
        sender: userId,
        type: 'comment',
        message: `${user.name} commented on your certificate: "${text.trim().slice(0, 45)}"`,
        relatedId: certificate._id,
      });
    }

    res.status(201).json({
      success: true,
      comment: certificate.comments[certificate.comments.length - 1],
      comments: certificate.comments,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/social/comment/:certId/:commentId
const deleteComment = async (req, res, next) => {
  try {
    const { certId, commentId } = req.params;
    const userId = req.user.id;

    const certificate = await Certificate.findById(certId);
    if (!certificate) {
      res.status(404);
      throw new Error('Certificate not found');
    }

    const comment = certificate.comments.id(commentId);
    if (!comment) {
      res.status(404);
      throw new Error('Comment not found');
    }

    // Allow deletion if requester is comment author OR certificate owner
    if (String(comment.user) !== String(userId) && String(certificate.uploadedBy) !== String(userId)) {
      res.status(403);
      throw new Error('Not authorized to delete this comment');
    }

    certificate.comments = certificate.comments.filter(c => String(c._id) !== String(commentId));
    await certificate.save();

    res.status(200).json({
      success: true,
      comments: certificate.comments,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/social/profile
const updateAdvancedProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, bio, gender, privateAccount, website, github, linkedin, skills, password, experience, education, resumeUrl } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    // Photo / Resume upload handling (Cloudinary or local disk fallback)
    if (req.file) {
      const cloudinaryResult = await uploadToCloudinary(req.file.path);
      const isPdf = req.file.mimetype.includes('pdf') || req.file.originalname.toLowerCase().endsWith('.pdf');
      
      let fileUrl = '';
      if (cloudinaryResult) {
        fileUrl = cloudinaryResult.url;
      } else {
        fileUrl = `/uploads/${req.file.filename}`;
      }

      if (isPdf || req.body.isResume === 'true') {
        user.resumeUrl = fileUrl;
      } else {
        user.profilePicture = fileUrl;
      }
    }

    // Name & basic settings
    user.name = name !== undefined ? name : user.name;
    user.bio = bio !== undefined ? bio : user.bio;
    user.gender = gender !== undefined ? gender : user.gender;
    user.privateAccount = privateAccount !== undefined ? privateAccount === 'true' || privateAccount === true : user.privateAccount;
    user.resumeUrl = resumeUrl !== undefined ? resumeUrl : user.resumeUrl;

    // Links update
    if (user.links) {
      user.links.website = website !== undefined ? website : user.links.website;
      user.links.github = github !== undefined ? github : user.links.github;
      user.links.linkedin = linkedin !== undefined ? linkedin : user.links.linkedin;
    } else {
      user.links = {
        website: website || '',
        github: github || '',
        linkedin: linkedin || '',
      };
    }

    // Skills array update
    if (skills !== undefined) {
      user.skills = Array.isArray(skills) ? skills : JSON.parse(skills || '[]');
    }

    // Experience array update
    if (experience !== undefined) {
      user.experience = Array.isArray(experience) ? experience : JSON.parse(experience || '[]');
    }

    // Education array update
    if (education !== undefined) {
      user.education = Array.isArray(education) ? education : JSON.parse(education || '[]');
    }

    // Password change
    if (password && password.trim()) {
      const salt = await bcrypt.genSalt(12);
      user.passwordHash = await bcrypt.hash(password, salt);
    }

    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        bio: updatedUser.bio,
        profilePicture: updatedUser.profilePicture,
        gender: updatedUser.gender,
        privateAccount: updatedUser.privateAccount,
        links: updatedUser.links,
        skills: updatedUser.skills,
        followers: updatedUser.followers,
        following: updatedUser.following,
        role: updatedUser.role,
        resumeUrl: updatedUser.resumeUrl,
        experience: updatedUser.experience,
        education: updatedUser.education,
      },
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/social/profile (Delete account)
const deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    const userName = user.name;
    const userEmail = user.email;

    // Delete user's certificates
    await Certificate.deleteMany({ uploadedBy: userId });

    // Delete the user document
    await User.findByIdAndDelete(userId);

    // Send email to admin
    try {
      const sendEmail = require('../utils/sendEmail');
      await sendEmail({
        to: 'ketanpaswan53@gmail.com',
        subject: 'User Profile Deleted',
        text: `The user ${userName} (${userEmail}) has deleted their profile.`,
        html: `<p>The user <strong>${userName}</strong> (${userEmail}) has deleted their profile.</p>`
      });
    } catch (err) {
      console.error('Failed to notify admin on user deletion:', err);
    }

    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    }).status(200).json({
      success: true,
      message: 'Account and associated certificates deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const query = req.user ? { _id: { $ne: req.user.id } } : {};
    const users = await User.find(query).select('name email profilePicture bio followers following').sort({ name: 1 });
    res.status(200).json({ success: true, users });
  } catch (error) {
    next(error);
  }
};

const getUserProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id)
      .select('-passwordHash')
      .populate('followers', 'name email profilePicture bio')
      .populate('following', 'name email profilePicture bio');
    if (!user) {
      res.status(404);
      throw new Error('User profile not found');
    }

    // Check if the current user is the owner or an admin
    let showAll = false;
    const jwt = require('jsonwebtoken');
    const Admin = require('../models/Admin');
    const token = req.cookies.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey123');
        if (decoded.id === String(user._id)) {
          showAll = true;
        } else {
          const adminExists = await Admin.findById(decoded.id);
          if (adminExists) {
            showAll = true;
          }
        }
      } catch (err) {}
    }

    // Alternate request context fallback
    if (!showAll && req.user && String(req.user.id) === String(user._id)) {
      showAll = true;
    }

    const certQuery = { uploadedBy: user._id };
    if (!showAll) {
      certQuery.status = 'approved';
    }

    const certificates = await Certificate.find(certQuery).sort({ order: 1, dateIssued: -1 });
    res.status(200).json({ success: true, user, certificates });
  } catch (error) {
    next(error);
  }
};

const blockUserAndAlert = async (userId, reason) => {
  try {
    const Alert = require('../models/Alert');
    const user = await User.findById(userId);
    if (user) {
      user.status = 'blocked';
      await user.save();

      const alert = await Alert.create({
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        reason: reason,
      });
      return alert;
    }
  } catch (err) {
    console.error('Failed to auto-block user:', err);
  }
  return null;
};

const reportAbusiveLanguage = async (req, res, next) => {
  try {
    const alert = await blockUserAndAlert(req.user.id, req.body.reason || 'Abusive word usage detected during WebRTC call session.');
    
    res.status(200).json({
      success: true,
      message: 'Violation recorded. Your account has been automatically blocked.',
      alert,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  toggleFollow,
  searchUsers,
  toggleLikeCertificate,
  addComment,
  deleteComment,
  updateAdvancedProfile,
  deleteAccount,
  getAllUsers,
  getUserProfile,
  blockUserAndAlert,
  reportAbusiveLanguage,
};
