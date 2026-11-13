import { Router } from 'express';
import User from '../models/User.js';
import Activity from '../models/Activity.js';
import Visit from '../models/Visit.js';
import ChatLead from '../models/ChatLead.js';
import { cleanPlaceName } from '../services/geoPlace.js';
import { lookupGeoByIp } from '../services/geoService.js';

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

router.get('/visitors', async (_req, res) => {
  try {
    const [recentVisits, uniqueAgg, cityAgg, totalPageViews, uniqueCount] = await Promise.all([
      Visit.find({})
        .sort({ createdAt: -1 })
        .limit(500)
        .lean(),
      Visit.aggregate([
        { $sort: { createdAt: 1 } },
        {
          $group: {
            _id: '$visitorId',
            visits: { $sum: 1 },
            lastSeen: { $max: '$createdAt' },
            firstSeen: { $min: '$createdAt' },
            city: { $last: '$city' },
            state: { $last: '$state' },
            country: { $last: '$country' },
            vpnExitCity: { $last: '$vpnExitCity' },
            vpnExitState: { $last: '$vpnExitState' },
            ip: { $last: '$ip' },
            isp: { $last: '$isp' },
            isProxy: { $last: '$isProxy' },
            geoSource: { $last: '$geoSource' },
            lastPath: { $last: '$path' },
          },
        },
        { $sort: { lastSeen: -1 } },
        { $limit: 300 },
      ]),
      Visit.aggregate([
        {
          $group: {
            _id: {
              city: { $ifNull: ['$city', 'Unknown'] },
              state: { $ifNull: ['$state', 'Unknown'] },
              country: { $ifNull: ['$country', 'Unknown'] },
            },
            visits: { $sum: 1 },
            visitors: { $addToSet: '$visitorId' },
          },
        },
        {
          $project: {
            city: '$_id.city',
            state: '$_id.state',
            country: '$_id.country',
            visits: 1,
            uniqueVisitors: { $size: '$visitors' },
            _id: 0,
          },
        },
        { $sort: { visits: -1 } },
        { $limit: 100 },
      ]),
      Visit.countDocuments(),
      Visit.distinct('visitorId').then((ids) => ids.length),
    ]);

    res.json({
      summary: {
        totalPageViews,
        uniqueVisitors: uniqueCount,
      },
      visitors: uniqueAgg.map((row) => ({
        visitorId: row._id,
        visits: row.visits,
        city: row.city || 'Unknown',
        state: row.state || 'Unknown',
        country: row.country || 'Unknown',
        vpnExitCity: row.vpnExitCity || null,
        vpnExitState: row.vpnExitState || null,
        ip: row.ip || '—',
        isp: row.isp || '—',
        isProxy: Boolean(row.isProxy),
        geoSource: row.geoSource || 'ip',
        lastPath: row.lastPath || '—',
        firstSeen: row.firstSeen,
        lastSeen: row.lastSeen,
      })),
      byLocation: cityAgg,
      recent: recentVisits.map((item) => ({
        id: item._id.toString(),
        visitorId: item.visitorId,
        path: item.path,
        city: item.city || 'Unknown',
        state: item.state || 'Unknown',
        country: item.country || 'Unknown',
        vpnExitCity: item.vpnExitCity || null,
        vpnExitState: item.vpnExitState || null,
        ip: item.ip || '—',
        isp: item.isp || '—',
        isProxy: Boolean(item.isProxy),
        geoSource: item.geoSource || 'ip',
        language: item.language || '—',
        timezone: item.timezone || '—',
        createdAt: item.createdAt,
      })),
    });
  } catch (err) {
    console.error('Admin visitors error:', err);
    res.status(500).json({ error: 'Failed to load visitors' });
  }
});

/**
 * One-time / on-demand: rewrite junk GPS cities (e.g. Atlantic Ocean)
 * using IP geolocation for those visit rows.
 */
router.post('/fix-geo', async (_req, res) => {
  try {
    const badCityRe = /ocean|sea|atlantic|pacific|arctic|antarctic|unknown|null|undefined/i;
    const candidates = await Visit.find({
      $or: [
        { city: badCityRe },
        { state: badCityRe },
        { city: null, geoSource: 'gps' },
        { city: { $in: ['', '—', '-', 'Unknown', 'Atlantic Ocean'] } },
      ],
      ip: { $nin: [null, '', '—'] },
    })
      .select('_id ip city state country countryCode geoSource isProxy isHosting')
      .limit(2000)
      .lean();

    const byIp = new Map();
    for (const row of candidates) {
      const ip = String(row.ip || '').trim();
      if (!ip || ip === '—') continue;
      // Keep rows that already have a valid city
      if (cleanPlaceName(row.city)) continue;
      if (!byIp.has(ip)) byIp.set(ip, []);
      byIp.get(ip).push(row._id);
    }

    let updated = 0;
    let skipped = 0;
    const samples = [];

    for (const [ip, ids] of byIp) {
      const geo = await lookupGeoByIp(ip);
      const city = cleanPlaceName(geo.city);
      const state = cleanPlaceName(geo.state);
      if (!city && !state) {
        skipped += ids.length;
        continue;
      }

      const vpnLike = Boolean(geo.isProxy || geo.isHosting);
      const setDoc = {
        city: city || null,
        state: state || null,
        country: geo.country || null,
        countryCode: geo.countryCode || null,
        isp: geo.isp || null,
        org: geo.org || null,
        isProxy: vpnLike,
        isHosting: Boolean(geo.isHosting),
        geoSource: 'ip',
      };
      if (vpnLike) {
        setDoc.vpnExitCity = city;
        setDoc.vpnExitState = state;
        // For VPN exits keep visitor city unknown (same rule as live tracker)
        setDoc.city = null;
        setDoc.state = null;
        setDoc.geoSource = 'unknown';
      }

      const result = await Visit.updateMany({ _id: { $in: ids } }, { $set: setDoc });
      updated += result.modifiedCount || 0;
      if (samples.length < 8) {
        samples.push({
          ip,
          fromCount: ids.length,
          city: setDoc.city,
          state: setDoc.state,
          vpnExitCity: setDoc.vpnExitCity || null,
          country: setDoc.country,
        });
      }
    }

    res.json({
      ok: true,
      scanned: candidates.length,
      uniqueIps: byIp.size,
      updated,
      skipped,
      samples,
    });
  } catch (err) {
    console.error('Admin fix-geo error:', err);
    res.status(500).json({ error: 'Failed to fix visitor locations' });
  }
});

router.get('/leads', async (_req, res) => {
  try {
    const leads = await ChatLead.find({})
      .sort({ updatedAt: -1 })
      .limit(500)
      .lean();
    res.json({
      count: leads.length,
      leads: leads.map((lead) => ({
        id: lead._id.toString(),
        guestId: lead.guestId,
        firstName: lead.firstName,
        lastName: lead.lastName,
        dateOfBirth: lead.dateOfBirth,
        phone: lead.phone,
        language: lead.language || '—',
        sourcePath: lead.sourcePath || '/chat',
        ip: lead.ip || '—',
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
      })),
    });
  } catch (err) {
    console.error('Admin leads error:', err);
    res.status(500).json({ error: 'Failed to load chat leads' });
  }
});

export default router;
