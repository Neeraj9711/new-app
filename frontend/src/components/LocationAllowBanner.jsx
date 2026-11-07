import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { readCachedGps, requestPreciseLocation, trackWebsiteVisit } from '../utils/visitTracker';

const DISMISS_KEY = 'astro_loc_banner_dismissed';

export default function LocationAllowBanner() {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (pathname.startsWith('/admin') || pathname.startsWith('/login')) {
      setVisible(false);
      return;
    }
    try {
      if (readCachedGps()?.city || readCachedGps()?.state) {
        setVisible(false);
        return;
      }
      if (localStorage.getItem(DISMISS_KEY) === '1') {
        setVisible(false);
        return;
      }
    } catch {
      /* ignore */
    }
    setVisible(true);
  }, [pathname]);

  if (!visible) return null;

  const onAllow = async () => {
    setBusy(true);
    const place = await requestPreciseLocation();
    setBusy(false);
    if (place?.city || place?.state || place?.latitude) {
      trackWebsiteVisit(pathname);
      setVisible(false);
    }
  };

  const onDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  return (
    <div className="loc-banner" role="region" aria-label={t('location.aria')}>
      <p>{t('location.message')}</p>
      <div className="loc-banner-actions">
        <button type="button" className="loc-allow" onClick={onAllow} disabled={busy}>
          {busy ? t('location.working') : t('location.allow')}
        </button>
        <button type="button" className="loc-dismiss" onClick={onDismiss}>
          {t('location.dismiss')}
        </button>
      </div>
    </div>
  );
}
