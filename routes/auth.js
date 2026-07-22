const express = require('express');
const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
    const { password } = req.body;

    if (password === process.env.ADMIN_PASSWORD) {
        req.session.isAdmin = true; // ab jetzt gilt diese Session als eingeloggt
        return res.json({ success: true });
    }
    res.status(401).json({ error: 'Falsches Passwort.' });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true });
    });
});

// GET /api/auth/status - fürs Frontend, um zu prüfen ob schon eingeloggt
router.get('/status', (req, res) => {
    res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

module.exports = router;