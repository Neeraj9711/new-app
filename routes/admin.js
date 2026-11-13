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
 * Backfill junk/unknown cities:
 * 1) Reuse each visitor's last known real city (GPS/IP)
 * 2) Reverse-geocode stored lat/lng
 * 3) For non-VPN IPs, fill from IP lookup
 * 4) For VPN without known city, keep city empty but ensure vpnExit* is set
 */
router.post('/fix-geo', async (_req, res) => {
  try {
    const badCityRe = /ocean|sea|atlantic|pacific|arctic|antarctic|unknown|null|undefined/i;
    const missing = await Visit.find({
      $or: [
        { city: badCityRe },
        { state: badCityRe },
        { city: null },
        { city: { $in: ['', '—', '-', 'Unknown', 'Atlantic Ocean'] } },
      ],
    })
      .select('_id visitorId ip city state country countryCode latitude longitude isProxy isHosting vpnExitCity geoSource')
      .limit(3000)
      .lean();

    let updated = 0;
    let skipped = 0;
    const samples = [];

    // --- Pass 1: known city per visitorId ---
    const visitorIds = [...new Set(missing.map((r) => r.visitorId).filter(Boolean))];
    const knownByVisitor = new Map();
    for (const visitorId of visitorIds) {
      const prior = await Visit.findOne({
        visitorId,
        city: { $nin: [null, '', 'Unknown', 'Atlantic Ocean'] },
      })
        .sort({ createdAt: -1 })
        .select('city state country countryCode geoSource')
        .lean();
      const city = cleanPlaceName(prior?.city);
      const state = cleanPlaceName(prior?.state);
      if (city || state) {
        knownByVisitor.set(visitorId, {
          city,
          state,
          country: prior.country || null,
          countryCode: prior.countryCode || null,
          geoSource: prior.geoSource === 'gps' ? 'gps' : 'known',
        });
      }
    }

    for (const row of missing) {
      if (cleanPlaceName(row.city)) continue;
      const known = knownByVisitor.get(row.visitorId);
      if (!known) continue;
      await Visit.updateOne(
        { _id: row._id },
        {
          $set: {
            city: known.city,
            state: known.state,
            country: known.country || row.country,
            countryCode: known.countryCode || row.countryCode,
            geoSource: known.geoSource,
          },
        },
      );
      updated += 1;
      row.city = known.city;
      if (samples.length < 10) {
        samples.push({ id: row._id.toString(), via: 'visitor', city: known.city, state: known.state });
      }
    }

    // --- Pass 2: reverse-geocode coords still missing city ---
    const { reverseGeocode } = await import('../services/geoService.js');
    for (const row of missing) {
      if (cleanPlaceName(row.city)) continue;
      if (!Number.isFinite(row.latitude) || !Number.isFinite(row.longitude)) continue;
      const gps = await reverseGeocode(row.latitude, row.longitude);
      if (!gps?.city && !gps?.state) continue;
      await Visit.updateOne(
        { _id: row._id },
        {
          $set: {
            city: gps.city || null,
            state: gps.state || null,
            country: gps.country || row.country,
            countryCode: gps.countryCode || row.countryCode,
            geoSource: 'gps',
          },
        },
      );
      updated += 1;
      row.city = gps.city;
      if (samples.length < 10) {
        samples.push({ id: row._id.toString(), via: 'gps', city: gps.city, state: gps.state });
      }
    }

    // --- Pass 3: IP fill for remaining (non-VPN only for city; VPN gets vpnExit*) ---
    const stillBad = missing.filter((r) => !cleanPlaceName(r.city));
    const byIp = new Map();
    for (const row of stillBad) {
      const ip = String(row.ip || '').trim();
      if (!ip || ip === '—') continue;
      if (!byIp.has(ip)) byIp.set(ip, []);
      byIp.get(ip).push(row);
    }

    for (const [ip, rows] of byIp) {
      const geo = await lookupGeoByIp(ip);
      const city = cleanPlaceName(geo.city);
      const state = cleanPlaceName(geo.state);
      const vpnLike = Boolean(geo.isProxy || geo.isHosting);
      if (!city && !state) {
        skipped += rows.length;
        continue;
      }

      for (const row of rows) {
        const setDoc = vpnLike
          ? {
              vpnExitCity: city,
              vpnExitState: state,
              country: geo.country || row.country,
              countryCode: geo.countryCode || row.countryCode,
              isp: geo.isp || null,
              isProxy: true,
              isHosting: Boolean(geo.isHosting),
              // keep city as-is (still unknown) — real city needs GPS / visitor memory
            }
          : {
              city,
              state,
              country: geo.country || row.country,
              countryCode: geo.countryCode || row.countryCode,
              isp: geo.isp || null,
              isProxy: false,
              isHosting: Boolean(geo.isHosting),
              geoSource: 'ip',
            };
        const result = await Visit.updateOne({ _id: row._id }, { $set: setDoc });
        if (result.modifiedCount) updated += 1;
        if (!vpnLike) row.city = city;
        if (samples.length < 10) {
          samples.push({
            id: row._id.toString(),
            via: vpnLike ? 'vpnExit' : 'ip',
            city: vpnLike ? null : city,
            state: vpnLike ? null : state,
            vpnExitCity: vpnLike ? city : null,
          });
        }
      }
    }

    res.json({
      ok: true,
      scanned: missing.length,
      uniqueIps: byIp.size,
      knownVisitors: knownByVisitor.size,
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
