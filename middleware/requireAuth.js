// Wird als Torwächter vor geschützte Routen gehängt
function requireAuth(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();  // eingeloggt -> weiter zur eigentlichen Route
    }
    res.status(401).json({ error: 'Nicht angemeldet.' });
}
module.exports = requireAuth;