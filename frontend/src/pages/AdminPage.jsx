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
      const [userData, activityData] = await Promise.all([
        adminApi.users(secret),
        adminApi.activity(secret),
      ]);
      setUsers(userData.users || []);
      setActivity(activityData.activity || []);
      setLoaded(true);
    } catch (err) {
      setUsers([]);
      setActivity([]);
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
