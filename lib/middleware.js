import { verifyAccessToken } from './auth.js';

export function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: missing token' });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = verifyAccessToken(token);
    req.user = { id: decoded.id, role: decoded.role, name: decoded.name, email: decoded.email };
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized: invalid or expired token' });
  }
}

export function requireDoctor(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Forbidden: doctor access only' });
    }
    next();
  });
}
