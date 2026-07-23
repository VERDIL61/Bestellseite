const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const requireAuth = require('../middleware/requireAuth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { password } = req.body;

    try {
        const admin = await Admin.findOne(); // es gibt nur eins
        if (!admin) {
            return res.status(500).json({ error: 'Kein Admin-Konto eingerichtet.' });
        }

        const matches = await bcrypt.compare(password, admin.passwordHash);
        if (!matches) {
            return res.status(401).json({ error: 'Falsches Passwort.' });
        }

        req.session.isAdmin = true;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Login fehlgeschlagen.' });
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true });
    });
});

// GET /api/auth/status
router.get('/status', (req, res) => {
    res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

// POST /api/auth/change-password - nur eingeloggt nutzbar
router.post('/change-password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ error: 'Neues Passwort ist zu kurz (mind. 4 Zeichen).' });
    }

    try {
        const admin = await Admin.findOne();
        const matches = await bcrypt.compare(currentPassword, admin.passwordHash);
        if (!matches) {
            return res.status(401).json({ error: 'Aktuelles Passwort ist falsch.' });
        }

        admin.passwordHash = await bcrypt.hash(newPassword, 10);
        await admin.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Passwort konnte nicht geändert werden.' });
    }
});

module.exports = router;