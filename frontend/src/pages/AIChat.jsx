import { useState, useRef, useEffect } from 'react';
import { API_URL, DEV_NAME, BOT_NAME, BOT_IMAGE } from '../App.jsx';

const SYSTEM_WELCOME = `Bonjour ! Je suis **DENTSU AI** 🤖, l'assistant intelligent de **${BOT_NAME}** créé par **${DEV_NAME}** 🇨🇬.\n\nJe peux répondre à tes questions sur le bot, t'aider avec WhatsApp, ou simplement discuter. Comment puis-je t'aider ?`;

export default function AIChat({ t, lang }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: SYSTEM_WELCOME, time: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setError('');

    const userMsg = { role: 'user', text, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-8).map(m => ({ role: m.role, content: m.text })),
          lang,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erreur ${res.status}`);
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', text: data.reply, time: new Date() }]);
    } catch (err) {
      setError(err.message);
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: `❌ ${err.message === 'Failed to fetch' ? 'Serveur indisponible. Vérifie que Railway est en ligne.' : err.message}`,
        time: new Date(),
        isError: true,
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const fmt = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br/>');
  };

  const clear = () => {
    setMessages([{ role: 'assistant', text: SYSTEM_WELCOME, time: new Date() }]);
    setError('');
  };

  return (
    <div className="page ai-page">
      <div className="page-header ai-header">
        <div className="ai-header-left">
          <div className="ai-avatar-wrap">
            <img src={BOT_IMAGE} alt="AI" className="ai-avatar" onError={e => e.target.style.display='none'} />
            <div className="ai-status-dot" />
          </div>
          <div>
            <h2 className="page-title">🤖 DENTSU AI</h2>
            <p className="ai-subtitle">by {DEV_NAME} 🇨🇬 • Powered by AI</p>
          </div>
        </div>
        <button className="clear-btn" onClick={clear} title="Effacer la conversation">🗑️</button>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble-wrap ${msg.role === 'user' ? 'user' : 'bot'}`}>
            {msg.role === 'assistant' && (
              <img src={BOT_IMAGE} alt="AI" className="bubble-avatar" onError={e => e.target.style.display='none'} />
            )}
            <div className={`chat-bubble ${msg.role} ${msg.isError ? 'error' : ''}`}>
              <span dangerouslySetInnerHTML={{ __html: fmt(msg.text) }} />
              <span className="bubble-time">
                {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-bubble-wrap bot">
            <img src={BOT_IMAGE} alt="AI" className="bubble-avatar" onError={e => e.target.style.display='none'} />
            <div className="chat-bubble bot typing">
              <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form className="chat-input-wrap" onSubmit={send}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={t.aiPlaceholder || 'Pose ta question à DENTSU AI...'}
          className="chat-input"
          rows={1}
          disabled={loading}
        />
        <button type="submit" className="chat-send-btn" disabled={loading || !input.trim()}>
          {loading ? <span className="mini-spinner" /> : '➤'}
        </button>
      </form>

      <p className="ai-powered-note">🤖 DENTSU AI — {DEV_NAME} 🇨🇬 • {t.aiNote || 'L\'IA peut faire des erreurs'}</p>
    </div>
  );
}
