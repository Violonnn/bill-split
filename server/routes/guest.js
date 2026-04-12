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
    const userIdStr = (id) => (id && id.toString ? id.toString() : String(id));
    let isNewGuest = false;

    // Look up by email first – never create a second guest for the same email
    let user = await User.findOne({ email: emailNorm });

    if (user) {
      if (user.userType !== USER_TYPES.GUEST) {
        return res.status(400).json({
          error: 'This email is already registered. Please log in instead.',
        });
      }
      // Existing guest: refresh 6hr window, current invitation, and name
      user.dailyAccessStart = user.dailyAccessStart && (Date.now() - user.dailyAccessStart.getTime() < 6 * 60 * 60 * 1000)
        ? user.dailyAccessStart
        : new Date();
      user.invitationCode = inviteCode;
      user.invitedBy = bill.createdBy;
      user.firstName = firstName.trim();
      user.lastName = lastName.trim();
      await user.save();
    } else {
      // Double-check no guest exists for this email (e.g. race or timing)
      const existingByEmail = await User.findOne({ email: emailNorm });
      if (existingByEmail) {
        if (existingByEmail.userType !== USER_TYPES.GUEST) {
          return res.status(400).json({
            error: 'This email is already registered. Please log in instead.',
          });
        }
        user = existingByEmail;
        user.dailyAccessStart = new Date();
        user.invitationCode = inviteCode;
        user.invitedBy = bill.createdBy;
        user.firstName = firstName.trim();
        user.lastName = lastName.trim();
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
        try {
          await user.save();
          isNewGuest = true;
        } catch (saveErr) {
          if (saveErr.code === 11000 && saveErr.keyPattern?.email) {
            user = await User.findOne({ email: emailNorm });
            if (!user || user.userType !== USER_TYPES.GUEST) {
              return res.status(400).json({
                error: 'This email is already in use. Please log in or use a different email.',
              });
            }
            user.dailyAccessStart = new Date();
            user.invitationCode = inviteCode;
            user.invitedBy = bill.createdBy;
            user.firstName = firstName.trim();
            user.lastName = lastName.trim();
            await user.save();
          } else {
            throw saveErr;
          }
        }
      }
    }

    const token = jwt.sign(
      { userId: user._id, userType: USER_TYPES.GUEST },
      JWT_SECRET,
      { expiresIn: '6h' }
    );

    // Add to bill participants only if not already in (compare by id string to avoid duplicates)
    bill.participants = bill.participants || [];
    const alreadyIn = bill.participants.some((p) => p && p.user && userIdStr(p.user) === userIdStr(user._id));
    if (!alreadyIn) {
      bill.participants.push({ user: user._id, role: 'member' });
      await bill.save();
    }

    const userObj = user.toJSON();
    const sixHoursMs = 6 * 60 * 60 * 1000;
    userObj.guestAccessExpiresAt = new Date(user.dailyAccessStart).getTime() + sixHoursMs;

    res.status(alreadyIn ? 200 : 201).json({
      user: userObj,
      token,
      billId: bill._id,
      existingGuest: !isNewGuest,
      alreadyInBill: alreadyIn,
      message: alreadyIn
        ? 'Welcome back. You\'re already in this bill.'
        : undefined,
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
 * POST /api/guest/rejoin
 * Returning guest: code + email only. If this email is already a guest in this bill, issue a new token and return.
 * Body: { code, email }
 */
router.post('/rejoin', async (req, res) => {
  try {
    const { code, email } = req.body || {};
    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ error: 'Invitation code is required' });
    }
    const emailErr = validateEmail(email);
    if (emailErr) return res.status(400).json({ error: emailErr });

    const inviteCode = code.trim().toUpperCase();
    const emailNorm = email.trim().toLowerCase();

    let bill = await Bill.findOne({ invitationCode: inviteCode });
    if (!bill) {
      const inv = await Invitation.findOne({ code: inviteCode });
      if (inv) bill = await Bill.findById(inv.billId);
    }
    if (!bill) {
      return res.status(404).json({ error: 'Invalid or expired invitation code' });
    }

    const user = await User.findOne({ email: emailNorm });
    if (!user || user.userType !== USER_TYPES.GUEST) {
      return res.status(404).json({ error: 'No guest account found for this email. Enter your details below to join.' });
    }

    const userIdStr = user._id.toString();
    const inBill = (bill.participants || []).some((p) => p && p.user && (p.user.toString ? p.user.toString() : String(p.user)) === userIdStr);
    if (!inBill) {
      return res.status(404).json({ error: 'No guest account found for this email. Enter your details below to join.' });
    }

    user.dailyAccessStart = user.dailyAccessStart && (Date.now() - user.dailyAccessStart.getTime() < 6 * 60 * 60 * 1000)
      ? user.dailyAccessStart
      : new Date();
    user.invitationCode = inviteCode;
    user.invitedBy = bill.createdBy;
    await user.save();

    const token = jwt.sign(
      { userId: user._id, userType: USER_TYPES.GUEST },
      JWT_SECRET,
      { expiresIn: '6h' }
    );
    const userObj = user.toJSON();
    const sixHoursMs = 6 * 60 * 60 * 1000;
    userObj.guestAccessExpiresAt = new Date(user.dailyAccessStart).getTime() + sixHoursMs;

    res.json({
      user: userObj,
      token,
      billId: bill._id,
      message: 'Welcome back. You\'re already in this bill.',
    });
  } catch (err) {
    console.error('Guest rejoin error:', err);
    res.status(500).json({ error: 'Unable to sign you back in. Please try again.' });
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
