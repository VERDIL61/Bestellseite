const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// GET /api/products - alle aktiven Produkte, gruppiert nach Kategorie
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({ active: true }).sort({ category: 1, sortOrder: 1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Produkte konnten nicht geladen werden.' });
  }
});

// GET /api/products/:id - einzelnes Produkt (fuer Konfigurationsseite)
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Produkt nicht gefunden.' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Produkt konnte nicht geladen werden.' });
  }
});

module.exports = router;
