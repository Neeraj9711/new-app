import { Router } from 'express';
import ChatLead from '../models/ChatLead.js';
import { getClientIp } from '../services/activityService.js';

const router = Router();

function cleanName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 60);
}

function cleanPhone(value) {
  return String(value || '').replace(/[^\d+]/g, '').slice(0, 16);
}

function cleanDob(value) {
  return String(value || '').trim().slice(0, 32);
}

function isValidDob(value) {
  // Accept YYYY-MM-DD from date input, or DD/MM/YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(value);
    return !Number.isNaN(d.getTime());
  }
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(value)) return true;
  return false;
}

router.post('/chat-details', async (req, res) => {
  try {
    const guestId = String(req.body?.guestId || '').trim().slice(0, 80);
    const firstName = cleanName(req.body?.firstName);
    const lastName = cleanName(req.body?.lastName);
    const dateOfBirth = cleanDob(req.body?.dateOfBirth);
    const phone = cleanPhone(req.body?.phone);
    const language = req.body?.language === 'en' ? 'en' : 'hi';
    const sourcePath = String(req.body?.sourcePath || '/chat').trim().slice(0, 120) || '/chat';

    if (!guestId) {
      return res.status(400).json({ error: 'guestId is required' });
    }
    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }
    if (!dateOfBirth || !isValidDob(dateOfBirth)) {
      return res.status(400).json({ error: 'Valid date of birth is required' });
    }
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      return res.status(400).json({ error: 'Valid phone number is required' });
    }

    const lead = await ChatLead.findOneAndUpdate(
      { guestId },
      {
        $set: {
          firstName,
          lastName,
          dateOfBirth,
          phone,
          language,
          sourcePath,
          ip: getClientIp(req),
          userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    res.json({
      ok: true,
      id: lead._id.toString(),
      firstName: lead.firstName,
      lastName: lead.lastName,
      dateOfBirth: lead.dateOfBirth,
      phone: lead.phone,
    });
  } catch (err) {
    console.error('Chat lead save error:', err);
    res.status(500).json({ error: 'Failed to save details' });
  }
});

export default router;
