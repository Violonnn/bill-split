import mongoose from 'mongoose';

// Bill model - will be used for invitation and sharing logic
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
  },
  { timestamps: true }
);

// Placeholder - bills detail will be extended in later tasks
export default mongoose.model('Bill', billSchema);
