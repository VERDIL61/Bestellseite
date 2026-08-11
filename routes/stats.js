const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const requireAuth = require('../middleware/requireAuth');

// Liefert den Start-Zeitpunkt für einen Zeitraum ("heute" | "woche" | "monat")
function getStartDate(range) {
    const now = new Date();
    if (range === 'woche') {
        now.setDate(now.getDate() - 7);
    } else if (range === 'monat') {
        now.setMonth(now.getMonth() - 1);
    } else {
        // "heute": auf Mitternacht heute setzen
        now.setHours(0, 0, 0, 0);
    }
    return now;
}

// GET /api/stats?range=heute|woche|monat
router.get('/', requireAuth, async (req, res) => {
    try {
        const range = req.query.range || 'heute';
        const startDate = getStartDate(range);

        // Nur nicht-stornierte Bestellungen im Zeitraum (hier: alle, wir haben kein "storniert")
        const orders = await Order.find({ createdAt: { $gte: startDate } });

        // Kennzahlen berechnen
        const orderCount = orders.length;
        const revenue = orders.reduce((sum, o) => sum + o.subtotal, 0);

        // Top-Produkte: über alle Bestellungen alle Positionen zusammenzählen
        const productCounts = {}; // { "Döner Kebap": 12, ... }
        orders.forEach((order) => {
            order.items.forEach((item) => {
                productCounts[item.name] = (productCounts[item.name] || 0) + item.quantity;
            });
        });

        const topProducts = Object.entries(productCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5); // Top 5

        // Umsatz pro Tag (für das Balkendiagramm)
        const revenueByDay = {}; // { "2026-08-06": 145.50, ... }
        orders.forEach((order) => {
            const day = new Date(order.createdAt).toISOString().slice(0, 10);
            revenueByDay[day] = (revenueByDay[day] || 0) + order.subtotal;
        });

        const chartData = Object.entries(revenueByDay)
            .map(([day, total]) => ({ day, total }))
            .sort((a, b) => a.day.localeCompare(b.day));

        res.json({ range, orderCount, revenue, topProducts, chartData });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Statistik konnte nicht geladen werden.' });
    }
});

module.exports = router;