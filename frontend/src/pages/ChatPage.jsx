import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatApi } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { getGuestId } from '../utils/guestId';
import PaywallModal from '../components/PaywallModal';
import ChatDetailsGate, { readChatDetails } from '../components/ChatDetailsGate';

function formatDobForChat(isoDate) {
  if (!isoDate) return '';
  // date input is YYYY-MM-DD → DD/MM/YYYY for pandit flow
  const m = String(isoDate).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return isoDate;
}

export default function ChatPage() {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const guestId = useMemo(() => getGuestId(), []);
  const [details, setDetails] = useState(() => readChatDetails());
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [kundli, setKundli] = useState(null);
  const [quota, setQuota] = useState(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const listRef = useRef(null);
  const lastLanguageRef = useRef(language);

  const applyQuota = useCallback((next) => {
    if (!next) return;
    setQuota(next);
    if (next.freemiumEnabled && next.paywall) setShowPaywall(true);
    else setShowPaywall(false);
  }, []);

  const startNewSession = useCallback(async () => {
    if (!details) return;
    try {
      setInitializing(true);
      setKundli(null);
      const data = await chatApi.createSession(language, guestId);
      setSessionId(data.sessionId);
      setMessages(data.messages || []);
      applyQuota(data.quota);
      lastLanguageRef.current = language;

      // Seed DOB from the intake form so chat does not ask again
      const dobText = formatDobForChat(details.dateOfBirth);
      if (dobText && data.sessionId) {
        try {
          const seeded = await chatApi.sendMessage(data.sessionId, dobText, language, guestId);
          setMessages(seeded.messages || []);
          if (seeded.kundli) setKundli(seeded.kundli);
          applyQuota(seeded.quota);
        } catch {
          /* keep greeting; user can type DOB */
        }
      }
    } catch {
      setMessages([{
        role: 'assistant',
        content: t('chat.offlineGreeting'),
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setInitializing(false);
    }
  }, [language, t, guestId, applyQuota, details]);

  useEffect(() => {
    if (!details) {
      setInitializing(false);
      return;
    }
    if (!sessionId || lastLanguageRef.current !== language) {
      startNewSession();
    }
  }, [details, sessionId, language, startNewSession]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const resetChat = async () => {
    if (!sessionId) return startNewSession();
    try {
      setKundli(null);
      const data = await chatApi.resetSession(sessionId, language);
      setMessages(data.messages || []);
      lastLanguageRef.current = language;
      const dobText = formatDobForChat(details?.dateOfBirth);
      if (dobText) {
        try {
          const seeded = await chatApi.sendMessage(sessionId, dobText, language, guestId);
          setMessages(seeded.messages || []);
          if (seeded.kundli) setKundli(seeded.kundli);
          applyQuota(seeded.quota);
        } catch {
          /* ignore */
        }
      }
    } catch {
      startNewSession();
    }
  };

  const freemiumOn = Boolean(quota?.freemiumEnabled);
  const sendMessage = async (text) => {
    if (!text.trim() || loading || !details) return;
    if (freemiumOn && quota?.paywall && !quota?.isSubscribed) {
      setShowPaywall(true);
      return;
    }

    const userMsg = text.trim();
    setInput('');
    setLoading(true);
    setMessages((prev) => [...prev, { role: 'user', content: userMsg, timestamp: new Date().toISOString() }]);

    try {
      const data = await chatApi.sendMessage(sessionId, userMsg, language, guestId);
      setMessages(data.messages);
      if (data.kundli) setKundli(data.kundli);
      applyQuota(data.quota);
    } catch (err) {
      if (err.status === 402 || err.code === 'PAYWALL') {
        applyQuota(err.quota);
        setShowPaywall(true);
        setMessages((prev) => prev.slice(0, -1));
        setInput(userMsg);
      } else {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: t('chat.offlineError'),
          timestamp: new Date().toISOString(),
        }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  if (!details) {
    return (
      <ChatDetailsGate
        onComplete={(payload) => setDetails(payload)}
        onClose={() => navigate('/')}
      />
    );
  }

  const quickPrompts = t('chat.quickPrompts');
  const locked = Boolean(freemiumOn && quota?.paywall && !quota?.isSubscribed);
  const remainingLabel = quota?.isSubscribed
    ? t('chat.premiumActive')
    : t('chat.freeRemaining').replace('{{count}}', String(quota?.promptsRemaining ?? 5));

  return (
    <div className="chat-page">
      <div className="container chat-shell">
        <div className="chat-header">
          <div className="chat-header-left">
            <div className="avatar">🙏</div>
            <div>
              <h1>{t('chat.title')}</h1>
              <p className="online">{t('chat.subtitle')}</p>
            </div>
          </div>
          <div className="chat-header-actions">
            {freemiumOn && quota && (
              <span className={`quota-pill ${quota.isSubscribed ? 'premium' : ''}`}>
                {remainingLabel}
              </span>
            )}
            <button type="button" className="btn-reset" onClick={resetChat}>{t('chat.newChat')}</button>
          </div>
        </div>

        {kundli && (
          <div className="kundli-banner">
            ✨ {t('chat.kundliBanner')}: {kundli.sunSign} ☀️ · {kundli.moonSign} 🌙 · {kundli.lagna} {t('chat.lagna')} · {kundli.nakshatra}
          </div>
        )}

        <div className="chat-messages" ref={listRef}>
          {initializing ? (
            <div className="chat-loading">{t('chat.connecting')}</div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`bubble ${m.role === 'user' ? 'user' : 'bot'}`}>
                {m.content}
              </div>
            ))
          )}
          {loading && !initializing && (
            <div className="typing">{t('chat.typing')}</div>
          )}
        </div>

        {kundli && !loading && !locked && (
          <div className="quick-prompts">
            {quickPrompts.map((p) => (
              <button key={p} type="button" className="prompt-chip" onClick={() => sendMessage(p)}>
                {p}
              </button>
            ))}
          </div>
        )}

        {locked ? (
          <div className="chat-locked-bar">
            <p>{t('chat.limitReached')}</p>
            <button type="button" className="btn-unlock" onClick={() => setShowPaywall(true)}>
              {t('chat.unlockCta')}
            </button>
          </div>
        ) : (
          <form className="chat-input-row" onSubmit={onSubmit}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('chat.placeholder')}
              maxLength={500}
              disabled={loading}
            />
            <button type="submit" className="send-btn" disabled={!input.trim() || loading}>
              ➤
            </button>
          </form>
        )}
      </div>

      {freemiumOn && (
        <PaywallModal
          guestId={guestId}
          open={showPaywall}
          onClose={() => setShowPaywall(false)}
          onUnlocked={(nextQuota) => {
            applyQuota(nextQuota);
            setShowPaywall(false);
          }}
        />
      )}
    </div>
  );
}
