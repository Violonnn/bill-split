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
 * Build members array from populated participants for API response (reusable).
 */
function participantsToMembers(participants) {
  if (!participants || !Array.isArray(participants)) return [];
  return participants
    .filter((p) => p.user)
    .map((p) => ({
      _id: p.user._id,
      name: [p.user.firstName, p.user.lastName].filter(Boolean).join(' ') || p.user.nickname || p.user.email,
      email: p.user.email,
      userType: p.user.userType || 'User',
    }));
}

/**
 * Bill split calculation: who paid what, who owes what, and minimal settlements.
 * Logic:
 * 1. For each expense: the payer paid the full amount; the "share" is split among participants
 *    (equally among all members, or among splitAmong for custom). Each person's owed share is
 *    added to totalOwed; the payer's totalPaid is increased by the expense amount.
 * 2. Balance = totalPaid - totalOwed. Positive = owed money (creditor), negative = owes money (debtor).
 * 3. Settlements: greedy algorithm. Sort by balance (ascending). Pair the largest debtor with the
 *    largest creditor; settle min(|debt|, credit); repeat. Ensures at most n-1 transactions.
 * Amounts are rounded to 2 decimals (work in cents to avoid float errors).
 */
function computeBillSplit(members, expenses) {
  if (!members?.length || !expenses?.length) {
    return { balances: [], settlements: [] };
  }
  const memberIds = members.map((m) => (m._id && m._id.toString ? m._id.toString() : String(m._id)));
  const idToName = {};
  members.forEach((m) => {
    const id = m._id && m._id.toString ? m._id.toString() : String(m._id);
    idToName[id] = m.name || m.email || id;
  });

  const totalPaid = {};
  const totalOwed = {};
  memberIds.forEach((id) => {
    totalPaid[id] = 0;
    totalOwed[id] = 0;
  });

  expenses.forEach((exp) => {
    const amount = Number(exp.amount) || 0;
    if (amount <= 0) return;
    const paidById = exp.paidBy && (exp.paidBy.toString ? exp.paidBy.toString() : String(exp.paidBy));
    if (!memberIds.includes(paidById)) return;
    const splitAmong = Array.isArray(exp.splitAmong) && exp.splitAmong.length > 0
      ? exp.splitAmong.map((id) => (id && id.toString ? id.toString() : String(id))).filter((id) => memberIds.includes(id))
      : [...memberIds];
    if (splitAmong.length === 0) return;
    totalPaid[paidById] = (totalPaid[paidById] || 0) + amount;
    const sharePerPerson = Math.round((amount * 100) / splitAmong.length) / 100;
    let remainder = Math.round(amount * 100) - Math.round(sharePerPerson * 100 * splitAmong.length);
    remainder = remainder / 100;
    splitAmong.forEach((id, idx) => {
      const share = sharePerPerson + (idx === 0 ? remainder : 0);
      totalOwed[id] = (totalOwed[id] || 0) + share;
    });
  });

  const balances = memberIds.map((id) => {
    const paid = totalPaid[id] || 0;
    const owed = totalOwed[id] || 0;
    const balance = Math.round((paid - owed) * 100) / 100;
    return {
      userId: id,
      name: idToName[id],
      totalPaid: Math.round(paid * 100) / 100,
      totalOwed: Math.round(owed * 100) / 100,
      balance,
    };
  });

  const withBalance = balances.filter((b) => Math.abs(b.balance) > 0.005);
  const debtors = withBalance.filter((b) => b.balance < 0).sort((a, b) => a.balance - b.balance).map((b) => ({ ...b, balance: b.balance }));
  const creditors = withBalance.filter((b) => b.balance > 0).sort((a, b) => b.balance - a.balance).map((b) => ({ ...b, balance: b.balance }));
  const settlements = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(Math.abs(debtor.balance), creditor.balance);
    if (amount < 0.01) {
      if (Math.abs(debtor.balance) < 0.01) i++;
      if (creditor.balance < 0.01) j++;
      continue;
    }
    settlements.push({
      from: debtor.userId,
      fromName: debtor.name,
      to: creditor.userId,
      toName: creditor.name,
      amount: Math.round(amount * 100) / 100,
    });
    debtor.balance += amount;
    creditor.balance -= amount;
    if (Math.abs(debtor.balance) < 0.01) i++;
    if (creditor.balance < 0.01) j++;
  }

  return { balances, settlements };
}

/**
 * GET /api/bills
 * List bills for authenticated user. Optional query: ?archived=true|false (default: all).
 * Returns bills with expenses and participants (ids only for list).
 */
router.get('/', authenticate, requireRegistered, async (req, res) => {
  try {
    const { archived } = req.query;
    const filter = {
      $or: [
        { createdBy: req.user._id },
        { 'participants.user': req.user._id },
      ],
    };
    if (archived === 'true') filter.archived = true;
    else if (archived === 'false') filter.archived = { $ne: true };

    const bills = await Bill.find(filter)
      .populate('participants.user', 'firstName lastName email userType nickname')
      .sort({ createdAt: -1 })
      .lean();

    const billsWithMembers = (bills || []).map((b) => ({
      ...b,
      members: participantsToMembers(b.participants),
    }));
    res.json({ bills: billsWithMembers });
  } catch (err) {
    console.error('List bills error:', err);
    res.status(500).json({ error: 'Failed to load bills.' });
  }
});

/**
 * GET /api/bills/:id/search-users?q=
 * Search users (guest + registered) by email, nickname, firstName, lastName. Excludes users already in bill. Owner only.
 * Must be defined before GET /:id so "search-users" is not captured as bill id.
 */
router.get('/:id/search-users', authenticate, requireRegistered, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    if (!requireBillOwner(bill, req.user._id)) {
      return res.status(403).json({ error: 'Only the bill owner can search users.' });
    }

    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!q || q.length < 2) {
      return res.json({ users: [] });
    }

    const participantIds = (bill.participants || []).map((p) => p.user?.toString?.()).filter(Boolean);
    const searchRegex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const users = await User.find({
      _id: { $nin: participantIds },
      $or: [
        { email: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
        { nickname: searchRegex },
      ],
    })
      .select('firstName lastName email nickname userType')
      .limit(20)
      .lean();

    const list = users.map((u) => ({
      _id: u._id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      nickname: u.nickname,
      userType: u.userType,
      name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.nickname || u.email,
    }));

    res.json({ users: list });
  } catch (err) {
    console.error('Search users error:', err);
    res.status(500).json({ error: 'Failed to search users.' });
  }
});

/**
 * GET /api/bills/:id
 * Get single bill by ID or invitation code. Enforces guest 6hr limit.
 * Returns bill with members (populated participants) and expenses (paidBy populated).
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const rawBill = await findBillByIdOrCode(req.params.id);
    if (!rawBill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    if (req.user.userType === USER_TYPES.GUEST) {
      const limitErr = enforceGuestAccessLimit(req.user);
      if (limitErr) {
        return res.status(403).json({ error: limitErr, code: 'GUEST_ACCESS_EXPIRED' });
      }
      if (!canAccessBill(rawBill, req.user)) {
        return res.status(403).json({ error: 'You do not have access to this bill.' });
      }
    } else {
      if (!canAccessBill(rawBill, req.user)) {
        return res.status(403).json({ error: 'You do not have access to this bill.' });
      }
    }

    const bill = await Bill.findById(rawBill._id)
      .populate('participants.user', 'firstName lastName email userType nickname')
      .populate('expenses.paidBy', 'firstName lastName email');
    const billObj = bill.toObject ? bill.toObject() : bill;
    billObj.members = participantsToMembers(bill.participants || billObj.participants);
    if (bill.expenses && bill.expenses.length) {
      billObj.expenses = bill.expenses.map((e) => {
        const ex = e.toObject ? e.toObject() : e;
        const paidByUser = ex.paidBy;
        const paidById = typeof paidByUser === 'object' && paidByUser ? paidByUser._id : paidByUser;
        const paidByName =
          typeof paidByUser === 'object' && paidByUser
            ? [paidByUser.firstName, paidByUser.lastName].filter(Boolean).join(' ') || paidByUser.email
            : undefined;
        return { ...ex, paidBy: paidById, paidByName };
      });
    }
    billObj.split = computeBillSplit(billObj.members || [], billObj.expenses || []);
    res.json({ bill: billObj });
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
      archived: false,
      expenses: [],
    });
    await bill.save();

    const populated = await Bill.findById(bill._id)
      .populate('participants.user', 'firstName lastName email userType nickname')
      .lean();
    const billOut = { ...populated, members: participantsToMembers(populated.participants) };

    res.status(201).json({
      bill: billOut,
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

/**
 * Helper: ensure current user is the bill owner (for update/delete/regenerate/invite).
 */
function requireBillOwner(bill, userId) {
  const ownerId = bill.createdBy?.toString?.() || bill.createdBy;
  return ownerId === userId?.toString?.();
}

/**
 * PATCH /api/bills/:id
 * Update bill title or archived flag, or regenerate invitation code. Owner only.
 */
router.patch('/:id', authenticate, requireRegistered, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    if (!requireBillOwner(bill, req.user._id)) {
      return res.status(403).json({ error: 'Only the bill owner can update it.' });
    }

    const { title, archived, regenerateCode } = req.body || {};

    if (typeof title === 'string' && title.trim()) {
      bill.title = title.trim();
    }
    if (typeof archived === 'boolean') {
      bill.archived = archived;
    }
    if (regenerateCode === true) {
      let newCode = generateInvitationCode();
      while (await Bill.findOne({ invitationCode: newCode, _id: { $ne: bill._id } })) {
        newCode = generateInvitationCode();
      }
      bill.invitationCode = newCode;
    }

    await bill.save();

    const populated = await Bill.findById(bill._id)
      .populate('participants.user', 'firstName lastName email userType nickname')
      .lean();
    const out = { ...populated, members: participantsToMembers(populated.participants) };
    res.json({ bill: out });
  } catch (err) {
    console.error('PATCH bill error:', err);
    res.status(500).json({ error: 'Failed to update bill.' });
  }
});

/**
 * DELETE /api/bills/:id
 * Delete a bill permanently. Owner only.
 */
router.delete('/:id', authenticate, requireRegistered, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    if (!requireBillOwner(bill, req.user._id)) {
      return res.status(403).json({ error: 'Only the bill owner can delete it.' });
    }
    await Bill.findByIdAndDelete(req.params.id);
    res.json({ message: 'Bill deleted.' });
  } catch (err) {
    console.error('DELETE bill error:', err);
    res.status(500).json({ error: 'Failed to delete bill.' });
  }
});

/**
 * POST /api/bills/:id/members
 * Add a registered user to the bill by email. Owner only. Standard: max 3 participants per bill.
 */
router.post('/:id/members', authenticate, requireRegistered, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id).populate('participants.user');
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    if (!requireBillOwner(bill, req.user._id)) {
      return res.status(403).json({ error: 'Only the bill owner can add members.' });
    }

    const { email } = req.body || {};
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const existingUser = await User.findOne({
      email: email.trim().toLowerCase(),
      userType: { $in: [USER_TYPES.STANDARD, USER_TYPES.PREMIUM] },
    });
    if (!existingUser) {
      return res.status(404).json({ error: 'No registered user found with that email.' });
    }

    const userIdStr = existingUser._id.toString();
    const alreadyIn = (bill.participants || []).some((p) => p.user && p.user._id.toString() === userIdStr);
    if (alreadyIn) {
      return res.status(400).json({ error: 'That user is already in this bill.' });
    }

    const maxParticipants = req.user.userType === USER_TYPES.STANDARD ? 3 : 999;
    if ((bill.participants?.length || 0) >= maxParticipants) {
      return res.status(403).json({
        error:
          req.user.userType === USER_TYPES.STANDARD
            ? 'Standard accounts can add up to 3 people per bill. Upgrade to Premium for more.'
            : 'This bill has reached the maximum number of participants.',
      });
    }

    bill.participants = bill.participants || [];
    bill.participants.push({ user: existingUser._id, role: 'member' });
    await bill.save();

    const populated = await Bill.findById(bill._id)
      .populate('participants.user', 'firstName lastName email userType nickname')
      .lean();
    const out = { ...populated, members: participantsToMembers(populated.participants) };
    res.json({ bill: out });
  } catch (err) {
    console.error('Add member error:', err);
    res.status(500).json({ error: 'Failed to add member.' });
  }
});

/**
 * DELETE /api/bills/:id/members/:memberId
 * Remove a participant from the bill. Owner only. Cannot remove self (owner).
 */
router.delete('/:id/members/:memberId', authenticate, requireRegistered, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    if (!requireBillOwner(bill, req.user._id)) {
      return res.status(403).json({ error: 'Only the bill owner can remove members.' });
    }

    const ownerId = bill.createdBy?.toString?.() || bill.createdBy;
    const memberId = req.params.memberId;
    if (memberId === ownerId) {
      return res.status(400).json({ error: 'You cannot remove the bill owner.' });
    }

    bill.participants = (bill.participants || []).filter((p) => {
      const uid = p.user?.toString?.() || (p.user && String(p.user));
      return uid !== memberId;
    });
    await bill.save();

    const populated = await Bill.findById(bill._id)
      .populate('participants.user', 'firstName lastName email userType nickname')
      .lean();
    const out = { ...populated, members: participantsToMembers(populated.participants) };
    res.json({ bill: out });
  } catch (err) {
    console.error('Remove member error:', err);
    res.status(500).json({ error: 'Failed to remove member.' });
  }
});

/**
 * POST /api/bills/:id/add-guest
 * Add a guest user to the bill by first name, last name, email (create guest if new). Owner only. Validation as per registration.
 */
router.post('/:id/add-guest', authenticate, requireRegistered, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    if (!requireBillOwner(bill, req.user._id)) {
      return res.status(403).json({ error: 'Only the bill owner can add guests.' });
    }

    const { validateName, validateEmail } = await import('../utils/validation.js');
    const { firstName, lastName, email } = req.body || {};

    const fnErr = validateName(firstName, 'First name');
    if (fnErr) return res.status(400).json({ error: fnErr });
    const lnErr = validateName(lastName, 'Last name');
    if (lnErr) return res.status(400).json({ error: lnErr });
    const emailErr = validateEmail(email);
    if (emailErr) return res.status(400).json({ error: emailErr });

    const emailNorm = email.trim().toLowerCase();
    const maxParticipants = req.user.userType === USER_TYPES.STANDARD ? 3 : 999;
    if ((bill.participants?.length || 0) >= maxParticipants) {
      return res.status(403).json({
        error:
          req.user.userType === USER_TYPES.STANDARD
            ? 'Standard accounts can add up to 3 people per bill. Upgrade to Premium for more.'
            : 'This bill has reached the maximum number of participants.',
      });
    }

    let guest = await User.findOne({ email: emailNorm });
    if (guest) {
      if (guest.userType !== USER_TYPES.GUEST) {
        return res.status(400).json({ error: 'That email is already registered. Use "Add Member" to add them by email.' });
      }
      if (bill.participants?.some((p) => p.user?.toString() === guest._id.toString())) {
        return res.status(400).json({ error: 'That guest is already in this bill.' });
      }
    } else {
      guest = new User({
        userType: USER_TYPES.GUEST,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: emailNorm,
        invitationCode: bill.invitationCode || null,
        invitedBy: bill.createdBy,
        dailyAccessStart: new Date(),
      });
      try {
        await guest.save();
      } catch (saveErr) {
        if (saveErr.code === 11000 && saveErr.keyPattern?.email) {
          guest = await User.findOne({ email: emailNorm });
          if (!guest || guest.userType !== USER_TYPES.GUEST) {
            return res.status(400).json({ error: 'That email is already registered. Use "Add Member" to add them.' });
          }
          const freshBill = await Bill.findById(bill._id);
          if (freshBill?.participants?.some((p) => p.user?.toString() === guest._id.toString())) {
            return res.status(400).json({ error: 'That guest is already in this bill.' });
          }
          bill = freshBill || bill;
        } else {
          throw saveErr;
        }
      }
    }

    bill.participants = bill.participants || [];
    const alreadyInBill = bill.participants.some((p) => p.user?.toString() === guest._id.toString());
    if (!alreadyInBill) {
      bill.participants.push({ user: guest._id, role: 'member' });
      await bill.save();
    }

    const billId = bill._id;
    const populated = await Bill.findById(billId)
      .populate('participants.user', 'firstName lastName email userType nickname')
      .lean();
    const out = { ...populated, members: participantsToMembers(populated.participants) };
    res.json({ bill: out, message: 'Guest added to the bill.' });
  } catch (err) {
    console.error('Add guest error:', err);
    res.status(500).json({ error: err.message || 'Failed to add guest.' });
  }
});

/**
 * POST /api/bills/:id/participants
 * Add an existing user (guest or registered) to the bill by userId. Owner only. Used when adding from search results.
 */
router.post('/:id/participants', authenticate, requireRegistered, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    if (!requireBillOwner(bill, req.user._id)) {
      return res.status(403).json({ error: 'Only the bill owner can add participants.' });
    }

    const { userId } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const existingUser = await User.findById(userId).select('firstName lastName email userType nickname');
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const uidStr = existingUser._id.toString();
    if (bill.participants?.some((p) => p.user?.toString() === uidStr)) {
      return res.status(400).json({ error: 'That user is already in this bill.' });
    }

    const maxParticipants = req.user.userType === USER_TYPES.STANDARD ? 3 : 999;
    if ((bill.participants?.length || 0) >= maxParticipants) {
      return res.status(403).json({
        error:
          req.user.userType === USER_TYPES.STANDARD
            ? 'Standard accounts can add up to 3 people per bill. Upgrade to Premium for more.'
            : 'This bill has reached the maximum number of participants.',
      });
    }

    bill.participants = bill.participants || [];
    bill.participants.push({ user: existingUser._id, role: 'member' });
    await bill.save();

    const populated = await Bill.findById(bill._id)
      .populate('participants.user', 'firstName lastName email userType nickname')
      .lean();
    const out = { ...populated, members: participantsToMembers(populated.participants) };
    res.json({ bill: out, message: 'User added to the bill.' });
  } catch (err) {
    console.error('Add participant error:', err);
    res.status(500).json({ error: 'Failed to add user.' });
  }
});

/**
 * POST /api/bills/:id/invite-guest
 * Send guest invitation email with join link (bill invitation code). Owner only.
 */
router.post('/:id/invite-guest', authenticate, requireRegistered, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    if (!requireBillOwner(bill, req.user._id)) {
      return res.status(403).json({ error: 'Only the bill owner can invite guests.' });
    }

    const { email } = req.body || {};
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
    const joinUrl = `${CLIENT_URL}/guest/join?code=${encodeURIComponent(bill.invitationCode || '')}`;
    const inviterName = [req.user.firstName, req.user.lastName].filter(Boolean).join(' ') || req.user.nickname;

    const { sendGuestInviteEmail } = await import('../utils/email.js');
    await sendGuestInviteEmail(email.trim().toLowerCase(), joinUrl, bill.title, inviterName);

    res.json({ message: 'Invitation sent. The guest can use the link to join with the bill code.' });
  } catch (err) {
    console.error('Invite guest error:', err);
    res.status(500).json({ error: err.message || 'Failed to send invitation.' });
  }
});

/**
 * POST /api/bills/:id/expenses
 * Add an expense. paidBy must be a participant; splitType equally|custom; splitAmong optional for custom.
 */
router.post('/:id/expenses', authenticate, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    if (!canAccessBill(bill, req.user)) {
      return res.status(403).json({ error: 'You do not have access to this bill.' });
    }

    const { description, amount, paidBy, splitType, splitAmong } = req.body || {};
    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'Expense name is required' });
    }
    const numAmount = parseFloat(amount);
    if (Number.isNaN(numAmount) || numAmount < 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }
    if (!paidBy) {
      return res.status(400).json({ error: 'Paid by (member) is required' });
    }

    const participantIds = (bill.participants || []).map((p) => p.user?.toString?.()).filter(Boolean);
    if (!participantIds.includes(paidBy.toString())) {
      return res.status(400).json({ error: 'Paid by must be one of the bill participants' });
    }

    const st = splitType === 'custom' ? 'custom' : 'equally';
    let splitAmongIds = Array.isArray(splitAmong) ? splitAmong.map((id) => id.toString()) : [];
    if (st === 'custom' && splitAmongIds.length > 0) {
      const valid = splitAmongIds.every((id) => participantIds.includes(id));
      if (!valid) {
        return res.status(400).json({ error: 'Custom split must only include bill participants' });
      }
    } else if (st === 'custom') {
      splitAmongIds = [...participantIds];
    }

    bill.expenses = bill.expenses || [];
    bill.expenses.push({
      description: description.trim(),
      amount: numAmount,
      paidBy,
      splitType: st,
      splitAmong: splitAmongIds,
    });
    await bill.save();

    const added = bill.expenses[bill.expenses.length - 1];
    const populated = await Bill.findById(bill._id).populate('expenses.paidBy', 'firstName lastName email').lean();
    const ex = populated.expenses.find((e) => e._id.toString() === added._id.toString());
    const expense = ex
      ? {
          ...ex,
          paidBy: ex.paidBy?._id || ex.paidBy,
          paidByName:
            ex.paidBy && typeof ex.paidBy === 'object'
              ? [ex.paidBy.firstName, ex.paidBy.lastName].filter(Boolean).join(' ') || ex.paidBy.email
              : undefined,
        }
      : { ...added.toObject(), paidByName: undefined };

    res.status(201).json({ expense });
  } catch (err) {
    console.error('Add expense error:', err);
    res.status(500).json({ error: 'Failed to add expense.' });
  }
});

/**
 * DELETE /api/bills/:id/expenses/:expenseId
 * Remove an expense from the bill. Any participant with access can delete.
 */
router.delete('/:id/expenses/:expenseId', authenticate, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    if (!canAccessBill(bill, req.user)) {
      return res.status(403).json({ error: 'You do not have access to this bill.' });
    }

    const expenseId = req.params.expenseId;
    const before = (bill.expenses || []).length;
    bill.expenses = (bill.expenses || []).filter(
      (e) => e._id.toString() !== expenseId
    );
    if (bill.expenses.length === before) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    await bill.save();
    res.json({ message: 'Expense removed.' });
  } catch (err) {
    console.error('Delete expense error:', err);
    res.status(500).json({ error: 'Failed to delete expense.' });
  }
});

export default router;
