import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import LanguageToggle from '../components/LanguageToggle';
import { useLanguage } from '../context/LanguageContext';
import '../styles/reel.css';

const ZODIAC = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

export default function ReelPage() {
  const { t, setLanguage } = useLanguage();
  const chips = t('reel.chips');
  const features = t('reel.features');
  const topics = t('reel.topics');

  useEffect(() => {
    setLanguage('hi');
  }, [setLanguage]);

  const stars = useMemo(
    () => Array.from({ length: 72 }, (_, i) => ({
      id: i,
      left: `${(i * 17) % 100}%`,
      top: `${(i * 29) % 100}%`,
      size: i % 9 === 0 ? 3 : i % 4 === 0 ? 2 : 1,
      delay: `${(i % 12) * 0.35}s`,
      duration: `${2.4 + (i % 5) * 0.6}s`,
    })),
    [],
  );

  return (
    <div className="reel-page">
      <div className="reel-sky" aria-hidden="true">
        {stars.map((star) => (
          <span
            key={star.id}
            className="reel-star"
            style={{
              left: star.left,
              top: star.top,
              width: star.size,
              height: star.size,
              animationDelay: star.delay,
              animationDuration: star.duration,
            }}
          />
        ))}
        <div className="reel-nebula reel-nebula-a" />
        <div className="reel-nebula reel-nebula-b" />
        <div className="reel-moon" />
      </div>

      <header className="reel-top">
        <Link to="/" className="reel-brand">
          <span className="reel-brand-mark" aria-hidden="true">✦</span>
          <span>{t('reel.brand')}</span>
        </Link>
        <div className="reel-top-actions">
          <LanguageToggle />
          <Link to="/" className="reel-home-link">{t('reel.home')}</Link>
        </div>
      </header>

      <section className="reel-hero">
        <div className="reel-orbit-wrap" aria-hidden="true">
          <div className="reel-ring reel-ring-outer" />
          <div className="reel-ring reel-ring-mid" />
          <div className="reel-mandala" />
          <div className="reel-core">
            <span>🙏</span>
          </div>
          {ZODIAC.map((sign, i) => (
            <span
              key={sign}
              className="reel-zodiac"
              style={{ transform: `rotate(${i * 30}deg) translateY(-142px) rotate(${-i * 30}deg)` }}
            >
              {sign}
            </span>
          ))}
        </div>

        <p className="reel-kicker">
          <span className="reel-live" />
          {t('reel.kicker')}
        </p>
        <h1 className="reel-headline">{t('reel.headline')}</h1>
        <p className="reel-sub">{t('reel.sub')}</p>

        <ul className="reel-chips">
          {chips.map((chip) => (
            <li key={chip}>{chip}</li>
          ))}
        </ul>

        <div className="reel-actions">
          <Link to="/chat" className="reel-cta">{t('reel.cta')}</Link>
          <Link to="/kundli" className="reel-cta-ghost">{t('reel.ctaKundli')}</Link>
        </div>
        <p className="reel-url">meraastro.in</p>
        <p className="reel-proof">{t('reel.proof')}</p>
      </section>

      <section className="reel-section">
        <h2>{t('reel.featuresTitle')}</h2>
        <div className="reel-features">
          {features.map((item) => (
            <article key={item.title} className="reel-feature">
              <span aria-hidden="true">{item.icon}</span>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="reel-section reel-split">
        <div className="reel-phone" aria-hidden="true">
          <div className="reel-phone-bar">
            <div>
              <strong>{t('reel.chatName')}</strong>
              <small>{t('reel.chatStatus')}</small>
            </div>
            <span className="reel-phone-dot" />
          </div>
          <div className="reel-bubble bot">{t('reel.chatBot')}</div>
          <div className="reel-bubble user">{t('reel.chatUser')}</div>
        </div>

        <div>
          <h2>{t('reel.topicsTitle')}</h2>
          <div className="reel-topics">
            {topics.map((topic) => (
              <Link key={topic} to="/chat" className="reel-topic">{topic}</Link>
            ))}
          </div>
        </div>
      </section>

      <div className="reel-sticky">
        <Link to="/chat" className="reel-cta reel-cta-sticky">{t('reel.sticky')}</Link>
      </div>
    </div>
  );
}
