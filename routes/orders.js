const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { getNextOrderNumber } = require('../models/Counter');
const requireAuth = require('../middleware/requireAuth');

// POST /api/orders - neue Bestellung vom Kunden anlegen
router.post('/', async (req, res) => {
  try {
    const { items, subtotal, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Der Warenkorb ist leer.' });
    }
    if (!['kassa', 'apple_pay', 'google_pay'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Ungültige Zahlungsmethode.' });
    }

    const { orderNumber, dateKey } = await getNextOrderNumber();

    const order = await Order.create({
      orderNumber,
      dateKey,
      items,
      subtotal,
      paymentMethod,
      status: 'neu'
    });

    // Live an alle verbundenen Mitarbeiter-Dashboards senden
    const io = req.app.get('io');
    io.to('dashboard').emit('new-order', order);

    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Bestellung konnte nicht gespeichert werden.' });
  }
});

// GET /api/orders?status=neu - Bestellungen für das Dashboard laden
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    // Nur heutige Bestellungen anzeigen
    filter.dateKey = new Date().toISOString().slice(0, 10);

    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Bestellungen konnten nicht geladen werden.' });
  }
});

// PATCH /api/orders/:id/status - Status ändern (neu -> in_zubereitung -> fertig -> abgeholt)
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['neu', 'in_zubereitung', 'fertig', 'abgeholt'].includes(status)) {
      return res.status(400).json({ error: 'Ungültiger Status.' });
    }

    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ error: 'Bestellung nicht gefunden.' });

    const io = req.app.get('io');
    io.to('dashboard').emit('order-updated', order);
    io.to('tv').emit('order-updated', order);

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Status konnte nicht geändert werden.' });
  }
});

module.exports = router;
