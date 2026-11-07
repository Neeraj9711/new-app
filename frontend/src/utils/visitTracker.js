import { analyticsApi } from '../services/api';
import { getGuestId } from './guestId';

function clientMeta() {
  let timezone = '';
  let language = '';
  let screen = '';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    /* ignore */
  }
  try {
    language = navigator.language || '';
  } catch {
    /* ignore */
  }
  try {
    screen = `${window.screen?.width || 0}x${window.screen?.height || 0}`;
  } catch {
    /* ignore */
  }
  return { timezone, language, screen };
}

/**
 * Track anonymous (and logged-in) page visits for the admin portal.
 * Does not require signup.
 */
export function trackWebsiteVisit(pathname) {
  if (!pathname || pathname.startsWith('/admin')) return;

  const visitorId = getGuestId();
  const referrer = typeof document !== 'undefined' ? (document.referrer || '') : '';
  const meta = clientMeta();

  analyticsApi.visit(visitorId, pathname, referrer, meta);
}
