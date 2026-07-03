const Job = require('../models/Job');
const User = require('../models/User');
const { createNotification } = require('./notificationController');

// GET /api/jobs
const getJobs = async (req, res, next) => {
  try {
    const { search, type, location } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (type && type !== 'All') {
      query.type = type;
    }

    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    const jobs = await Job.find(query)
      .populate('postedBy', 'name email profilePicture')
      .populate('applicants', 'name email profilePicture bio')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      jobs,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/jobs
const createJob = async (req, res, next) => {
  try {
    const { title, company, location, type, description, salary, skillsRequired } = req.body;

    if (!title || !company || !location || !description) {
      res.status(400);
      throw new Error('Required fields: title, company, location, description');
    }

    const skillsArray = Array.isArray(skillsRequired) 
      ? skillsRequired 
      : skillsRequired 
        ? skillsRequired.split(',').map(s => s.trim()) 
        : [];

    const job = await Job.create({
      title,
      company,
      location,
      type: type || 'Full-time',
      description,
      salary: salary || '',
      skillsRequired: skillsArray,
      postedBy: req.user.id,
    });

    const populatedJob = await Job.findById(job._id).populate('postedBy', 'name email profilePicture');

    res.status(201).json({
      success: true,
      job: populatedJob,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/jobs/:id/apply
const applyJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      res.status(404);
      throw new Error('Job not found');
    }

    if (String(job.postedBy) === String(req.user.id)) {
      res.status(400);
      throw new Error('You cannot apply for your own job posting');
    }

    const alreadyApplied = job.applicants.includes(req.user.id);
    if (alreadyApplied) {
      res.status(400);
      throw new Error('You have already applied for this job');
    }

    job.applicants.push(req.user.id);
    await job.save();

    // Trigger notification to job poster
    try {
      const applicantUser = await User.findById(req.user.id);
      await createNotification(req.app, {
        recipient: job.postedBy,
        sender: req.user.id,
        type: 'apply',
        message: `${applicantUser.name} applied for your job: "${job.title}" at ${job.company}`,
        relatedId: job._id,
      });
    } catch (err) {
      console.error('Failed to trigger job application notification:', err);
    }

    const updatedJob = await Job.findById(job._id)
      .populate('postedBy', 'name email profilePicture')
      .populate('applicants', 'name email profilePicture bio');

    res.status(200).json({
      success: true,
      message: 'Applied successfully',
      job: updatedJob,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/jobs/:id
const deleteJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      res.status(404);
      throw new Error('Job not found');
    }

    if (String(job.postedBy) !== String(req.user.id)) {
      res.status(403);
      throw new Error('Unauthorized: You can only delete jobs you posted');
    }

    await Job.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Job posting deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getJobs,
  createJob,
  applyJob,
  deleteJob,
};
