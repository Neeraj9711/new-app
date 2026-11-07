import { useState } from 'react';
import { billingApi } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PaywallModal({ guestId, open, onClose, onUnlocked }) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const startPayment = async () => {
    setBusy(true);
    setError('');
    try {
      const order = await billingApi.createOrder(guestId);

      if (order.mock || !order.configured) {
        const result = await billingApi.verifyPayment({ guestId, mock: true });
        onUnlocked?.(result.quota);
        onClose?.();
        return;
      }

      const ok = await loadRazorpayScript();
      if (!ok) {
        setError(t('paywall.scriptError'));
        return;
      }

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Astro AI',
        description: order.planName || 'Premium Monthly',
        order_id: order.orderId,
        handler: async (response) => {
          try {
            const result = await billingApi.verifyPayment({
              guestId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            onUnlocked?.(result.quota);
            onClose?.();
          } catch {
            setError(t('paywall.verifyError'));
          }
        },
        theme: { color: '#8B1A1A' },
        modal: {
          ondismiss: () => setBusy(false),
        },
      });

      rzp.open();
    } catch {
      setError(t('paywall.orderError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="paywall-overlay" role="dialog" aria-modal="true" aria-labelledby="paywall-title">
      <div className="paywall-modal">
        <button type="button" className="paywall-close" onClick={onClose} aria-label={t('paywall.close')}>
          ×
        </button>
        <p className="paywall-eyebrow">{t('paywall.eyebrow')}</p>
        <h2 id="paywall-title">{t('paywall.title')}</h2>
        <p className="paywall-sub">{t('paywall.subtitle')}</p>

        <div className="paywall-plan">
          <div className="paywall-price">
            <span className="paywall-currency">₹</span>
            <span className="paywall-amount">199</span>
            <span className="paywall-period">{t('paywall.perMonth')}</span>
          </div>
          <ul className="paywall-features">
            {t('paywall.features').map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>

        {error && <p className="paywall-error">{error}</p>}

        <button type="button" className="paywall-cta" onClick={startPayment} disabled={busy}>
          {busy ? t('paywall.processing') : t('paywall.cta')}
        </button>
        <p className="paywall-note">{t('paywall.note')}</p>
      </div>
    </div>
  );
}
