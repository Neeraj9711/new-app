import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ZODIAC_SIGNS, getZodiacBySlug, rashifalPath } from '../constants';
import { horoscopeApi } from '../services/api';
import StarRating from '../components/StarRating';
import ShareButton from '../components/ShareButton';
import { useLanguage } from '../context/LanguageContext';
import { resolveZodiac } from '../../../seoConfig.js';

export default function HoroscopePage() {
  const { t } = useLanguage();
  const { slug } = useParams();
  const fromUrl = getZodiacBySlug(slug);
  const [selected, setSelected] = useState(fromUrl?.sign || '');
  const [horoscope, setHoroscope] = useState(null);
  const [loading, setLoading] = useState(Boolean(fromUrl));

  useEffect(() => {
    const match = getZodiacBySlug(slug);
    setSelected(match?.sign || '');
  }, [slug]);

  useEffect(() => {
    if (!selected) {
      setHoroscope(null);
      setLoading(false);
      return;
    }
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

  const zodiacMeta = resolveZodiac(selected) || fromUrl;
  const pagePath = zodiacMeta ? rashifalPath(zodiacMeta) : '/horoscope';

  return (
    <div className="page">
      <div className="container">
        <header className="page-header">
          <h1>
            {zodiacMeta
              ? t('horoscope.signTitle').replace('{{sign}}', t(`zodiac.${zodiacMeta.sign}`))
              : t('horoscope.title')}
          </h1>
          <p>{zodiacMeta ? t('horoscope.signSubtitle') : t('horoscope.subtitle')}</p>
        </header>

        <p className="seo-intro">
          {zodiacMeta ? t('horoscope.signIntro').replace('{{sign}}', t(`zodiac.${zodiacMeta.sign}`)) : t('horoscope.indexIntro')}
        </p>

        <div className="zodiac-bar">
          {ZODIAC_SIGNS.map((z) => (
            <Link
              key={z.sign}
              to={rashifalPath(z)}
              className={`zodiac-item ${selected === z.sign ? 'active' : ''}`}
              onClick={() => setSelected(z.sign)}
            >
              <span>{z.symbol}</span>
              <span>{t(`zodiac.${z.sign}`)}</span>
            </Link>
          ))}
        </div>

        {!selected && (
          <p className="section-sub">{t('horoscope.pickSign')}</p>
        )}

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

            <div className="hero-actions" style={{ marginTop: '1.25rem' }}>
              <ShareButton
                path={pagePath}
                text={t('horoscope.shareText').replace('{{sign}}', t(`zodiac.${horoscope.sign}`))}
              />
              <Link to="/kundli" className="btn btn-outline">{t('horoscope.ctaKundli')}</Link>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
