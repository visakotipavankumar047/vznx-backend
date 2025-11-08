const router = require('express').Router();
const Project = require('../models/project.model');
const Task = require('../models/task.model');
const TeamMember = require('../models/teamMember.model');

const formatProject = (project, taskSummaryMap) => {
  const summary = taskSummaryMap.get(project._id.toString()) || {
    total: 0,
    completed: 0,
  };

  return {
    ...project,
    taskSummary: summary,
  };
};

router.get('/', async (req, res) => {
  try {
    const projects = await Project.find().populate('projectLead').sort({ createdAt: -1 }).lean();
    const taskSummary = await Task.aggregate([
      {
        $group: {
          _id: '$project',
          total: { $sum: 1 },
          completed: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Complete'] }, 1, 0],
            },
          },
        },
      },
    ]);

    const summaryMap = new Map();
    taskSummary.forEach((item) => {
      if (!item?._id) {
        return;
      }
      summaryMap.set(item._id.toString(), {
        total: item.total,
        completed: item.completed,
      });
    });

    res.json(projects.map((project) => formatProject(project, summaryMap)));
  } catch (error) {
    console.error('Failed to fetch projects', error);
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
});

router.post('/', async (req, res) => {
  try {
    const payload = req.body;
    if (!payload.name) {
      return res.status(400).json({ message: 'Project name is required' });
    }
    const project = new Project({
      name: payload.name,
      status: payload.status || 'Planned',
      progress: payload.progress ?? 0,
      studio: payload.studio,
      dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
      notes: payload.notes,
      color: payload.color || '#2563eb',
      projectLead: payload.projectLead || null,
    });

    const saved = await project.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error('Failed to create project', error);
    res.status(400).json({ message: 'Failed to create project', error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate('projectLead').lean();
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const totalTasks = await Task.countDocuments({ project: project._id });
    const completedTasks = await Task.countDocuments({ project: project._id, status: 'Complete' });

    res.json({
      ...project,
      taskSummary: { total: totalTasks, completed: completedTasks },
    });
  } catch (error) {
    console.error('Failed to fetch project', error);
    res.status(500).json({ message: 'Failed to fetch project' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Invalid project ID' });
    }
    const payload = req.body;
    const progress = payload.progress ?? undefined;
    const update = {};

    ['name', 'status', 'studio', 'notes', 'color'].forEach((key) => {
      if (payload[key] !== undefined) {
        update[key] = payload[key];
      }
    });

    if (payload.projectLead !== undefined) {
      update.projectLead = payload.projectLead === '' ? null : payload.projectLead;
    }

    if (payload.dueDate !== undefined) {
      update.dueDate = payload.dueDate ? new Date(payload.dueDate) : null;
    }
    if (typeof progress === 'number') {
      update.progress = Math.min(100, Math.max(0, progress));
      if (update.progress === 100) {
        update.status = 'Completed';
      } else if (update.progress === 0 && !update.status) {
        update.status = 'Planned';
      }
    }

    const updated = await Project.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    }).populate('projectLead');

    if (!updated) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Failed to update project', error);
    res.status(400).json({ message: 'Failed to update project', error: error.message });
  }
});

router.patch('/:id/progress', async (req, res) => {
  try {
    const parsed = Number(req.body.progress);
    if (Number.isNaN(parsed)) {
      return res.status(400).json({ message: 'Invalid progress value' });
    }
    const progress = Math.min(100, Math.max(0, parsed));
    const status =
      progress === 100 ? 'Completed' : progress === 0 ? 'Planned' : 'In Progress';
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { progress, status },
      { new: true, runValidators: true },
    );

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Failed to update project progress', error);
    res.status(400).json({ message: 'Failed to update project progress' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Project.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const projectTasks = await Task.find({ project: req.params.id }).select('_id');
    const taskIds = projectTasks.map((task) => task._id);
    await Task.deleteMany({ _id: { $in: taskIds } });
    if (taskIds.length > 0) {
      await TeamMember.updateMany(
        { tasks: { $in: taskIds } },
        { $pull: { tasks: { $in: taskIds } } },
      );
    }

    res.json({ message: 'Project deleted' });
  } catch (error) {
    console.error('Failed to delete project', error);
    res.status(500).json({ message: 'Failed to delete project' });
  }
});

module.exports = router;
