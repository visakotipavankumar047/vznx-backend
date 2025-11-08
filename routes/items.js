const router = require('express').Router();
const Item = require('../models/item.model');

// GET /api/items
router.get('/', async (req, res) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (error) {
    console.error('Failed to fetch items', error);
    res.status(500).json({ message: 'Failed to fetch items' });
  }
});

// GET /api/items/:id
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).lean();
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json(item);
  } catch (error) {
    console.error('Failed to fetch item', error);
    res.status(500).json({ message: 'Failed to fetch item' });
  }
});

// POST /api/items
router.post('/', async (req, res) => {
  try {
    const { name, description, category, status, price, quantity } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Item name is required' });
    }
    const item = new Item({ name, description, category, status, price, quantity });
    const saved = await item.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error('Failed to create item', error);
    res.status(400).json({ message: 'Failed to create item', error: error.message });
  }
});

// PUT /api/items/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, description, category, status, price, quantity } = req.body;
    const updated = await Item.findByIdAndUpdate(
      req.params.id,
      { name, description, category, status, price, quantity },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json(updated);
  } catch (error) {
    console.error('Failed to update item', error);
    res.status(400).json({ message: 'Failed to update item', error: error.message });
  }
});

// DELETE /api/items/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Item.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json({ message: 'Item deleted', item: deleted });
  } catch (error) {
    console.error('Failed to delete item', error);
    res.status(500).json({ message: 'Failed to delete item' });
  }
});

module.exports = router;
