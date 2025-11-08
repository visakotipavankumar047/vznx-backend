const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const teamMemberSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, default: 'Architect' },
    capacity: { type: Number, default: 5, min: 1, max: 10 },
    tasks: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

teamMemberSchema.virtual('taskCount').get(function teamMemberTaskCount() {
  return this.tasks?.length ?? 0;
});

teamMemberSchema.virtual('workload').get(function teamMemberWorkload() {
  if (!this.capacity) {
    return 0;
  }
  return Math.min(100, Math.round(((this.tasks?.length ?? 0) / this.capacity) * 100));
});

const TeamMember = mongoose.model('TeamMember', teamMemberSchema);

module.exports = TeamMember;
