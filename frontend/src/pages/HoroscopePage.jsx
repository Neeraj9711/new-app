import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ZODIAC_SIGNS } from '../constants';
import { horoscopeApi } from '../services/api';
import StarRating from '../components/StarRating';
import { useLanguage } from '../context/LanguageContext';

export default function HoroscopePage() {
  const { t } = useLanguage();
  const location = useLocation();
  const initial = location.state?.sign || 'Cancer';
  const [selected, setSelected] = useState(initial);
  const [horoscope, setHoroscope] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await horoscopeApi.getBySign(selected);
        if (!cancelled) setHoroscope(data);
      } catch {
        if (!cancelled) {
          setHoroscope({
            sign: selected,
            symbol: ZODIAC_SIGNS.find((z) => z.sign === selected)?.symbol || '♋',
            element: 'Water',
            mood: 'Blessed',
            love: 4,
            career: 3,
            money: 4,
            health: 4,
            luckyNumber: 7,
            luckyColor: 'Saffron',
            forecast: t('horoscope.fallbackForecast'),
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selected, t]);

  return (
    <div className="page">
      <div className="container">
        <header className="page-header">
          <h1>{t('horoscope.title')}</h1>
          <p>{t('horoscope.subtitle')}</p>
        </header>

        <div className="zodiac-bar">
          {ZODIAC_SIGNS.map((z) => (
            <button
              key={z.sign}
              type="button"
              className={`zodiac-item ${selected === z.sign ? 'active' : ''}`}
              onClick={() => setSelected(z.sign)}
            >
              <span>{z.symbol}</span>
              <span>{t(`zodiac.${z.sign}`)}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="page-loading">{t('horoscope.loading')}</div>
        ) : horoscope && (
          <article className="horoscope-card">
            <div className="horoscope-top">
              <span className="big-symbol">{horoscope.symbol}</span>
              <div>
                <h2>{t(`zodiac.${horoscope.sign}`) || horoscope.sign}</h2>
                <p>
                  {t(`horoscope.elements.${horoscope.element}`) || horoscope.element}
                  {' · '}
                  {t('horoscope.today')}
                </p>
              </div>
              <span className="mood-badge">
                {t(`horoscope.moods.${horoscope.mood}`) || horoscope.mood}
              </span>
            </div>

            <div className="ratings">
              {[
                { label: t('horoscope.love'), stars: horoscope.love },
                { label: t('horoscope.career'), stars: horoscope.career },
                { label: t('horoscope.money'), stars: horoscope.money },
                { label: t('horoscope.health'), stars: horoscope.health },
              ].map((r) => (
                <div key={r.label} className="rating-row">
                  <span>{r.label}</span>
                  <StarRating count={r.stars} />
                </div>
              ))}
            </div>

            <p className="forecast">{horoscope.forecast}</p>

            <div className="lucky-row">
              <div className="lucky-item">
                <span className="lucky-label">{t('horoscope.luckyNumber')}</span>
                <span className="lucky-value">{horoscope.luckyNumber}</span>
              </div>
              <div className="lucky-item">
                <span className="lucky-label">{t('horoscope.luckyColor')}</span>
                <span className="lucky-value">{horoscope.luckyColor}</span>
              </div>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
