const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const projectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['Planned', 'In Progress', 'At Risk', 'Completed'],
      default: 'Planned',
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    studio: { type: String, default: 'Core Studio' },
    dueDate: { type: Date, default: null },
    notes: { type: String, trim: true },
    color: { type: String, default: '#2563eb' },
    projectLead: { type: Schema.Types.ObjectId, ref: 'TeamMember', default: null },
  },
  {
    timestamps: true,
  },
);

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;
