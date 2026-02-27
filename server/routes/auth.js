import express from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { USER_TYPES } from '../models/User.js';
import {
  validateName,
  validateNickname,
  validateEmail,
  validateUsername,
  validatePassword,
} from '../utils/validation.js';
import { sendVerificationEmail, sendPasswordResetEmail, isEmailConfigured } from '../utils/email.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const API_URL = process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`;

/**
 * GET /api/auth/check-username?username=xxx
 * Check if username is already taken. Used for real-time validation during registration.
 */
router.get('/check-username', async (req, res) => {
  const { username } = req.query;
  if (!username || typeof username !== 'string' || !username.trim()) {
    return res.json({ available: false });
  }
  const existing = await User.findOne({ username: username.trim() });
  return res.json({ available: !existing });
});

/**
 * GET /api/auth/check-nickname?nickname=xxx
 * Check if nickname is already taken. Used for real-time validation during registration.
 */
router.get('/check-nickname', async (req, res) => {
  const { nickname } = req.query;
  if (!nickname || typeof nickname !== 'string' || !nickname.trim()) {
    return res.json({ available: false });
  }
  const existing = await User.findOne({ nickname: nickname.trim() });
  return res.json({ available: !existing });
});

/**
 * POST /api/auth/register
 * Register a new standard user. Sends verification email.
 */
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, nickname, email, username, password, confirmPassword } = req.body || {};

    // Server-side validation
    const errors = {};
    const fnErr = validateName(firstName, 'First name');
    if (fnErr) errors.firstName = fnErr;
    const lnErr = validateName(lastName, 'Last name');
    if (lnErr) errors.lastName = lnErr;
    const nickErr = validateNickname(nickname);
    if (nickErr) errors.nickname = nickErr;
    const emailErr = validateEmail(email);
    if (emailErr) errors.email = emailErr;
    const unErr = validateUsername(username);
    if (unErr) errors.username = unErr;
    const pwErr = validatePassword(password);
    if (pwErr) errors.password = pwErr;
    if (!confirmPassword) errors.confirmPassword = 'Confirm password is required';
    else if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', errors });
    }

    // Check uniqueness at DB level
    const existingEmail = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ error: 'Validation failed', errors: { email: 'Email is already registered' } });
    }

    const existingUsername = await User.findOne({ username: username.trim() });
    if (existingUsername) {
      return res.status(400).json({ error: 'Validation failed', errors: { username: 'Username is already taken' } });
    }

    const existingNickname = await User.findOne({ nickname: nickname.trim() });
    if (existingNickname) {
      return res.status(400).json({ error: 'Validation failed', errors: { nickname: 'Nickname is already taken' } });
    }

    // Create user as standard by default
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const autoVerify = !isEmailConfigured();
    const user = new User({
      userType: USER_TYPES.STANDARD,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      nickname: nickname.trim(),
      email: email.trim().toLowerCase(),
      username: username.trim(),
      password,
      emailVerified: autoVerify,
      emailVerifyToken: autoVerify ? undefined : verifyToken,
      emailVerifyExpires: autoVerify ? undefined : new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    await user.save();

    // Send confirmation email via Resend (non-blocking; registration succeeds even if email fails)
    const verifyUrl = `${API_URL}/api/auth/verify-email?token=${verifyToken}`;
    sendVerificationEmail(user.email, verifyUrl, user.firstName).catch((err) => {
      console.error('[Resend] Verification email failed for', user.email, '-', err?.message || err);
    });

    // When email is configured: user must confirm before logging in. No token returned.
    if (isEmailConfigured()) {
      return res.status(201).json({
        message: 'Registration successful. Please check your email and click the confirmation link to activate your account. After confirming, you can log in.',
        email: user.email,
        requireEmailConfirmation: true,
      });
    }

    // Dev mode (no Resend): auto-verify and return token so local testing works
    const token = jwt.sign(
      { userId: user._id, userType: user.userType },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    const userObj = user.toJSON();
    delete userObj.password;
    delete userObj.emailVerifyToken;
    res.status(201).json({
      message: 'Registration successful.',
      user: userObj,
      token,
    });
  } catch (err) {
    console.error('Register error:', err.message);
    console.error('Full error:', err);

    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      return res.status(400).json({ error: `That ${field} is already taken.`, errors: { [field]: `This ${field} is already in use.` } });
    }
    if (err.name === 'ValidationError') {
      const errors = {};
      for (const e of Object.values(err.errors || {})) {
        errors[e.path] = e.message;
      }
      return res.status(400).json({ error: 'Validation failed', errors });
    }

    const message = process.env.NODE_ENV === 'production' ? 'Registration failed. Please try again.' : (err.message || 'Registration failed. Please try again.');
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/auth/verify-email?token=xxx
 * Verify email using token from email link.
 */
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.redirect(`${CLIENT_URL}/login?error=Invalid+verification+link`);
  }
  try {
    const user = await User.findOne({
      emailVerifyToken: token,
      emailVerifyExpires: { $gt: new Date() },
    });
    if (!user) {
      return res.redirect(`${CLIENT_URL}/login?error=Verification+link+expired+or+invalid`);
    }
    user.emailVerified = true;
    user.emailVerifyToken = undefined;
    user.emailVerifyExpires = undefined;
    await user.save();
    return res.redirect(`${CLIENT_URL}/login?verified=1`);
  } catch (err) {
    return res.redirect(`${CLIENT_URL}/login?error=Verification+failed`);
  }
});

/**
 * POST /api/auth/login
 * Login with username or email and password.
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || typeof username !== 'string' || !username.trim()) {
      return res.status(400).json({ error: 'Username or email is required' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const identifier = username.trim();
    const isEmail = identifier.includes('@');
    const user = await User.findOne(
      isEmail ? { email: identifier.toLowerCase() } : { username: identifier }
    ).select('+password');

    if (!user) {
      return res.status(401).json({ error: 'Incorrect username or password' });
    }

    if (user.userType === USER_TYPES.GUEST) {
      return res.status(401).json({
        error: 'Guest accounts cannot log in with password. Use the invitation code or upgrade your account.',
      });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ error: 'Incorrect username or password' });
    }

    // Standard users must confirm their email before logging in
    if (user.userType === USER_TYPES.STANDARD && !user.emailVerified) {
      return res.status(403).json({
        error: 'Please confirm your email first. Check your inbox for the confirmation link.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    const token = jwt.sign(
      { userId: user._id, userType: user.userType },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userObj = user.toJSON();
    delete userObj.password;

    res.json({ user: userObj, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset. Sends email with reset link.
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};

    const emailErr = validateEmail(email);
    if (emailErr) {
      return res.status(400).json({ error: emailErr });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase(), userType: { $ne: USER_TYPES.GUEST } });

    // Don't reveal if email exists - always return success for security
    if (!user) {
      return res.json({ message: 'If that email exists, we sent a reset link.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const resetUrl = `${CLIENT_URL}/reset-password?token=${resetToken}`;
    await sendPasswordResetEmail(user.email, resetUrl, user.firstName);

    res.json({ message: 'If that email exists, we sent a reset link.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Request failed. Please try again.' });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using token from email.
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body || {};

    if (!token) {
      return res.status(400).json({ error: 'Reset token is required' });
    }
    const pwErr = validatePassword(password);
    if (pwErr) {
      return res.status(400).json({ error: pwErr });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Reset link is invalid or has expired' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Reset failed. Please try again.' });
  }
});

/**
 * GET /api/auth/me
 * Get current user (requires auth).
 */
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

export default router;
