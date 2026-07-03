const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Certificate = require('../models/Certificate');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

// JWT cookie helper
const setTokenCookie = (res, userId) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET || 'secretkey123', {
    expiresIn: '7d',
  });

  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// POST /api/users/register
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      throw new Error('Please fill in all fields (name, email, password)');
    }

    // Validate email format strictly at registration
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400);
      throw new Error('Please enter a valid email address');
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      throw new Error('An account already exists with this email');
    }

    // bcrypt cost factor 12+
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      passwordHash,
      isVerified: true, // Auto-verified
    });

    // Send notification email to admin
    try {
      const sendEmail = require('../utils/sendEmail');
      await sendEmail({
        to: 'ketanpaswan53@gmail.com',
        subject: 'New User Registered',
        text: `A new user has registered on Yogyata.\n\nName: ${user.name}\nEmail: ${user.email}`,
        html: `<p>A new user has registered on Yogyata.</p><p><strong>Name:</strong> ${user.name}<br><strong>Email:</strong> ${user.email}</p>`
      });
    } catch (err) {
      console.error('Failed to send registration notification to admin:', err);
    }

    // Automatically set token cookie to log the user in immediately
    setTokenCookie(res, user._id);

    res.status(201).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/users/login
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error('Please enter email and password');
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401);
      throw new Error('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401);
      throw new Error('Invalid email or password');
    }

    if (user.status === 'blocked') {
      res.status(403);
      throw new Error('Your account has been automatically blocked for violating moderation guidelines.');
    }

    setTokenCookie(res, user._id);

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/users/logout
const logoutUser = async (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  }).json({ success: true, message: 'Logged out successfully' });
};

// GET /api/users/me
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/certificates (Retrieve only self-uploaded certificates)
const getUserCertificates = async (req, res, next) => {
  try {
    const certificates = await Certificate.find({ uploadedBy: req.user.id }).sort({ order: 1, createdAt: -1 });
    res.status(200).json({
      success: true,
      count: certificates.length,
      certificates,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/users/certificates (Add certificate to personal vault)
const uploadUserCertificate = async (req, res, next) => {
  try {
    const { title, issuer, dateIssued, category, description, verifyUrl } = req.body;

    if (!title || !issuer || !dateIssued || !category) {
      res.status(400);
      throw new Error('Required fields: title, issuer, dateIssued, category');
    }

    if (!req.file) {
      res.status(400);
      throw new Error('Please upload a certificate document');
    }

    let fileUrl = '';
    let filePublicId = '';
    const fileType = req.file.mimetype.includes('pdf') ? 'pdf' : 'image';

    // Cloudinary or local fallback upload
    const cloudinaryResult = await uploadToCloudinary(req.file.path);
    if (cloudinaryResult) {
      fileUrl = cloudinaryResult.url;
      filePublicId = cloudinaryResult.publicId;
    } else {
      const filename = req.file.filename;
      fileUrl = `/uploads/${filename}`;
    }

    const certificate = await Certificate.create({
      title,
      issuer,
      dateIssued,
      category,
      description,
      verifyUrl,
      fileUrl,
      filePublicId: filePublicId || null,
      fileType,
      uploadedBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      certificate,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/users/certificates/:id (Securely delete personal certificate)
const deleteUserCertificate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const certificate = await Certificate.findById(id);

    if (!certificate) {
      res.status(404);
      throw new Error('Certificate not found');
    }

    // Security check: Verify that user owns this certificate
    if (!certificate.uploadedBy || certificate.uploadedBy.toString() !== req.user.id) {
      res.status(403);
      throw new Error('Forbidden: You can only delete your own certificates');
    }

    // Clean up file
    if (certificate.filePublicId) {
      await deleteFromCloudinary(certificate.filePublicId);
    } else {
      const filename = path.basename(certificate.fileUrl);
      const filePath = path.join(__dirname, '../uploads', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Certificate.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Certificate removed from vault',
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/verify/:token
const verifyUser = async (req, res, next) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (!user) {
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Verification link is invalid or has expired.')}`);
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.redirect(`${frontendUrl}/login?verified=true`);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  getUserCertificates,
  uploadUserCertificate,
  deleteUserCertificate,
  verifyUser,
};
