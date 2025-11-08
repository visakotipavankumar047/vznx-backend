const Project = require('../models/project.model');
const Task = require('../models/task.model');

async function syncProjectProgress(projectId) {
  if (!projectId) {
    return null;
  }

  const [totalTasks, completedTasks] = await Promise.all([
    Task.countDocuments({ project: projectId }),
    Task.countDocuments({ project: projectId, status: 'Complete' }),
  ]);

  const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  let status = 'In Progress';
  if (progress === 0) {
    status = 'Planned';
  } else if (progress === 100 && totalTasks > 0) {
    status = 'Completed';
  }

  return Project.findByIdAndUpdate(
    projectId,
    { progress, status },
    { new: true },
  ).lean();
}

module.exports = {
  syncProjectProgress,
};
