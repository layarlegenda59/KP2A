import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'sidarsih_jwt_secret_key_2025';

export function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token tidak ditemukan' });
        }

        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token sudah kadaluarsa' });
        }
        return res.status(401).json({ error: 'Token tidak valid' });
    }
}

export function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
        }
        next();
    } catch (error) {
        next();
    }
}

export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Tidak terautentikasi' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Akses ditolak' });
        }

        next();
    };
}
