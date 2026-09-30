import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const DISMISS_KEY = 'astro_profile_later';

export default function ProfileCompleteModal() {
  const { user, needsProfile, updateProfile } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const [phone, setPhone] = useState(user?.phone || '');
  const [city, setCity] = useState(user?.city || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (user?.phone) setPhone(user.phone);
    if (user?.city) setCity(user.city);
  }, [user]);

  if (!needsProfile || dismissed || location.pathname === '/admin') return null;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await updateProfile(phone, city);
    } catch (err) {
      setError(err.message || t('auth.profileFailed'));
    } finally {
      setSaving(false);
    }
  }

  function skip() {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  return (
    <div className="profile-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
      <form className="profile-modal" onSubmit={handleSubmit}>
        <h2 id="profile-modal-title">{t('auth.completeTitle')}</h2>
        <p>{t('auth.completeBody')}</p>
        <label>
          {t('auth.phone')}
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t('auth.phonePlaceholder')}
            required
          />
        </label>
        <label>
          {t('auth.city')}
          <input
            type="text"
            autoComplete="address-level2"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={t('auth.cityPlaceholder')}
            required
          />
        </label>
        {error ? <p className="auth-error">{error}</p> : null}
        <button type="submit" className="profile-save" disabled={saving}>
          {saving ? t('auth.saving') : t('auth.save')}
        </button>
        <button type="button" className="profile-later" onClick={skip}>
          {t('auth.later')}
        </button>
      </form>
    </div>
  );
}
