import { useState, useEffect, useRef, useCallback } from 'react';
import { chatApi } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function ChatPage() {
  const { language, t } = useLanguage();
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [kundli, setKundli] = useState(null);
  const listRef = useRef(null);
  const lastLanguageRef = useRef(language);

  const startNewSession = useCallback(async () => {
    try {
      setInitializing(true);
      setKundli(null);
      const data = await chatApi.createSession(language);
      setSessionId(data.sessionId);
      setMessages(data.messages || []);
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
  }, [language, t]);

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
    const userMsg = text.trim();
    setInput('');
    setLoading(true);
    setMessages((prev) => [...prev, { role: 'user', content: userMsg, timestamp: new Date().toISOString() }]);

    try {
      const data = await chatApi.sendMessage(sessionId, userMsg, language);
      setMessages(data.messages);
      if (data.kundli) setKundli(data.kundli);
    } catch {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: t('chat.offlineError'),
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const quickPrompts = t('chat.quickPrompts');

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
          <button type="button" className="btn-reset" onClick={resetChat}>{t('chat.newChat')}</button>
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

        {kundli && !loading && (
          <div className="quick-prompts">
            {quickPrompts.map((p) => (
              <button key={p} type="button" className="prompt-chip" onClick={() => sendMessage(p)}>
                {p}
              </button>
            ))}
          </div>
        )}

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
      </div>
    </div>
  );
}
