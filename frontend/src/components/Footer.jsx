import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <h4>🔮 Astro AI</h4>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.7 }}>
              {t('footer.about')}
            </p>
          </div>
          <div>
            <h4>{t('footer.services')}</h4>
            <ul className="footer-links">
              <li><Link to="/chat">{t('footer.chat')}</Link></li>
              <li><Link to="/horoscope">{t('footer.horoscope')}</Link></li>
              <li><Link to="/panchang">{t('footer.panchang')}</Link></li>
              <li><Link to="/kundli">{t('footer.kundli')}</Link></li>
            </ul>
          </div>
          <div>
            <h4>{t('footer.quick')}</h4>
            <ul className="footer-links">
              <li><Link to="/panchang">{t('footer.ekadashi')}</Link></li>
              <li><Link to="/panchang">{t('footer.amavasya')}</Link></li>
              <li><Link to="/chat">{t('footer.marriage')}</Link></li>
              <li><Link to="/chat">{t('footer.career')}</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          {t('footer.bottom')}
        </div>
      </div>
    </footer>
  );
}
