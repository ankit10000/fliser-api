import jwt from 'jsonwebtoken';

export function signAccessToken(payload) {
  return jwt.sign(payload, (process.env.JWT_SECRET || '').trim(), {
    expiresIn: (process.env.JWT_EXPIRY || '15m').trim(),
  });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, (process.env.JWT_REFRESH_SECRET || '').trim(), {
    expiresIn: (process.env.JWT_REFRESH_EXPIRY || '30d').trim(),
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, (process.env.JWT_SECRET || '').trim());
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, (process.env.JWT_REFRESH_SECRET || '').trim());
}
