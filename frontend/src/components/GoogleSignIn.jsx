import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

let gisPromise = null;

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-gis]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Google script failed')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleGis = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google script failed'));
    document.head.appendChild(script);
  });
  return gisPromise;
}

export default function GoogleSignIn({ onSuccess }) {
  const buttonRef = useRef(null);
  const { loginWithGoogle } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        const config = await authApi.config();
        const clientId = config.googleClientId;
        if (!clientId) {
          if (!cancelled) setError(t('auth.notConfigured'));
          return;
        }
        await loadGoogleScript();
        if (cancelled || !buttonRef.current || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            setError('');
            try {
              await loginWithGoogle(response.credential);
              if (onSuccess) onSuccess();
              else {
                const from = location.state?.from || '/';
                navigate(from, { replace: true });
              }
            } catch (err) {
              setError(err.message || t('auth.failed'));
            }
          },
          auto_select: false,
          ux_mode: 'popup',
        });

        buttonRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          text: 'signin_with',
          shape: 'pill',
          width: 320,
        });
        if (!cancelled) setReady(true);
      } catch (err) {
        if (!cancelled) setError(err.message || t('auth.failed'));
      }
    }

    setup();
    return () => {
      cancelled = true;
    };
  }, [loginWithGoogle, navigate, location.state, onSuccess, t]);

  return (
    <div className="google-signin">
      {!ready && !error ? <p className="auth-hint">{t('auth.loading')}</p> : null}
      <div ref={buttonRef} className="google-signin-btn" />
      {error ? <p className="auth-error">{error}</p> : null}
    </div>
  );
}
