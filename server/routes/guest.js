import express from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Invitation from '../models/Invitation.js';
import Bill from '../models/Bill.js';
import { USER_TYPES } from '../models/User.js';
import { validateName, validateEmail, validatePassword } from '../utils/validation.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

/**
 * Generates a unique uppercase invitation code.
 */
function generateInvitationCode() {
  return crypto.randomBytes(6).toString('hex').toUpperCase();
}

/**
 * POST /api/guest/join
 * Guest joins via invitation code. Creates guest user if new, or links existing guest.
 * Body: { code, firstName, lastName, email }
 */
router.post('/join', async (req, res) => {
  try {
    const { code, firstName, lastName, email } = req.body || {};

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ error: 'Invitation code is required' });
    }

    const codeErr = validateName(firstName, 'First name');
    if (codeErr) return res.status(400).json({ error: codeErr });
    const lnErr = validateName(lastName, 'Last name');
    if (lnErr) return res.status(400).json({ error: lnErr });
    const emailErr = validateEmail(email);
    if (emailErr) return res.status(400).json({ error: emailErr });

    const inviteCode = code.trim().toUpperCase();

    // Find invitation - could be on Bill or Invitation collection
    let bill = await Bill.findOne({ invitationCode: inviteCode });
    if (!bill) {
      const inv = await Invitation.findOne({ code: inviteCode });
      if (inv) bill = await Bill.findById(inv.billId);
    }

    if (!bill) {
      return res.status(404).json({ error: 'Invalid or expired invitation code' });
    }

    const emailNorm = email.trim().toLowerCase();

    // If invited by registered user: check if email already exists
    let user = await User.findOne({ email: emailNorm });

    if (user) {
      if (user.userType !== USER_TYPES.GUEST) {
        return res.status(400).json({
          error: 'This email is already registered. Please log in instead.',
        });
      }
      // Existing guest - update dailyAccessStart for 6hr limit
      user.dailyAccessStart = user.dailyAccessStart && (Date.now() - user.dailyAccessStart.getTime() < 6 * 60 * 60 * 1000)
        ? user.dailyAccessStart
        : new Date();
      user.invitationCode = inviteCode;
      user.invitedBy = bill.createdBy;
      await user.save();
    } else {
      user = new User({
        userType: USER_TYPES.GUEST,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: emailNorm,
        invitationCode: inviteCode,
        invitedBy: bill.createdBy,
        dailyAccessStart: new Date(),
      });
      await user.save();
    }

    const token = jwt.sign(
      { userId: user._id, userType: USER_TYPES.GUEST },
      JWT_SECRET,
      { expiresIn: '6h' }
    );

    const userObj = user.toJSON();

    res.status(201).json({
      user: userObj,
      token,
      billId: bill._id,
    });
  } catch (err) {
    console.error('Guest join error:', err);
    res.status(500).json({ error: 'Failed to join. Please try again.' });
  }
});

/**
 * POST /api/guest/upgrade
 * Upgrade guest to registered user. Requires auth (guest token).
 * Body: { password, confirmPassword } - uses existing guest firstName, lastName, email.
 * Auto-generates unique username and nickname from guest details.
 */
router.post('/upgrade', authenticate, async (req, res) => {
  try {
    if (req.user.userType !== USER_TYPES.GUEST) {
      return res.status(400).json({ error: 'Only guest accounts can be upgraded' });
    }

    const { password, confirmPassword } = req.body || {};

    const pwErr = validatePassword(password);
    if (pwErr) return res.status(400).json({ error: pwErr });
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const user = await User.findById(req.user._id);
    if (!user || user.userType !== USER_TYPES.GUEST) {
      return res.status(404).json({ error: 'Guest user not found' });
    }

    // Auto-generate username from email prefix (sanitized)
    let baseUsername = user.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
    if (baseUsername.length < 3) baseUsername = baseUsername + user.firstName.slice(0, 2);
    let username = baseUsername;
    let suffix = 0;
    while (await User.findOne({ username })) {
      username = `${baseUsername}${suffix}`;
      suffix++;
    }

    // Nickname from firstName + lastName initial (must be unique)
    let nickname = `${user.firstName} ${user.lastName.charAt(0)}`.trim();
    let nickSuffix = 0;
    while (await User.findOne({ nickname })) {
      nickname = `${user.firstName} ${user.lastName.charAt(0)}${nickSuffix}`.trim();
      nickSuffix++;
    }

    user.userType = USER_TYPES.STANDARD;
    user.nickname = nickname;
    user.username = username;
    user.password = password;
    user.emailVerified = true;
    await user.save();

    const token = jwt.sign(
      { userId: user._id, userType: user.userType },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userObj = user.toJSON();
    delete userObj.password;

    res.json({
      message: 'Account upgraded successfully.',
      user: userObj,
      token,
    });
  } catch (err) {
    console.error('Guest upgrade error:', err);
    res.status(500).json({ error: 'Upgrade failed. Please try again.' });
  }
});

/**
 * POST /api/guest/search-bill
 * Search for bill by invitation code (for guests to view bills).
 * Body: { code }
 */
router.post('/search-bill', async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ error: 'Invitation code is required' });
    }

    const inviteCode = code.trim().toUpperCase();
    let bill = await Bill.findOne({ invitationCode: inviteCode });
    if (!bill) {
      const inv = await Invitation.findOne({ code: inviteCode });
      if (inv) bill = await Bill.findById(inv.billId);
    }

    if (!bill) {
      return res.status(404).json({ error: 'No bill found for this invitation code' });
    }

    res.json({
      billId: bill._id,
      message: 'Bill found. Log in or enter guest details to view.',
    });
  } catch (err) {
    console.error('Search bill error:', err);
    res.status(500).json({ error: 'Search failed.' });
  }
});

export default router;
