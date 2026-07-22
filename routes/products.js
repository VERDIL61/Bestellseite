const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const requireAuth = require('../middleware/requireAuth');

// GET /api/products - alle aktiven Produkte, gruppiert nach Kategorie
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({ active: true }).sort({ category: 1, sortOrder: 1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Produkte konnten nicht geladen werden.' });
  }
});

// GET /api/products/:id - einzelnes Produkt (für Konfigurationsseite)
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Produkt nicht gefunden.' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Produkt konnte nicht geladen werden.' });
  }
});

// POST /api/products - neues Produkt anlegen
router.post('/', requireAuth, async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: 'Produkt konnte nicht angelegt werden: ' + err.message });
  }
});

// PUT /api/products/:id - bestehendes Produkt komplett aktualisieren
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,          // gibt das AKTUALISIERTE Dokument zurueck, nicht das alte
      runValidators: true // prueft Pflichtfelder etc. auch beim Update, nicht nur beim Anlegen
    });
    if (!product) return res.status(404).json({ error: 'Produkt nicht gefunden.' });
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: 'Produkt konnte nicht aktualisiert werden: ' + err.message });
  }
});

// DELETE /api/products/:id - Produkt endgültig löschen
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Produkt nicht gefunden.' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Produkt konnte nicht gelöscht werden.' });
  }
});

module.exports = router;
