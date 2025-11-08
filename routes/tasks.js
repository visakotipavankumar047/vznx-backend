const router = require('express').Router();
const Task = require('../models/task.model');
const Project = require('../models/project.model');
const TeamMember = require('../models/teamMember.model');
const { syncProjectProgress } = require('../utils/progress');

router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find()
      .populate('project')
      .populate('assignee')
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    console.error('Failed to fetch tasks', error);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
});

router.get('/project/:projectId', async (req, res) => {
  try {
    const tasks = await Task.find({ project: req.params.projectId })
      .populate('assignee')
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    console.error('Failed to fetch project tasks', error);
    res.status(500).json({ message: 'Failed to fetch project tasks' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate(['project', 'assignee']);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Failed to fetch task', error);
    res.status(500).json({ message: 'Failed to fetch task' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, project, status, assigneeId, priority } = req.body;
    if (!title || !project) {
      return res.status(400).json({ message: 'Task title and project are required' });
    }
    const projectId = project;
    const projectDoc = await Project.findById(projectId);
    if (!projectDoc) {
      return res.status(404).json({ message: 'Project not found' });
    }
    if (assigneeId) {
      const assigneeExists = await TeamMember.exists({ _id: assigneeId });
      if (!assigneeExists) {
        return res.status(404).json({ message: 'Assignee not found' });
      }
    }

    const task = new Task({
      title,
      status: status || 'Pending',
      project: projectId,
      assignee: assigneeId || null,
      priority: priority || 'Medium',
    });

    const saved = await task.save();
    if (assigneeId) {
      await TeamMember.findByIdAndUpdate(assigneeId, { $addToSet: { tasks: saved._id } });
    }

    const syncedProject = await syncProjectProgress(projectId);
    const populatedTask = await saved.populate('assignee');

    res.status(201).json({ task: populatedTask, project: syncedProject });
  } catch (error) {
    console.error('Failed to create task', error);
    res.status(400).json({ message: 'Failed to create task', error: error.message });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.status = req.body.status || (task.status === 'Complete' ? 'Incomplete' : 'Complete');
    await task.save();

    const syncedProject = await syncProjectProgress(task.project);
    const updatedTask = await task.populate('assignee');

    res.json({ task: updatedTask, project: syncedProject });
  } catch (error) {
    console.error('Failed to toggle task status', error);
    res.status(400).json({ message: 'Failed to toggle task status' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const previousAssignee = task.assignee ? task.assignee.toString() : null;
    const nextAssignee = req.body.assigneeId || null;
    if (nextAssignee) {
      const assigneeExists = await TeamMember.exists({ _id: nextAssignee });
      if (!assigneeExists) {
        return res.status(404).json({ message: 'Assignee not found' });
      }
    }

    task.title = req.body.title ?? task.title;
    task.status = req.body.status ?? task.status;
    task.priority = req.body.priority ?? task.priority;
    task.assignee = nextAssignee;

    await task.save();

    if (previousAssignee && previousAssignee !== nextAssignee) {
      await TeamMember.findByIdAndUpdate(previousAssignee, { $pull: { tasks: task._id } });
    }

    if (nextAssignee && previousAssignee !== nextAssignee) {
      await TeamMember.findByIdAndUpdate(nextAssignee, { $addToSet: { tasks: task._id } });
    }

    const syncedProject = await syncProjectProgress(task.project);
    const updatedTask = await task.populate('assignee');

    res.json({ task: updatedTask, project: syncedProject });
  } catch (error) {
    console.error('Failed to update task', error);
    res.status(400).json({ message: 'Failed to update task' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.assignee) {
      await TeamMember.findByIdAndUpdate(task.assignee, { $pull: { tasks: task._id } });
    }

    const syncedProject = await syncProjectProgress(task.project);
    res.json({ message: 'Task deleted', project: syncedProject });
  } catch (error) {
    console.error('Failed to delete task', error);
    res.status(500).json({ message: 'Failed to delete task' });
  }
});

module.exports = router;
