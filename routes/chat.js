import { Router } from 'express';
import {
  createSession, getSession, updateSession, addMessage, resetSession,
} from '../services/sessionStore.js';
import { generateKundli } from '../services/kundliService.js';
import { getAIResponse } from '../services/aiService.js';
import { optionalAuth } from '../middleware/auth.js';
import { logActivity } from '../services/activityService.js';
import {
  assertCanSendPrompt,
  consumePrompt,
  getOrCreateQuota,
  quotaPayload,
} from '../services/billingService.js';

const router = Router();

router.post('/session', optionalAuth, async (req, res) => {
  try {
    const language = req.body?.language || 'hi';
    const guestId = req.body?.guestId;
    const session = await createSession(language);
    if (req.user) {
      await logActivity(req, {
        user: req.user,
        type: 'chat_start',
        path: '/chat',
        meta: { sessionId: session.id },
      });
    }
    let quota = null;
    if (guestId) {
      const doc = await getOrCreateQuota(guestId);
      quota = quotaPayload(doc);
    }
    res.json({
      sessionId: session.id,
      step: session.step,
      language: session.language,
      messages: session.messages,
      quota,
    });
  } catch (err) {
    console.error('Create session error:', err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

router.get('/session/:id', async (req, res) => {
  try {
    const session = await getSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({
      sessionId: session.id,
      step: session.step,
      language: session.language,
      birthDetails: session.birthDetails,
      kundli: session.kundli,
      messages: session.messages,
    });
  } catch (err) {
    console.error('Get session error:', err);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

router.post('/message', async (req, res) => {
  try {
    const { sessionId, message, language, guestId } = req.body;
    if (!sessionId || !message) {
      return res.status(400).json({ error: 'sessionId and message are required' });
    }

    // Web freemium uses guestId. Mobile (no guestId yet) stays unrestricted until Play Billing.
    let quotaStatus = null;
    if (guestId) {
      try {
        ({ status: quotaStatus } = await assertCanSendPrompt(guestId));
      } catch (err) {
        if (err.code === 'PAYWALL') {
          return res.status(402).json({
            error: 'Free limit reached',
            code: 'PAYWALL',
            quota: err.quota,
          });
        }
        throw err;
      }
    }

    const session = await getSession(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    if (language && (language === 'hi' || language === 'en')) {
      await updateSession(sessionId, { language });
    }

    await addMessage(sessionId, 'user', message);
    if (guestId) {
      quotaStatus = await consumePrompt(guestId);
    }

    let { step, birthDetails } = session;
    let kundli = session.kundli;
    let nextStep = step;

    if (step === 'greeting') {
      nextStep = 'dob';
    } else if (step === 'dob') {
      birthDetails = { ...birthDetails, dateOfBirth: message };
      nextStep = 'birthTime';
    } else if (step === 'birthTime') {
      birthDetails = { ...birthDetails, birthTime: message };
      nextStep = 'birthPlace';
    } else if (step === 'birthPlace') {
      birthDetails = { ...birthDetails, birthPlace: message };
      kundli = generateKundli(birthDetails);
      nextStep = 'problem';
    } else if (step === 'problem') {
      nextStep = 'consultation';
    }

    await updateSession(sessionId, { step: nextStep, birthDetails, kundli });

    const updatedSession = await getSession(sessionId);
    const aiResult = await getAIResponse(updatedSession, message, step);
    await addMessage(sessionId, 'assistant', aiResult.content);

    const finalSession = await getSession(sessionId);
    res.json({
      sessionId,
      step: nextStep,
      language: updatedSession.language,
      reply: aiResult.content,
      source: aiResult.source,
      aiError: aiResult.error || null,
      kundli: nextStep === 'problem' || nextStep === 'consultation' ? kundli : null,
      birthDetails,
      messages: finalSession.messages,
      quota: quotaStatus,
    });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

router.post('/reset/:id', async (req, res) => {
  try {
    const language = req.body?.language;
    const session = await resetSession(req.params.id, language);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ success: true, language: session.language, messages: session.messages });
  } catch (err) {
    console.error('Reset session error:', err);
    res.status(500).json({ error: 'Failed to reset session' });
  }
});

export default router;
