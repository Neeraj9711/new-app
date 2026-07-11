import { Router } from 'express';
import { generateKundli } from '../services/kundliService.js';

const router = Router();

router.post('/generate', (req, res) => {
  const { dateOfBirth, birthTime, birthPlace } = req.body;
  if (!dateOfBirth || !birthTime || !birthPlace) {
    return res.status(400).json({ error: 'dateOfBirth, birthTime, and birthPlace are required' });
  }
  const kundli = generateKundli({ dateOfBirth, birthTime, birthPlace });
  res.json(kundli);
});

export default router;
