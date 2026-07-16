import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    googleId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    name: { type: String, default: '' },
    photoUrl: { type: String, default: null },
    phone: { type: String, default: null, trim: true },
    phoneVerified: { type: Boolean, default: false },
    language: { type: String, default: 'hi' },
  },
  { timestamps: true },
);

export default mongoose.model('User', userSchema);
