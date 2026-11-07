import { useState } from 'react';
import { adminApi } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const SECRET_KEY = 'astro_admin_secret';

function formatWhen(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  } catch {
    return String(value);
  }
}

export default function AdminPage() {
  const { t } = useLanguage();
  const [secret, setSecret] = useState(() => {
    try {
      return sessionStorage.getItem(SECRET_KEY) || '';
    } catch {
      return '';
    }
  });
  const [users, setUsers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [byLocation, setByLocation] = useState([]);
  const [recentVisits, setRecentVisits] = useState([]);
  const [summary, setSummary] = useState({ totalPageViews: 0, uniqueVisitors: 0 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function load(event) {
    event?.preventDefault();
    if (!secret.trim()) {
      setError(t('auth.adminNeedSecret'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      sessionStorage.setItem(SECRET_KEY, secret);
      const [userData, activityData, visitorData] = await Promise.all([
        adminApi.users(secret),
        adminApi.activity(secret),
        adminApi.visitors(secret),
      ]);
      setUsers(userData.users || []);
      setActivity(activityData.activity || []);
      setVisitors(visitorData.visitors || []);
      setByLocation(visitorData.byLocation || []);
      setRecentVisits(visitorData.recent || []);
      setSummary(visitorData.summary || { totalPageViews: 0, uniqueVisitors: 0 });
      setLoaded(true);
    } catch (err) {
      setUsers([]);
      setActivity([]);
      setVisitors([]);
      setByLocation([]);
      setRecentVisits([]);
      setLoaded(false);
      setError(err.message || t('auth.adminFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page-header admin-page">
      <div className="container">
        <h1>{t('auth.adminTitle')}</h1>
        <p>{t('auth.adminBody')}</p>
        <p className="auth-hint">{t('auth.adminHint')}</p>
        <form className="admin-secret" onSubmit={load}>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder={t('auth.adminSecret')}
            autoComplete="off"
          />
          <button type="submit" disabled={loading}>
            {loading ? t('auth.loading') : t('auth.adminLoad')}
          </button>
        </form>
        {error ? <p className="auth-error">{error}</p> : null}

        <h2>{t('auth.visitorsHeading')} ({loaded ? summary.uniqueVisitors : t('auth.adminNotLoaded')})</h2>
        {loaded ? (
          <div className="admin-stats">
            <div className="admin-stat">
              <strong>{summary.uniqueVisitors}</strong>
              <span>{t('auth.uniqueVisitors')}</span>
            </div>
            <div className="admin-stat">
              <strong>{summary.totalPageViews}</strong>
              <span>{t('auth.pageViews')}</span>
            </div>
          </div>
        ) : null}

        <h3>{t('auth.byLocationHeading')}</h3>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('auth.city')}</th>
                <th>{t('auth.state')}</th>
                <th>{t('auth.country')}</th>
                <th>{t('auth.uniqueVisitors')}</th>
                <th>{t('auth.pageViews')}</th>
              </tr>
            </thead>
            <tbody>
              {byLocation.map((row) => (
                <tr key={`${row.city}-${row.state}-${row.country}`}>
                  <td>{row.city}</td>
                  <td>{row.state}</td>
                  <td>{row.country}</td>
                  <td>{row.uniqueVisitors}</td>
                  <td>{row.visits}</td>
                </tr>
              ))}
              {loaded && byLocation.length === 0 ? (
                <tr><td colSpan={5}>{t('auth.noVisitorsYet')}</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <h3>{t('auth.visitorListHeading')}</h3>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('auth.lastSeen')}</th>
                <th>{t('auth.city')}</th>
                <th>{t('auth.state')}</th>
                <th>{t('auth.country')}</th>
                <th>{t('auth.path')}</th>
                <th>{t('auth.pageViews')}</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {visitors.map((row) => (
                <tr key={row.visitorId}>
                  <td>{formatWhen(row.lastSeen)}</td>
                  <td>{row.city}</td>
                  <td>{row.state}</td>
                  <td>{row.country}</td>
                  <td>{row.lastPath}</td>
                  <td>{row.visits}</td>
                  <td>{row.ip}</td>
                </tr>
              ))}
              {loaded && visitors.length === 0 ? (
                <tr><td colSpan={7}>{t('auth.noVisitorsYet')}</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <h3>{t('auth.recentVisitsHeading')}</h3>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('auth.when')}</th>
                <th>{t('auth.city')}</th>
                <th>{t('auth.state')}</th>
                <th>{t('auth.country')}</th>
                <th>{t('auth.path')}</th>
                <th>IP</th>
                <th>{t('auth.timezone')}</th>
              </tr>
            </thead>
            <tbody>
              {recentVisits.map((item) => (
                <tr key={item.id}>
                  <td>{formatWhen(item.createdAt)}</td>
                  <td>{item.city}</td>
                  <td>{item.state}</td>
                  <td>{item.country}</td>
                  <td>{item.path}</td>
                  <td>{item.ip}</td>
                  <td>{item.timezone || '—'}</td>
                </tr>
              ))}
              {loaded && recentVisits.length === 0 ? (
                <tr><td colSpan={7}>{t('auth.noVisitorsYet')}</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <h2>{t('auth.usersHeading')} ({loaded ? users.length : t('auth.adminNotLoaded')})</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('auth.name')}</th>
                <th>{t('auth.email')}</th>
                <th>{t('auth.phone')}</th>
                <th>{t('auth.city')}</th>
                <th>{t('auth.logins')}</th>
                <th>{t('auth.lastLogin')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name || '—'}</td>
                  <td>{user.email}</td>
                  <td>{user.phone || '—'}</td>
                  <td>{user.city || '—'}</td>
                  <td>{user.loginCount}</td>
                  <td>{formatWhen(user.lastLoginAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2>{t('auth.activityHeading')} ({loaded ? activity.length : t('auth.adminNotLoaded')})</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('auth.when')}</th>
                <th>{t('auth.name')}</th>
                <th>{t('auth.email')}</th>
                <th>{t('auth.type')}</th>
                <th>{t('auth.path')}</th>
              </tr>
            </thead>
            <tbody>
              {activity.map((item) => (
                <tr key={item.id}>
                  <td>{formatWhen(item.createdAt)}</td>
                  <td>{item.name || '—'}</td>
                  <td>{item.email}</td>
                  <td>{item.type}</td>
                  <td>{item.path || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
