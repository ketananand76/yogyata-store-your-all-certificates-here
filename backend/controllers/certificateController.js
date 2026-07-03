const fs = require('fs');
const path = require('path');
const Certificate = require('../models/Certificate');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

// GET /api/certificates
const getCertificates = async (req, res, next) => {
  try {
    const { category, search, featured, sortBy, page = 1, limit = 12 } = req.query;

    const query = { uploadedBy: null };

    if (category && category !== 'All') {
      query.category = category;
    }

    if (featured !== undefined) {
      query.featured = featured === 'true';
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { issuer: { $regex: search, $options: 'i' } },
      ];
    }

    // Sort options
    let sortOptions = { order: 1, dateIssued: -1 }; // default
    if (sortBy === 'dateIssued_asc') {
      sortOptions = { dateIssued: 1 };
    } else if (sortBy === 'dateIssued_desc') {
      sortOptions = { dateIssued: -1 };
    } else if (sortBy === 'order_asc') {
      sortOptions = { order: 1 };
    } else if (sortBy === 'order_desc') {
      sortOptions = { order: -1 };
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 12;
    const skipNum = (pageNum - 1) * limitNum;

    const totalCertificates = await Certificate.countDocuments(query);
    const certificates = await Certificate.find(query)
      .sort(sortOptions)
      .skip(skipNum)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: certificates.length,
      totalPages: Math.ceil(totalCertificates / limitNum),
      currentPage: pageNum,
      totalCount: totalCertificates,
      certificates,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/certificates/:id
const getCertificateById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const certificate = await Certificate.findById(id);

    if (!certificate) {
      res.status(404);
      throw new Error('Certificate not found');
    }

    // Security segregation: if user-owned, verify requester is the owner or admin
    if (certificate.uploadedBy) {
      const jwt = require('jsonwebtoken');
      const Admin = require('../models/Admin');
      const token = req.cookies.token;
      let isAuthorized = false;

      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey123');
          
          // Check if admin token
          const isAdminExists = await Admin.findById(decoded.id);
          if (isAdminExists) {
            isAuthorized = true;
          } else if (String(certificate.uploadedBy) === String(decoded.id)) {
            // Check if standard user owner token
            isAuthorized = true;
          }
        } catch (err) {
          // invalid token
        }
      }

      if (!isAuthorized) {
        res.status(403);
        throw new Error('Forbidden: You do not have permission to view this certificate');
      }
    }

    res.status(200).json({
      success: true,
      certificate,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/certificates
const createCertificate = async (req, res, next) => {
  try {
    const { title, issuer, dateIssued, category, description, verifyUrl, featured, order } = req.body;

    if (!req.file) {
      res.status(400);
      throw new Error('Certificate file upload is required');
    }

    let fileUrl = '';
    let filePublicId = '';
    const fileType = req.file.mimetype.includes('pdf') ? 'pdf' : 'image';

    const cloudinaryResult = await uploadToCloudinary(req.file.path);
    if (cloudinaryResult) {
      fileUrl = cloudinaryResult.url;
      filePublicId = cloudinaryResult.publicId;
    } else {
      // Fallback: serve local static file relative to root/uploads
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
      featured: featured === 'true' || featured === true,
      order: order ? Number(order) : 0,
    });

    res.status(201).json({
      success: true,
      certificate,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/certificates/:id
const updateCertificate = async (req, res, next) => {
  try {
    const { id } = req.params;
    let certificate = await Certificate.findById(id);

    if (!certificate) {
      res.status(404);
      throw new Error('Certificate not found');
    }

    const { title, issuer, dateIssued, category, description, verifyUrl, featured, order } = req.body;

    const updatedData = {
      title: title !== undefined ? title : certificate.title,
      issuer: issuer !== undefined ? issuer : certificate.issuer,
      dateIssued: dateIssued !== undefined ? dateIssued : certificate.dateIssued,
      category: category !== undefined ? category : certificate.category,
      description: description !== undefined ? description : certificate.description,
      verifyUrl: verifyUrl !== undefined ? verifyUrl : certificate.verifyUrl,
      featured: featured !== undefined ? (featured === 'true' || featured === true) : certificate.featured,
      order: order !== undefined ? Number(order) : certificate.order,
    };

    if (req.file) {
      // Clean up previous file
      if (certificate.filePublicId) {
        await deleteFromCloudinary(certificate.filePublicId);
      } else {
        const oldFileName = path.basename(certificate.fileUrl);
        const oldFilePath = path.join(__dirname, '../uploads', oldFileName);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      // Upload new file
      let fileUrl = '';
      let filePublicId = '';
      const fileType = req.file.mimetype.includes('pdf') ? 'pdf' : 'image';

      const cloudinaryResult = await uploadToCloudinary(req.file.path);
      if (cloudinaryResult) {
        fileUrl = cloudinaryResult.url;
        filePublicId = cloudinaryResult.publicId;
      } else {
        const filename = req.file.filename;
        fileUrl = `/uploads/${filename}`;
      }

      updatedData.fileUrl = fileUrl;
      updatedData.filePublicId = filePublicId || null;
      updatedData.fileType = fileType;
    }

    const updatedCertificate = await Certificate.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      certificate: updatedCertificate,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/certificates/:id
const deleteCertificate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const certificate = await Certificate.findById(id);

    if (!certificate) {
      res.status(404);
      throw new Error('Certificate not found');
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
      message: 'Certificate deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCertificates,
  getCertificateById,
  createCertificate,
  updateCertificate,
  deleteCertificate,
};
