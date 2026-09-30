import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    email: { type: String, index: true, lowercase: true, trim: true },
    name: { type: String, default: '' },
    type: {
      type: String,
      required: true,
      enum: ['login', 'logout', 'profile_update', 'page', 'kundli', 'chat_start', 'chat_message'],
      index: true,
    },
    path: { type: String, default: '' },
    ip: { type: String, default: null },
    userAgent: { type: String, default: '' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

activitySchema.index({ createdAt: -1 });

export default mongoose.model('Activity', activitySchema);
