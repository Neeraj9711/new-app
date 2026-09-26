import { Link, useLocation } from 'react-router-dom';
import LanguageToggle from './LanguageToggle';
import { useLanguage } from '../context/LanguageContext';

export default function Header() {
  const location = useLocation();
  const { t } = useLanguage();
  const isActive = (path) => {
    if (path === '/horoscope') {
      return location.pathname.startsWith('/horoscope') || location.pathname.startsWith('/rashifal')
        ? 'active'
        : '';
    }
    return location.pathname === path ? 'active' : '';
  };

  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="logo">
          <span className="logo-badge" aria-hidden="true">✦</span>
          <span>Astro AI</span>
        </Link>
        <nav>
          <ul className="nav-links">
            <li><Link to="/" className={isActive('/')}>{t('nav.home')}</Link></li>
            <li><Link to="/chat" className={isActive('/chat')}>{t('nav.chat')}</Link></li>
            <li><Link to="/kundli" className={isActive('/kundli')}>{t('nav.kundli')}</Link></li>
            <li><Link to="/horoscope" className={isActive('/horoscope')}>{t('nav.horoscope')}</Link></li>
            <li><Link to="/panchang" className={isActive('/panchang')}>{t('nav.panchang')}</Link></li>
          </ul>
        </nav>
        <div className="header-actions">
          <LanguageToggle />
          <Link to="/chat" className="header-cta">{t('nav.cta')}</Link>
        </div>
      </div>
    </header>
  );
}
