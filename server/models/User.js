import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// User type constants - enforced at database level
export const USER_TYPES = Object.freeze({
  GUEST: 'guest',
  STANDARD: 'standard',
  PREMIUM: 'premium',
});

// Schema definition for all user types
const userSchema = new mongoose.Schema(
  {
    userType: {
      type: String,
      enum: Object.values(USER_TYPES),
      required: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    nickname: {
      type: String,
      required: function () {
        return this.userType !== USER_TYPES.GUEST;
      },
      trim: true,
      unique: true,
      sparse: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    username: {
      type: String,
      required: function () {
        return this.userType !== USER_TYPES.GUEST;
      },
      trim: true,
      unique: true,
      sparse: true,
    },
    password: {
      type: String,
      required: function () {
        return this.userType !== USER_TYPES.GUEST;
      },
      select: false,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerifyToken: { type: String },
    emailVerifyExpires: { type: Date },
    resendConfirmationSentAt: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    invitationCode: {
      type: String,
    },
    dailyAccessStart: {
      type: Date,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes: invitationCode is queried often during guest join flows.
userSchema.index({ invitationCode: 1 }, { sparse: true });

// Hash password before saving (only for registered users and when password is modified)
userSchema.pre('save', async function () {
  if (this.userType === USER_TYPES.GUEST && !this.password) return;
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password (reusable across contexts)
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Virtual to check if guest has exceeded 6hr daily access
userSchema.virtual('canAccessAsGuest').get(function () {
  if (this.userType !== USER_TYPES.GUEST) return true;
  if (!this.dailyAccessStart) return true;
  const sixHoursMs = 6 * 60 * 60 * 1000;
  return Date.now() - this.dailyAccessStart < sixHoursMs;
});

// Ensure virtuals are included in JSON
userSchema.set('toJSON', { virtuals: true });

export default mongoose.model('User', userSchema);
