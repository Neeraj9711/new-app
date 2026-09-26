import { useLanguage } from '../context/LanguageContext';
import { SITE_ORIGIN } from '../../../seoConfig.js';

export default function ShareButton({ path, text }) {
  const { t } = useLanguage();
  const url = `${SITE_ORIGIN}${path}`;
  const href = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;

  return (
    <a className="share-btn" href={href} target="_blank" rel="noopener noreferrer">
      {t('share.whatsapp')}
    </a>
  );
}
