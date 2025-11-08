const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, default: 'General' },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Pending'],
      default: 'Active',
    },
    price: { type: Number, default: 0 },
    quantity: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Item', itemSchema);
