import { useState, useEffect } from 'react';
import { panchangApi } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function PanchangPage() {
  const { t } = useLanguage();
  const [panchang, setPanchang] = useState(null);
  const [ekadashi, setEkadashi] = useState([]);
  const [amavasya, setAmavasya] = useState([]);
  const [tab, setTab] = useState('today');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [today, ek, am] = await Promise.all([
          panchangApi.getToday(),
          panchangApi.getEkadashi(),
          panchangApi.getAmavasya(),
        ]);
        if (!cancelled) {
          setPanchang(today);
          setEkadashi((ek || []).slice(0, 6));
          setAmavasya((am || []).slice(0, 6));
        }
      } catch {
        if (!cancelled) {
          setPanchang({
            date: new Date().toISOString().split('T')[0],
            day: 'Saturday',
            tithi: 'Shukla Ekadashi',
            nakshatra: 'Rohini',
            yoga: 'Siddha',
            karana: 'Bava',
            sunrise: '06:12 AM',
            sunset: '06:45 PM',
            rahuKaal: '07:30-09:00',
            abhijitMuhurat: '11:48 AM - 12:36 PM',
            special: t('panchang.fallbackSpecial'),
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [t]);

  const tabs = [
    { id: 'today', label: t('panchang.tabs.today') },
    { id: 'ekadashi', label: t('panchang.tabs.ekadashi') },
    { id: 'amavasya', label: t('panchang.tabs.amavasya') },
  ];

  const rows = panchang
    ? [
        ['Tithi', panchang.tithi],
        ['Nakshatra', panchang.nakshatra],
        ['Yoga', panchang.yoga],
        ['Karana', panchang.karana],
        ['Sunrise', panchang.sunrise],
        ['Sunset', panchang.sunset],
        ['Rahu Kaal', panchang.rahuKaal],
        ['Abhijit Muhurat', panchang.abhijitMuhurat],
      ]
    : [];

  return (
    <div className="page">
      <div className="container">
        <header className="page-header">
          <h1>{t('panchang.title')}</h1>
          <p>{t('panchang.subtitle')}</p>
        </header>

        <div className="tab-bar">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`tab ${tab === item.id ? 'active' : ''}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="page-loading">{t('panchang.loading')}</div>
        ) : (
          <>
            {tab === 'today' && panchang && (
              <div>
                {panchang.special && (
                  <div className="special-banner">{panchang.special}</div>
                )}
                <div className="panchang-card">
                  <h2>{panchang.day}, {panchang.date}</h2>
                  {rows.map(([label, value]) => (
                    <div key={label} className="panchang-row">
                      <span>{t(`panchang.rows.${label}`)}</span>
                      <strong>{value ?? '—'}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'ekadashi' && (
              <div>
                <p className="section-sub">{t('panchang.ekadashiDesc')}</p>
                {ekadashi.map((e, i) => (
                  <div key={i} className="date-card">
                    <span className="date-primary">{e.date}</span>
                    <span className="date-day">{e.day}</span>
                    <span className="date-tithi">{e.tithi}</span>
                  </div>
                ))}
                {!ekadashi.length && <p className="section-sub">{t('panchang.empty')}</p>}
              </div>
            )}

            {tab === 'amavasya' && (
              <div>
                <p className="section-sub">{t('panchang.amavasyaDesc')}</p>
                {amavasya.map((a, i) => (
                  <div key={i} className="date-card">
                    <span className="date-primary">{a.date}</span>
                    <span className="date-day">{a.day}</span>
                    <span className="date-tithi">{a.tithi}</span>
                  </div>
                ))}
                {!amavasya.length && <p className="section-sub">{t('panchang.empty')}</p>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
