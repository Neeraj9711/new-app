import { Router } from 'express';
import User from '../models/User.js';
import Activity from '../models/Activity.js';

const router = Router();

function getAdminSecret() {
  return process.env.ADMIN_SECRET || 'nhy6NHY^';
}

function requireAdmin(req, res, next) {
  const secret = getAdminSecret();
  const provided = req.headers['x-admin-secret'] || req.query.secret;
  if (!provided || provided !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.use(requireAdmin);

router.get('/users', async (_req, res) => {
  try {
    const users = await User.find({})
      .sort({ lastLoginAt: -1, createdAt: -1 })
      .limit(500)
      .lean();
    res.json({
      count: users.length,
      users: users.map((user) => ({
        id: user._id.toString(),
        name: user.name || '',
        email: user.email,
        phone: user.phone || null,
        city: user.city || null,
        language: user.language,
        loginCount: user.loginCount || 0,
        lastLoginAt: user.lastLoginAt || null,
        lastLoginIp: user.lastLoginIp || null,
        createdAt: user.createdAt,
      })),
    });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

router.get('/activity', async (_req, res) => {
  try {
    const activity = await Activity.find({})
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();
    res.json({
      count: activity.length,
      activity: activity.map((item) => ({
        id: item._id.toString(),
        email: item.email,
        name: item.name,
        type: item.type,
        path: item.path,
        ip: item.ip,
        meta: item.meta || {},
        createdAt: item.createdAt,
      })),
    });
  } catch (err) {
    console.error('Admin activity error:', err);
    res.status(500).json({ error: 'Failed to load activity' });
  }
});

export default router;
