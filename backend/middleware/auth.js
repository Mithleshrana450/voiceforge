const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'voiceforge-secret-key-change-in-prod';

const requireAuth = (req, res, next) => {
    const header = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    try {
        const token = header.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = db.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized: Invalid user' });
        }
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

const optionalAuth = (req, res, next) => {
    const header = req.headers['authorization'];
    if (header && header.startsWith('Bearer ')) {
        try {
            const token = header.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = db.findById(decoded.userId);
        } catch (_) { }
    }
    next();
};

const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
};

module.exports = { requireAuth, optionalAuth, generateToken };