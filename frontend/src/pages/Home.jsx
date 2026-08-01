import { useEffect, useState } from 'react';
import { BOT_NAME, DEV_NAME, BOT_IMAGE, CHANNEL_LINK, GROUP_LINK, TELEGRAM, API_URL } from '../App.jsx';

function WaIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="currentColor">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 2.822.736 5.474 2.027 7.773L0 32l8.476-2.003A15.94 15.94 0 0016 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.333a13.27 13.27 0 01-6.773-1.853l-.487-.29-5.027 1.187 1.253-4.893-.32-.507A13.267 13.267 0 012.667 16C2.667 8.636 8.636 2.667 16 2.667c7.363 0 13.333 5.97 13.333 13.333 0 7.363-5.97 13.333-13.333 13.333zm7.307-9.947c-.4-.2-2.367-1.167-2.733-1.3-.367-.133-.633-.2-.9.2-.267.4-1.033 1.3-1.267 1.567-.233.267-.467.3-.867.1-.4-.2-1.687-.623-3.213-1.98-1.187-1.057-1.987-2.363-2.22-2.763-.233-.4-.025-.617.175-.817.18-.18.4-.467.6-.7.2-.233.267-.4.4-.667.133-.267.067-.5-.033-.7-.1-.2-.9-2.167-1.233-2.967-.325-.78-.655-.673-.9-.685-.233-.012-.5-.015-.767-.015s-.7.1-1.067.5c-.367.4-1.4 1.367-1.4 3.333s1.433 3.867 1.633 4.133c.2.267 2.82 4.307 6.833 6.04 4.013 1.733 4.013 1.155 4.733 1.083.72-.073 2.367-.967 2.7-1.9.333-.933.333-1.733.233-1.9-.1-.167-.367-.267-.767-.467z"/>
    </svg>
  );
}

function TgIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="currentColor">
      <path d="M16 0C7.163 0 0 7.163 0 16s7.163 16 16 16 16-7.163 16-16S24.837 0 16 0zm7.9 10.933l-2.693 12.694c-.2.893-.727 1.113-1.473.693l-4.08-3.007-1.967 1.893c-.22.22-.4.4-.813.4l.287-4.147 7.507-6.78c.327-.293-.073-.453-.507-.16L9.22 17.4l-4-1.253c-.867-.273-.88-.867.187-1.287l15.6-6.013c.72-.267 1.353.16 1.12 1.087h-.227z"/>
    </svg>
  );
}

const features = [
  { icon: '📱', key: 'connect', color: '#25D366', bg: 'rgba(37,211,102,0.12)', border: 'rgba(37,211,102,0.3)' },
  { icon: '🤖', key: 'ai',      color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)' },
  { icon: '🎵', key: 'music',   color: '#f472b6', bg: 'rgba(244,114,182,0.12)', border: 'rgba(244,114,182,0.3)' },
  { icon: '🔓', key: 'unban',   color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.3)' },
];

export default function Home({ t, setPage }) {
  const [sessions, setSessions] = useState(null);
  const [online, setOnline] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/status`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setSessions(d.count ?? 0); setOnline(true); } })
      .catch(() => setOnline(false));
  }, []);

  return (
    <div className="page home-page">
      {/* Header */}
      <header className="home-header">
        <div className="bot-img-wrap">
          <img src={BOT_IMAGE} alt={BOT_NAME} className="bot-img"
            onError={e => e.target.style.display='none'} />
          <div className="bot-img-ring" />
          <div className={`bot-status-dot ${online === true ? 'online' : online === false ? 'offline' : 'loading'}`} />
        </div>
        <h1 className="bot-name">{BOT_NAME}</h1>
        <p className="bot-dev">by {DEV_NAME} 🇨🇬</p>

        <div className="stats-row">
          <div className="stat-badge green">
            <span className="stat-dot" />
            {online === null ? '...' : online ? t.statOnline || 'En ligne' : t.statOffline || 'Hors ligne'}
          </div>
          <div className="stat-badge blue">⚡ 200+ {t.navCommands || 'commandes'}</div>
          {sessions !== null && (
            <div className="stat-badge purple">
              👥 {sessions}/{50} {t.sessions || 'sessions'}
            </div>
          )}
        </div>
      </header>

      {/* BIG CONNECT BUTTON */}
      <div className="connect-hero">
        <button className="btn-connect-hero pulse" onClick={() => setPage('connect')}>
          <WaIcon />
          <span>{t.connectHero || '📲 Connecter mon WhatsApp'}</span>
          <span className="btn-arrow">→</span>
        </button>
        <p className="connect-hint">{t.connectHeroHint || 'Obtiens ton code de jumelage en 15 secondes'}</p>
      </div>

      {/* Feature cards */}
      <div className="features-grid">
        {features.map(f => (
          <button key={f.key} className="feature-card" onClick={() => setPage(f.key)}
            style={{ '--fc': f.color, '--fb': f.bg, '--fbd': f.border }}>
            <span className="feature-icon">{f.icon}</span>
            <span className="feature-label">{t['feat_' + f.key] || f.key}</span>
            <span className="feature-arrow">›</span>
          </button>
        ))}
      </div>

      {/* About section */}
      <div className="about-card">
        <h3>🇨🇬 {BOT_NAME}</h3>
        <p>{t.aboutText || `Bot WhatsApp multi-sessions avancé développé par ${DEV_NAME}. Commandes IA, musique, outils de gestion de groupes et bien plus.`}</p>
      </div>

      {/* Social links */}
      <div className="social-row">
        <a href={CHANNEL_LINK} target="_blank" rel="noopener noreferrer" className="social-btn wa">
          <WaIcon /> {t.channel}
        </a>
        <a href={GROUP_LINK} target="_blank" rel="noopener noreferrer" className="social-btn wa">
          <WaIcon /> {t.group}
        </a>
        <a href={TELEGRAM} target="_blank" rel="noopener noreferrer" className="social-btn tg">
          <TgIcon /> {t.telegram}
        </a>
      </div>

      <footer className="footer">
        <p>{t.madeBy} <a href={TELEGRAM} target="_blank" rel="noopener noreferrer">{DEV_NAME}</a> 🇨🇬</p>
        <p className="footer-copy">© 2025 {BOT_NAME}. All rights reserved.</p>
      </footer>
    </div>
  );
}
