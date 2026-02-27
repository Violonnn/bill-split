import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { USER_TYPES } from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

/**
 * Verifies JWT and attaches user to req.user. Use for protected routes.
 */
export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Access denied. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password -emailVerifyToken -resetPasswordToken');
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token. Please log in again.' });
  }
}

/**
 * Optional auth - attaches user if token present, but doesn't reject.
 */
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password -emailVerifyToken -resetPasswordToken');
    if (user) req.user = user;
  } catch (_) {
    /* ignore invalid token */
  }
  next();
}

/**
 * Requires registered user (standard or premium) - blocks guests from certain actions.
 */
export function requireRegistered(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Please log in.' });
  }
  if (req.user.userType === USER_TYPES.GUEST) {
    return res.status(403).json({ error: 'This action requires a registered account. Upgrade your guest account.' });
  }
  next();
}
