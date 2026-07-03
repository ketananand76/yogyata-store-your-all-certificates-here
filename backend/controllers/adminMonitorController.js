const User = require('../models/User');
const Certificate = require('../models/Certificate');

// GET /api/admin/users-monitor (Admin protected endpoint)
const getUsersAndCertificates = async (req, res, next) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });

    const monitorData = await Promise.all(
      users.map(async (user) => {
        const userCertificates = await Certificate.find({ uploadedBy: user._id }).sort({ createdAt: -1 });
        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          certificateCount: userCertificates.length,
          certificates: userCertificates,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: monitorData.length,
      users: monitorData,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsersAndCertificates,
};
