import express from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import Bill from '../models/Bill.js';
import User from '../models/User.js';
import Invitation from '../models/Invitation.js';
import { authenticate, requireRegistered } from '../middleware/auth.js';
import { USER_TYPES } from '../models/User.js';

const router = express.Router();

// Guest can access bills 6 hours per day from first access
const GUEST_ACCESS_MS = 6 * 60 * 60 * 1000;

/**
 * Enforces guest 6hr limit. Call after authenticate when user may be guest.
 */
function enforceGuestAccessLimit(user) {
  if (!user || user.userType !== USER_TYPES.GUEST) return null;
  if (!user.dailyAccessStart) return null;
  const elapsed = Date.now() - new Date(user.dailyAccessStart).getTime();
  if (elapsed >= GUEST_ACCESS_MS) {
    return 'Your 6-hour guest access has expired. Please enter the invitation code again to continue.';
  }
  return null;
}

/**
 * Resolve bill by ID or invitation code. Returns bill if found.
 */
async function findBillByIdOrCode(idOrCode) {
  if (mongoose.Types.ObjectId.isValid(idOrCode) && String(new mongoose.Types.ObjectId(idOrCode)) === idOrCode) {
    const bill = await Bill.findById(idOrCode);
    if (bill) return bill;
  }
  const code = String(idOrCode || '').trim().toUpperCase();
  if (!code) return null;
  let bill = await Bill.findOne({ invitationCode: code });
  if (!bill) {
    const inv = await Invitation.findOne({ code });
    if (inv) bill = await Bill.findById(inv.billId);
  }
  return bill;
}

/**
 * Check if user can access bill (owner, participant, or guest with matching invitation).
 */
function canAccessBill(bill, user) {
  if (!bill || !user) return false;
  const userId = user._id.toString();
  const ownerMatch = bill.createdBy?.toString() === userId;
  const participantMatch = bill.participants?.some((p) => p.user?.toString() === userId);
  if (ownerMatch || participantMatch) return true;
  if (user.userType === USER_TYPES.GUEST && user.invitationCode) {
    return bill.invitationCode === user.invitationCode.toUpperCase();
  }
  return false;
}

/**
 * Generate unique uppercase invitation code for a bill.
 */
function generateInvitationCode() {
  return crypto.randomBytes(6).toString('hex').toUpperCase();
}

/**
 * GET /api/bills
 * List bills for authenticated user. Registered users only.
 */
router.get('/', authenticate, requireRegistered, async (req, res) => {
  try {
    const bills = await Bill.find({
      $or: [
        { createdBy: req.user._id },
        { 'participants.user': req.user._id },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ bills });
  } catch (err) {
    console.error('List bills error:', err);
    res.status(500).json({ error: 'Failed to load bills.' });
  }
});

/**
 * GET /api/bills/:id
 * Get single bill by ID or invitation code. Enforces guest 6hr limit.
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const bill = await findBillByIdOrCode(req.params.id);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    if (req.user.userType === USER_TYPES.GUEST) {
      const limitErr = enforceGuestAccessLimit(req.user);
      if (limitErr) {
        return res.status(403).json({ error: limitErr, code: 'GUEST_ACCESS_EXPIRED' });
      }
      if (!canAccessBill(bill, req.user)) {
        return res.status(403).json({ error: 'You do not have access to this bill.' });
      }
    } else {
      if (!canAccessBill(bill, req.user)) {
        return res.status(403).json({ error: 'You do not have access to this bill.' });
      }
    }

    res.json({ bill });
  } catch (err) {
    console.error('Get bill error:', err);
    res.status(500).json({ error: 'Failed to load bill.' });
  }
});

/**
 * POST /api/bills
 * Create a new bill. Registered users only. Generates invitation code.
 */
router.post('/', authenticate, requireRegistered, async (req, res) => {
  try {
    const { title } = req.body || {};
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Bill title is required' });
    }

    // Standard users: max 5 bills per month
    if (req.user.userType === USER_TYPES.STANDARD) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const count = await Bill.countDocuments({
        createdBy: req.user._id,
        createdAt: { $gte: startOfMonth },
      });
      if (count >= 5) {
        return res.status(403).json({ error: 'Standard accounts can create up to 5 bills per month. Upgrade to Premium for unlimited.' });
      }
    }

    let invitationCode = generateInvitationCode();
    while (await Bill.findOne({ invitationCode })) {
      invitationCode = generateInvitationCode();
    }

    const bill = new Bill({
      title: title.trim(),
      createdBy: req.user._id,
      participants: [{ user: req.user._id, role: 'owner' }],
      invitationCode,
    });
    await bill.save();

    res.status(201).json({
      bill,
      invitationCode,
      message: 'Bill created. Share the invitation code to add others.',
    });
  } catch (err) {
    console.error('Create bill error:', err);
    res.status(500).json({ error: 'Failed to create bill.' });
  }
});

/**
 * POST /api/bills/:id/join
 * Join a bill by invitation code. Registered users only. Max 3 persons per bill for standard.
 */
router.post('/:id/join', authenticate, requireRegistered, async (req, res) => {
  try {
    const { code } = req.body || {};
    const codeToUse = code || req.params.id;
    const bill = await findBillByIdOrCode(codeToUse);

    if (!bill) {
      return res.status(404).json({ error: 'Invalid or expired invitation code' });
    }

    const userId = req.user._id.toString();
    const ownerId = bill.createdBy?.toString();
    const isOwner = ownerId === userId;
    const isParticipant = bill.participants?.some((p) => p.user?.toString() === userId);

    if (isOwner || isParticipant) {
      return res.status(400).json({ error: 'You are already in this bill.' });
    }

    const participantCount = (bill.participants?.length || 0) + 1;
    const maxParticipants = req.user.userType === USER_TYPES.STANDARD ? 3 : 999;

    if (participantCount > maxParticipants) {
      return res.status(403).json({
        error:
          req.user.userType === USER_TYPES.STANDARD
            ? 'Standard accounts can add up to 3 people per bill. Upgrade to Premium for more.'
            : 'This bill has reached the maximum number of participants.',
      });
    }

    bill.participants = bill.participants || [];
    bill.participants.push({ user: req.user._id, role: 'member' });
    await bill.save();

    res.json({
      bill,
      message: 'You have joined the bill successfully.',
    });
  } catch (err) {
    console.error('Join bill error:', err);
    res.status(500).json({ error: 'Failed to join bill.' });
  }
});

export default router;
