import { Link } from 'react-router-dom';
import { AI_SERVICES, ZODIAC_SIGNS } from '../constants';
import { useLanguage } from '../context/LanguageContext';

function Stars({ count, ariaLabel }) {
  return (
    <span className="review-stars" aria-label={ariaLabel}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < count ? 'on' : ''}>★</span>
      ))}
    </span>
  );
}

export default function HomePage() {
  const { t } = useLanguage();
  const benefits = t('home.benefits');
  const stats = t('home.stats');
  const steps = t('home.steps');
  const testimonials = t('home.testimonials');
  const services = t('home.services');

  return (
    <div className="home">
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="live-badge">
              <span className="live-dot" aria-hidden="true" />
              {t('home.liveBadge')}
            </div>

            <h1 className="hero-title">
              {t('home.heroLine1')}
              <br />
              <span>{t('home.heroAccent')}</span> {t('home.heroLine2')}
            </h1>

            <ul className="hero-benefits">
              {benefits.map((item) => (
                <li key={item}>
                  <span className="check" aria-hidden="true">✓</span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="hero-actions">
              <Link to="/chat" className="btn btn-primary">{t('home.ctaChat')}</Link>
              <Link to="/horoscope" className="btn btn-outline">{t('home.ctaHoroscope')}</Link>
            </div>

            <div className="hero-stats">
              {stats.map((s) => (
                <div key={s.label} className="hero-stat">
                  <strong>{s.value}</strong>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="visual-card visual-card-main">
              <div className="visual-avatar">🙏</div>
              <div>
                <p className="visual-name">{t('home.visualName')}</p>
                <p className="visual-status">{t('home.visualStatus')}</p>
              </div>
            </div>
            <div className="visual-bubble bot">
              {t('home.visualBubble')}
            </div>
            <div className="visual-bubble user">15 / 08 / 1995</div>
            <div className="visual-card visual-card-kundli">
              <p className="visual-k-label">{t('home.visualKundliLabel')}</p>
              <p className="visual-k-value">{t('home.visualKundliValue')}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title">{t('home.servicesTitle')}</h2>
          <p className="section-sub">{t('home.servicesSub')}</p>
          <div className="services-grid">
            {AI_SERVICES.map((s) => (
              <Link key={s.id} to={s.path} className="service-tile" style={{ '--accent': s.color }}>
                <span className="service-icon-wrap">{s.icon}</span>
                <h3>{services[s.id]?.title || s.title}</h3>
                <p>{services[s.id]?.subtitle || s.subtitle}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <h2 className="section-title">{t('home.horoscopeTitle')}</h2>
          <p className="section-sub">{t('home.horoscopeSub')}</p>
          <div className="zodiac-grid">
            {ZODIAC_SIGNS.map((z) => (
              <Link key={z.sign} to="/horoscope" className="zodiac-tile" state={{ sign: z.sign }}>
                <span className="zodiac-symbol">{z.symbol}</span>
                <span className="zodiac-name">{t(`zodiac.${z.sign}`)}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title">{t('home.howTitle')}</h2>
          <p className="section-sub">{t('home.howSub')}</p>
          <div className="steps-grid">
            {steps.map((step, i) => (
              <div key={step.title} className="step-tile">
                <span className="step-badge">{i + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-soft reviews-section">
        <div className="container">
          <div className="reviews-header">
            <div>
              <p className="reviews-eyebrow">{t('home.reviewsEyebrow')}</p>
              <h2 className="section-title">
                {t('home.reviewsTitle1')}
                <br />
                {t('home.reviewsTitle2')}
              </h2>
              <p className="section-sub">{t('home.reviewsSub')}</p>
            </div>
            <div className="reviews-score">
              <strong>4.8</strong>
              <Stars count={5} ariaLabel={t('home.reviewsStarsAria').replace('{{count}}', '5')} />
              <span>{t('home.reviewsBasedOn')}</span>
            </div>
          </div>

          <div className="reviews-grid">
            {testimonials.map((item) => (
              <article key={item.name} className="review-card">
                <Stars
                  count={item.rating}
                  ariaLabel={t('home.reviewsStarsAria').replace('{{count}}', String(item.rating))}
                />
                <p className="review-quote">&ldquo;{item.quote}&rdquo;</p>
                <div className="review-author">
                  <span className="review-avatar" aria-hidden="true">{item.initials}</span>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.place}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-cta">
        <div className="container cta-panel">
          <h2>{t('home.ctaTitle')}</h2>
          <p>{t('home.ctaSub')}</p>
          <Link to="/chat" className="btn btn-primary">{t('home.ctaBtn')}</Link>
        </div>
      </section>
    </div>
  );
}
