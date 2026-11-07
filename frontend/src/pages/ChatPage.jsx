import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { chatApi } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { getGuestId } from '../utils/guestId';
import PaywallModal from '../components/PaywallModal';

export default function ChatPage() {
  const { language, t } = useLanguage();
  const guestId = useMemo(() => getGuestId(), []);
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
    if (next.paywall) setShowPaywall(true);
  }, []);

  const startNewSession = useCallback(async () => {
    try {
      setInitializing(true);
      setKundli(null);
      const data = await chatApi.createSession(language, guestId);
      setSessionId(data.sessionId);
      setMessages(data.messages || []);
      applyQuota(data.quota);
      lastLanguageRef.current = language;
    } catch {
      setMessages([{
        role: 'assistant',
        content: t('chat.offlineGreeting'),
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setInitializing(false);
    }
  }, [language, t, guestId, applyQuota]);

  useEffect(() => {
    if (!sessionId || lastLanguageRef.current !== language) {
      startNewSession();
    }
  }, [sessionId, language, startNewSession]);

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
    } catch {
      startNewSession();
    }
  };

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    if (quota?.paywall && !quota?.isSubscribed) {
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

  const quickPrompts = t('chat.quickPrompts');
  const locked = Boolean(quota?.paywall && !quota?.isSubscribed);
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
            {quota && (
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

      <PaywallModal
        guestId={guestId}
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUnlocked={(nextQuota) => {
          applyQuota(nextQuota);
          setShowPaywall(false);
        }}
      />
    </div>
  );
}
