import mongoose from 'mongoose';

// Expense subdocument: each expense belongs to a bill (Paid by, With equally/custom).
const expenseSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    splitType: {
      type: String,
      enum: ['equally', 'custom'],
      default: 'equally',
    },
    // For custom split: user ids among whom the expense is divided (must be subset of participants).
    splitAmong: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { _id: true }
);

// Bill model: title, owner, participants (owner + members + guests), invitation code, archived, expenses.
const billSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    participants: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['owner', 'member'], default: 'member' },
      },
    ],
    invitationCode: {
      type: String,
      unique: true,
      uppercase: true,
      sparse: true,
    },
    archived: {
      type: Boolean,
      default: false,
    },
    expenses: [expenseSchema],
  },
  { timestamps: true }
);

export default mongoose.model('Bill', billSchema);
