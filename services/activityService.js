import Activity from '../models/Activity.js';

export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || null;
}

export async function logActivity(req, {
  user,
  type,
  path = '',
  meta = {},
}) {
  if (!user?.email) return null;
  try {
    return await Activity.create({
      user: user._id,
      email: user.email,
      name: user.name || '',
      type,
      path: path || req.originalUrl || '',
      ip: getClientIp(req),
      userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
      meta,
    });
  } catch (err) {
    console.error('Activity log failed:', err.message);
    return null;
  }
}
