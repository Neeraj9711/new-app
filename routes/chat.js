import { Router } from 'express';
import {
  createSession, getSession, updateSession, addMessage, resetSession,
} from '../services/sessionStore.js';
import { generateKundli } from '../services/kundliService.js';
import { getAIResponse } from '../services/aiService.js';

const router = Router();

router.post('/session', async (req, res) => {
  try {
    const language = req.body?.language || 'hi';
    const session = await createSession(language);
    res.json({
      sessionId: session.id,
      step: session.step,
      language: session.language,
      messages: session.messages,
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
    const { sessionId, message, language } = req.body;
    if (!sessionId || !message) {
      return res.status(400).json({ error: 'sessionId and message are required' });
    }

    const session = await getSession(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    if (language && (language === 'hi' || language === 'en')) {
      await updateSession(sessionId, { language });
    }

    await addMessage(sessionId, 'user', message);

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
      kundli: nextStep === 'problem' || nextStep === 'consultation' ? kundli : null,
      birthDetails,
      messages: finalSession.messages,
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
