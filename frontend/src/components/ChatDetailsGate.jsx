import { useMemo, useState } from 'react';
import { leadsApi } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { getGuestId } from '../utils/guestId';

export const CHAT_DETAILS_KEY = 'astro_chat_details';

export function readChatDetails() {
  try {
    const raw = localStorage.getItem(CHAT_DETAILS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.firstName && parsed?.lastName && parsed?.dateOfBirth && parsed?.phone) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeChatDetails(payload) {
  try {
    localStorage.setItem(CHAT_DETAILS_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export default function ChatDetailsGate({ onComplete, onClose }) {
  const { language, t } = useLanguage();
  const guestId = useMemo(() => getGuestId(), []);
  const existing = useMemo(() => readChatDetails(), []);

  const [firstName, setFirstName] = useState(existing?.firstName || '');
  const [lastName, setLastName] = useState(existing?.lastName || '');
  const [dateOfBirth, setDateOfBirth] = useState(existing?.dateOfBirth || '');
  const [phone, setPhone] = useState(existing?.phone || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    const cleanDob = dateOfBirth.trim();
    const cleanPhone = phone.replace(/[^\d+]/g, '');

    if (!cleanFirst || !cleanLast) {
      setError(t('chatDetails.nameRequired'));
      return;
    }
    if (!cleanDob) {
      setError(t('chatDetails.dobRequired'));
      return;
    }
    if (cleanPhone.replace(/\D/g, '').length < 10) {
      setError(t('chatDetails.phoneRequired'));
      return;
    }

    setSaving(true);
    try {
      const saved = await leadsApi.saveChatDetails({
        guestId,
        firstName: cleanFirst,
        lastName: cleanLast,
        dateOfBirth: cleanDob,
        phone: cleanPhone,
        language,
        sourcePath: '/chat',
      });
      const payload = {
        firstName: saved.firstName || cleanFirst,
        lastName: saved.lastName || cleanLast,
        dateOfBirth: saved.dateOfBirth || cleanDob,
        phone: saved.phone || cleanPhone,
      };
      writeChatDetails(payload);
      onComplete?.(payload);
    } catch (err) {
      setError(err.message || t('chatDetails.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  function handleBackdropClick(event) {
    if (event.target !== event.currentTarget) return;
    if (saving) return;
    onClose?.();
  }

  return (
    <div
      className="profile-modal-backdrop chat-details-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-details-title"
      onClick={handleBackdropClick}
    >
      <form
        className="profile-modal chat-details-modal"
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="chat-details-close"
          onClick={onClose}
          aria-label={t('chatDetails.close')}
          disabled={saving}
        >
          ×
        </button>

        <h2 id="chat-details-title">{t('chatDetails.title')}</h2>
        <p>{t('chatDetails.body')}</p>

        <div className="chat-details-row">
          <label>
            {t('chatDetails.firstName')}
            <input
              type="text"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={t('chatDetails.firstNamePh')}
              required
              maxLength={60}
            />
          </label>
          <label>
            {t('chatDetails.lastName')}
            <input
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={t('chatDetails.lastNamePh')}
              required
              maxLength={60}
            />
          </label>
        </div>

        <label>
          {t('chatDetails.dob')}
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            required
            max={new Date().toISOString().slice(0, 10)}
          />
        </label>

        <label>
          {t('chatDetails.phone')}
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t('chatDetails.phonePh')}
            required
            maxLength={16}
          />
        </label>

        {error ? <p className="auth-error">{error}</p> : null}

        <button type="submit" className="profile-save" disabled={saving}>
          {saving ? t('chatDetails.saving') : t('chatDetails.continue')}
        </button>
      </form>
    </div>
  );
}
