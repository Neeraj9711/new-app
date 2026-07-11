import { v4 as uuidv4 } from 'uuid';
import ChatSession from '../models/ChatSession.js';

const STEPS = ['greeting', 'dob', 'birthTime', 'birthPlace', 'problem', 'consultation'];

const GREETINGS = {
  hi: `🙏 नमस्ते! मैं **पंडित जी** हूं, Astro AI पर आपका AI वैदिक ज्योतिषी।

मैं आपकी कुंडली (जन्म कुंडली) का अध्ययन करूंगा और जीवन के प्रश्नों में मार्गदर्शन दूंगा — विवाह, करियर, स्वास्थ्य और अन्य।

शुरू करने के लिए, कृपया अपनी **जन्म तिथि** साझा करें (जैसे, 15/08/1995)।`,
  en: `🙏 Namaste! I am **Pandit Ji**, your AI Vedic astrologer on Astro AI.

I will study your Kundli (birth chart) and guide you through life's questions — marriage, career, health, and more.

To begin, please share your **Date of Birth** (e.g., 15/08/1995).`,
};

function toSession(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    id: obj.sessionId,
    language: obj.language,
    step: obj.step,
    birthDetails: obj.birthDetails,
    kundli: obj.kundli,
    messages: obj.messages,
    createdAt: obj.createdAt instanceof Date ? obj.createdAt.toISOString() : obj.createdAt,
  };
}

export function getGreeting(language = 'hi') {
  return GREETINGS[language] || GREETINGS.hi;
}

export async function createSession(language = 'hi') {
  const lang = language === 'en' ? 'en' : 'hi';
  const id = uuidv4();
  const doc = await ChatSession.create({
    sessionId: id,
    language: lang,
    step: 'dob',
    birthDetails: { dateOfBirth: null, birthTime: null, birthPlace: null },
    kundli: null,
    messages: [{ role: 'assistant', content: getGreeting(lang), timestamp: new Date().toISOString() }],
  });
  return toSession(doc);
}

export async function getSession(id) {
  const doc = await ChatSession.findOne({ sessionId: id });
  return toSession(doc);
}

export async function updateSession(id, updates) {
  const doc = await ChatSession.findOneAndUpdate(
    { sessionId: id },
    { $set: updates },
    { new: true },
  );
  return toSession(doc);
}

export async function addMessage(id, role, content) {
  const doc = await ChatSession.findOneAndUpdate(
    { sessionId: id },
    { $push: { messages: { role, content, timestamp: new Date().toISOString() } } },
    { new: true },
  );
  return toSession(doc);
}

export function advanceStep(currentStep) {
  const idx = STEPS.indexOf(currentStep);
  if (idx === -1 || idx >= STEPS.length - 1) return 'consultation';
  return STEPS[idx + 1];
}

export async function resetSession(id, language) {
  const existing = await ChatSession.findOne({ sessionId: id });
  if (!existing) return null;

  const lang = language === 'en' ? 'en' : (language || existing.language || 'hi');
  const doc = await ChatSession.findOneAndUpdate(
    { sessionId: id },
    {
      $set: {
        language: lang,
        step: 'dob',
        birthDetails: { dateOfBirth: null, birthTime: null, birthPlace: null },
        kundli: null,
        messages: [{ role: 'assistant', content: getGreeting(lang), timestamp: new Date().toISOString() }],
      },
    },
    { new: true },
  );
  return toSession(doc);
}

export { STEPS };
