import { LANGUAGES } from '../i18n/translations';
import { useLanguage } from '../context/LanguageContext';

export default function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="lang-toggle" role="group" aria-label={t('nav.langAria')}>
      {Object.values(LANGUAGES).map((lang) => (
        <button
          key={lang.code}
          type="button"
          className={`lang-btn ${language === lang.code ? 'active' : ''}`}
          onClick={() => setLanguage(lang.code)}
          aria-pressed={language === lang.code}
        >
          {lang.short}
        </button>
      ))}
    </div>
  );
}
