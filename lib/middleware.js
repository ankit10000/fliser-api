import { verifyAccessToken } from './auth.js';
import { setCors, handleOptions } from './cors.js';

export function requireAuth(handler) {
  return async (req, res) => {
    if (req.method === 'OPTIONS') return handleOptions(req, res);
    setCors(res);

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: missing token' });
    }

    const token = authHeader.slice(7);
    try {
      const decoded = verifyAccessToken(token);
      req.user = { id: decoded.id, role: decoded.role, name: decoded.name, email: decoded.email };
      return handler(req, res);
    } catch {
      return res.status(401).json({ error: 'Unauthorized: invalid or expired token' });
    }
  };
}

export function requireDoctor(handler) {
  return requireAuth(async (req, res) => {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Forbidden: doctor access only' });
    }
    return handler(req, res);
  });
}
