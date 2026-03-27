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
 * Register a new standard user, or upgrade a guest account (when upgradeGuest: true).
 * Sends verification email for new users. Detects guest email and returns guestAccountDetected for client to confirm.
 */
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, nickname, email, username, password, confirmPassword, upgradeGuest } = req.body || {};
    const emailNorm = email?.trim?.()?.toLowerCase?.();

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

    const existingEmail = await User.findOne({ email: emailNorm });

    if (existingEmail) {
      if (existingEmail.userType === USER_TYPES.GUEST) {
        if (upgradeGuest === true) {
          // Upgrade guest to standard: use existing guest, set username, nickname, password
          const existingUsername = await User.findOne({ username: username.trim(), _id: { $ne: existingEmail._id } });
          if (existingUsername) {
            return res.status(400).json({ error: 'Validation failed', errors: { username: 'Username is already taken' } });
          }
          const existingNickname = await User.findOne({ nickname: nickname.trim(), _id: { $ne: existingEmail._id } });
          if (existingNickname) {
            return res.status(400).json({ error: 'Validation failed', errors: { nickname: 'Nickname is already taken' } });
          }
          const user = await User.findById(existingEmail._id).select('+password');
          if (!user || user.userType !== USER_TYPES.GUEST) {
            return res.status(400).json({ error: 'Guest account no longer available. Please register as new.' });
          }
          user.firstName = firstName.trim();
          user.lastName = lastName.trim();
          user.nickname = nickname.trim();
          user.username = username.trim();
          user.password = password;
          user.userType = USER_TYPES.STANDARD;
          user.emailVerified = !isEmailConfigured();
          user.emailVerifyToken = undefined;
          user.emailVerifyExpires = undefined;
          user.invitationCode = undefined;
          user.invitedBy = undefined;
          user.dailyAccessStart = undefined;
          if (isEmailConfigured()) {
            const verifyToken = crypto.randomBytes(32).toString('hex');
            user.emailVerified = false;
            user.emailVerifyToken = verifyToken;
            user.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
            await user.save();
            const verifyUrl = `${API_URL}/api/auth/verify-email?token=${verifyToken}`;
            sendVerificationEmail(user.email, verifyUrl, user.firstName).catch((err) => {
              console.error('[Resend] Verification email failed for', user.email, '-', err?.message || err);
            });
            const userObj = user.toJSON();
            delete userObj.password;
            delete userObj.emailVerifyToken;
            return res.status(201).json({
              message: 'Account upgraded. Please check your email and click the confirmation link to activate your account.',
              email: user.email,
              requireEmailConfirmation: true,
            });
          }
          user.emailVerified = true;
          await user.save();
          const token = jwt.sign(
            { userId: user._id, userType: user.userType },
            JWT_SECRET,
            { expiresIn: '7d' }
          );
          const userObj = user.toJSON();
          delete userObj.password;
          delete userObj.emailVerifyToken;
          return res.status(201).json({
            message: 'Account upgraded successfully.',
            user: userObj,
            token,
          });
        }
        return res.status(200).json({
          guestAccountDetected: true,
          message: 'This email is used as a guest account. Would you like to upgrade it to a full account? Your name and email will be kept.',
        });
      }
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
      email: emailNorm,
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
      return res.status(401).json({ error: 'Username or email not found', code: 'USERNAME_NOT_FOUND' });
    }

    if (user.userType === USER_TYPES.GUEST) {
      return res.status(401).json({
        error: 'Guest accounts cannot log in with password. Use the invitation code or upgrade your account.',
        code: 'GUEST_CANNOT_LOGIN',
      });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ error: 'Password incorrect', code: 'PASSWORD_INCORRECT' });
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

// Guest access: 6 hours per day from dailyAccessStart (used for client countdown and notifications).
const GUEST_ACCESS_MS = 6 * 60 * 60 * 1000;

/**
 * GET /api/auth/me
 * Get current user (requires auth). For guests, includes guestAccessExpiresAt (timestamp) for live duration display.
 */
router.get('/me', authenticate, (req, res) => {
  const userObj = req.user.toObject ? req.user.toObject() : { ...req.user };
  if (userObj.userType === USER_TYPES.GUEST && userObj.dailyAccessStart) {
    userObj.guestAccessExpiresAt = new Date(userObj.dailyAccessStart).getTime() + GUEST_ACCESS_MS;
  }
  res.json({ user: userObj });
});

/**
 * PATCH /api/auth/me
 * Update current user profile (firstName, lastName, email, phone). No privilege escalation.
 */
router.patch('/me', authenticate, async (req, res) => {
  try {
    const { firstName, lastName, email, phone } = req.body || {};
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.userType === USER_TYPES.GUEST) {
      const fnErr = validateName(firstName, 'First name');
      if (fnErr) return res.status(400).json({ error: fnErr });
      const lnErr = validateName(lastName, 'Last name');
      if (lnErr) return res.status(400).json({ error: lnErr });
      const emailErr = validateEmail(email);
      if (emailErr) return res.status(400).json({ error: emailErr });
      user.firstName = firstName.trim();
      user.lastName = lastName.trim();
      user.email = email.trim().toLowerCase();
    } else {
      if (firstName !== undefined) {
        const fnErr = validateName(firstName, 'First name');
        if (fnErr) return res.status(400).json({ error: fnErr });
        user.firstName = firstName.trim();
      }
      if (lastName !== undefined) {
        const lnErr = validateName(lastName, 'Last name');
        if (lnErr) return res.status(400).json({ error: lnErr });
        user.lastName = lastName.trim();
      }
      if (email !== undefined) {
        const emailErr = validateEmail(email);
        if (emailErr) return res.status(400).json({ error: emailErr });
        const existing = await User.findOne({ email: email.trim().toLowerCase(), _id: { $ne: user._id } });
        if (existing) return res.status(400).json({ error: 'Email is already in use by another account.' });
        user.email = email.trim().toLowerCase();
      }
    }

    if (phone !== undefined && typeof phone === 'string') {
      user.phone = phone.trim();
    }

    await user.save();

    const userObj = user.toJSON();
    delete userObj.password;
    delete userObj.emailVerifyToken;
    delete userObj.resetPasswordToken;
    res.json({ user: userObj });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

/** Premium upgrade price (sample payment – no real gateway). */
const PREMIUM_UPGRADE_AMOUNT_CENTS = 499;

/**
 * GET /api/auth/premium-upgrade-info
 * Returns the sample upgrade amount for display (no auth required for price display).
 */
router.get('/premium-upgrade-info', (req, res) => {
  res.json({
    amountCents: PREMIUM_UPGRADE_AMOUNT_CENTS,
    amountFormatted: `$${(PREMIUM_UPGRADE_AMOUNT_CENTS / 100).toFixed(2)}`,
  });
});

/**
 * POST /api/auth/upgrade-to-premium
 * Standard users only. Sample payment: client confirms payment; server sets userType to premium.
 * Body: { paymentConfirmed: true } to complete the upgrade (simulates successful payment).
 */
router.post('/upgrade-to-premium', authenticate, async (req, res) => {
  try {
    if (req.user.userType !== USER_TYPES.STANDARD) {
      return res.status(400).json({
        error: req.user.userType === USER_TYPES.PREMIUM
          ? 'You are already a Premium user.'
          : 'Only registered Standard users can upgrade to Premium.',
      });
    }

    const { paymentConfirmed } = req.body || {};
    if (paymentConfirmed !== true) {
      return res.status(400).json({
        error: 'Payment must be confirmed to complete upgrade.',
        code: 'PAYMENT_REQUIRED',
        amountCents: PREMIUM_UPGRADE_AMOUNT_CENTS,
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { userType: USER_TYPES.PREMIUM },
      { new: true }
    ).select('-password -emailVerifyToken -resetPasswordToken');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userObj = user.toObject ? user.toObject() : user;
    res.json({
      message: 'Welcome to Premium! You now have unlimited bills and participants.',
      user: userObj,
    });
  } catch (err) {
    console.error('Upgrade to premium error:', err);
    res.status(500).json({ error: 'Upgrade failed. Please try again.' });
  }
});

export default router;
