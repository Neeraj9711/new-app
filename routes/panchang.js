import { Router } from 'express';
import { getTodayPanchang, getEkadashiDates, getAmavasyaDates } from '../services/panchangService.js';

const router = Router();

router.get('/today', (req, res) => {
  res.json(getTodayPanchang());
});

router.get('/ekadashi', (req, res) => {
  res.json(getEkadashiDates());
});

router.get('/amavasya', (req, res) => {
  res.json(getAmavasyaDates());
});

export default router;
