import mongoose from 'mongoose';

const usageQuotaSchema = new mongoose.Schema(
  {
    guestId: { type: String, required: true, unique: true, index: true },
    promptCount: { type: Number, default: 0 },
    isSubscribed: { type: Boolean, default: false },
    subscriptionExpiresAt: { type: Date, default: null },
    razorpayCustomerId: { type: String, default: null },
    lastPaymentId: { type: String, default: null },
  },
  { timestamps: true },
);

export default mongoose.model('UsageQuota', usageQuotaSchema);
