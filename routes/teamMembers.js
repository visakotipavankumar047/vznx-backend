const router = require('express').Router();
const TeamMember = require('../models/teamMember.model');
const Task = require('../models/task.model');

router.get('/', async (req, res) => {
  try {
    const teamMembers = await TeamMember.find().populate({
      path: 'tasks',
      select: 'name status priority project',
      populate: { path: 'project', select: 'name color' },
    });

    res.json(teamMembers);
  } catch (error) {
    console.error('Failed to fetch team members', error);
    res.status(500).json({ message: 'Failed to fetch team members' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, role, capacity } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    const member = new TeamMember({ name, role, capacity });
    const saved = await member.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error('Failed to create team member', error);
    res.status(400).json({ message: 'Failed to create team member', error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const member = await TeamMember.findById(req.params.id).populate({
      path: 'tasks',
      populate: { path: 'project', select: 'name color' },
    });

    if (!member) {
      return res.status(404).json({ message: 'Team member not found' });
    }

    res.json(member);
  } catch (error) {
    console.error('Failed to fetch team member', error);
    res.status(500).json({ message: 'Failed to fetch team member' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const update = {};
    ['name', 'role', 'capacity'].forEach((key) => {
      if (req.body[key] !== undefined) {
        update[key] = req.body[key];
      }
    });

    const member = await TeamMember.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!member) {
      return res.status(404).json({ message: 'Team member not found' });
    }

    res.json(member);
  } catch (error) {
    console.error('Failed to update team member', error);
    res.status(400).json({ message: 'Failed to update team member' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const member = await TeamMember.findByIdAndDelete(req.params.id);
    if (!member) {
      return res.status(404).json({ message: 'Team member not found' });
    }

    await Task.updateMany({ assignee: req.params.id }, { $set: { assignee: null } });

    res.json({ message: 'Team member deleted' });
  } catch (error) {
    console.error('Failed to delete team member', error);
    res.status(500).json({ message: 'Failed to delete team member' });
  }
});

module.exports = router;
