import { useState } from 'react';
import { Link } from 'react-router-dom';
import { kundliApi } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import ShareButton from '../components/ShareButton';

export default function KundliPage() {
  const { t } = useLanguage();
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [kundli, setKundli] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setKundli(null);
    if (!dateOfBirth || !birthTime || !birthPlace.trim()) {
      setError(t('kundli.required'));
      return;
    }
    setLoading(true);
    try {
      const data = await kundliApi.generate(dateOfBirth, birthTime, birthPlace.trim());
      setKundli(data);
    } catch {
      setError(t('kundli.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="container">
        <header className="page-header">
          <h1>{t('kundli.title')}</h1>
          <p>{t('kundli.subtitle')}</p>
        </header>

        <p className="seo-intro">{t('kundli.intro')}</p>

        <form className="seo-form" onSubmit={onSubmit}>
          <label>
            <span>{t('kundli.dob')}</span>
            <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} required />
          </label>
          <label>
            <span>{t('kundli.time')}</span>
            <input type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} required />
          </label>
          <label>
            <span>{t('kundli.place')}</span>
            <input
              type="text"
              value={birthPlace}
              onChange={(e) => setBirthPlace(e.target.value)}
              placeholder={t('kundli.placePh')}
              required
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? t('kundli.loading') : t('kundli.submit')}
          </button>
        </form>

        {error && <p className="form-error">{error}</p>}

        {kundli && (
          <article className="kundli-result">
            <h2>{t('kundli.resultTitle')}</h2>
            <p className="forecast">{kundli.summary}</p>
            <div className="panchang-card">
              {[
                [t('kundli.sun'), kundli.sunSign],
                [t('kundli.moon'), kundli.moonSign],
                [t('kundli.lagna'), kundli.lagna],
                [t('kundli.nakshatra'), kundli.nakshatra],
                [t('kundli.dasha'), kundli.currentDasha],
              ].map(([label, value]) => (
                <div key={label} className="panchang-row">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            {kundli.predictions && (
              <div className="kundli-preds">
                <p><strong>{t('kundli.marriage')}</strong> {kundli.predictions.marriage}</p>
                <p><strong>{t('kundli.career')}</strong> {kundli.predictions.career}</p>
                <p><strong>{t('kundli.health')}</strong> {kundli.predictions.health}</p>
                <p><strong>{t('kundli.finance')}</strong> {kundli.predictions.finance}</p>
              </div>
            )}
            <div className="hero-actions">
              <Link to="/chat" className="btn btn-primary">{t('kundli.ctaChat')}</Link>
              <ShareButton path="/kundli" text={t('kundli.shareText')} />
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
