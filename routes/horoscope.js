import { Router } from 'express';
import { getDailyHoroscope, getAllHoroscopes, ZODIAC } from '../services/horoscopeService.js';

const router = Router();

router.get('/signs', (req, res) => {
  res.json(ZODIAC);
});

router.get('/today', (req, res) => {
  res.json(getAllHoroscopes());
});

router.get('/today/:sign', (req, res) => {
  const horoscope = getDailyHoroscope(req.params.sign);
  res.json(horoscope);
});

export default router;
