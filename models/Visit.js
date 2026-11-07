import mongoose from 'mongoose';

const visitSchema = new mongoose.Schema(
  {
    visitorId: { type: String, required: true, index: true },
    path: { type: String, default: '/', index: true },
    ip: { type: String, default: null, index: true },
    city: { type: String, default: null, index: true },
    state: { type: String, default: null, index: true },
    country: { type: String, default: null },
    countryCode: { type: String, default: null },
    userAgent: { type: String, default: '' },
    referrer: { type: String, default: '' },
    language: { type: String, default: null },
    timezone: { type: String, default: null },
    screen: { type: String, default: null },
  },
  { timestamps: true },
);

visitSchema.index({ createdAt: -1 });
visitSchema.index({ visitorId: 1, createdAt: -1 });

export default mongoose.model('Visit', visitSchema);
