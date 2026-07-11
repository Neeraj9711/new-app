import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: String, required: true },
  },
  { _id: false },
);

const chatSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    language: { type: String, default: 'hi' },
    step: { type: String, default: 'dob' },
    birthDetails: {
      dateOfBirth: { type: String, default: null },
      birthTime: { type: String, default: null },
      birthPlace: { type: String, default: null },
    },
    kundli: { type: mongoose.Schema.Types.Mixed, default: null },
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true },
);

export default mongoose.model('ChatSession', chatSessionSchema);
