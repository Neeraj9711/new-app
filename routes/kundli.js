import { Router } from 'express';
import { generateKundli } from '../services/kundliService.js';
import { optionalAuth } from '../middleware/auth.js';
import { logActivity } from '../services/activityService.js';

const router = Router();

router.post('/generate', optionalAuth, async (req, res) => {
  const { dateOfBirth, birthTime, birthPlace } = req.body;
  if (!dateOfBirth || !birthTime || !birthPlace) {
    return res.status(400).json({ error: 'dateOfBirth, birthTime, and birthPlace are required' });
  }
  const kundli = generateKundli({ dateOfBirth, birthTime, birthPlace });
  if (req.user) {
    await logActivity(req, {
      user: req.user,
      type: 'kundli',
      path: '/kundli',
      meta: { birthPlace },
    });
  }
  res.json(kundli);
});

export default router;
