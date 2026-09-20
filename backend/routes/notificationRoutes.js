const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const Student = require('../models/Student');

// Get notifications for a user
router.get('/:firebaseUid', async (req, res) => {
  try {
    const student = await Student.findOne({ firebaseUid: req.params.firebaseUid });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const notifications = await Notification.find({ student: student._id }).sort({ createdAt: -1 }).limit(20);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching notifications' });
  }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: 'Server error updating notification' });
  }
});

// Mark all as read
router.put('/markAllRead/:firebaseUid', async (req, res) => {
  try {
    const student = await Student.findOne({ firebaseUid: req.params.firebaseUid });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    await Notification.updateMany({ student: student._id, isRead: false }, { isRead: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error updating notifications' });
  }
});

module.exports = router;
