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

const approveCertificate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const certificate = await Certificate.findById(id);

    if (!certificate) {
      res.status(404);
      throw new Error('Certificate not found');
    }

    certificate.status = 'approved';
    await certificate.save();

    // Socket update dispatch
    const io = req.app.get('socketio');
    if (io && certificate.uploadedBy) {
      io.to(String(certificate.uploadedBy)).emit('status-update', {
        id: certificate._id,
        title: certificate.title,
        status: 'approved',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Certificate approved successfully',
      certificate,
    });
  } catch (error) {
    next(error);
  }
};

const rejectCertificate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const certificate = await Certificate.findById(id);

    if (!certificate) {
      res.status(404);
      throw new Error('Certificate not found');
    }

    certificate.status = 'rejected';
    await certificate.save();

    // Socket update dispatch
    const io = req.app.get('socketio');
    if (io && certificate.uploadedBy) {
      io.to(String(certificate.uploadedBy)).emit('status-update', {
        id: certificate._id,
        title: certificate.title,
        status: 'rejected',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Certificate rejected successfully',
      certificate,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsersAndCertificates,
  approveCertificate,
  rejectCertificate,
};
