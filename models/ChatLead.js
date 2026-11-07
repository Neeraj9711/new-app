import mongoose from 'mongoose';

const chatLeadSchema = new mongoose.Schema(
  {
    guestId: { type: String, required: true, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    dateOfBirth: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    language: { type: String, default: 'hi' },
    sourcePath: { type: String, default: '/chat' },
    ip: { type: String, default: null },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true },
);

chatLeadSchema.index({ createdAt: -1 });
chatLeadSchema.index({ guestId: 1, createdAt: -1 });

export default mongoose.model('ChatLead', chatLeadSchema);
