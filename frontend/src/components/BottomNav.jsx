import { useState } from 'react';
import { langMeta as allLangMeta } from '../i18n.js';

function FlagImg({ code, size = 20 }) {
  const h = Math.round(size * 0.75);
  return (
    <img src={`https://flagcdn.com/${size}x${h}/${code}.png`} alt={code}
      width={size} height={h} style={{ borderRadius: 2, objectFit: 'cover' }} />
  );
}

const navItems = [
  { id: 'home',    icon: '🏠', labelKey: 'navHome' },
  { id: 'connect', icon: '📱', labelKey: 'navConnect' },
  { id: 'ai',      icon: '🤖', labelKey: 'navAI' },
  { id: 'music',   icon: '🎵', labelKey: 'navMusic' },
  { id: 'unban',   icon: '🔓', labelKey: 'navUnban' },
];

export default function BottomNav({ page, setPage, t, lang, selectLang }) {
  const [showLang, setShowLang] = useState(false);
  const currentFlag = allLangMeta.find(l => l.code === lang)?.flag || 'fr';

  return (
    <>
      {showLang && (
        <div className="lang-popup-overlay" onClick={() => setShowLang(false)}>
          <div className="lang-popup" onClick={e => e.stopPropagation()}>
            <p className="lang-popup-title">🌐 Langue</p>
            <div className="lang-popup-grid">
              {allLangMeta.map(l => (
                <button key={l.code}
                  className={`lang-popup-btn ${lang === l.code ? 'active' : ''}`}
                  onClick={() => { selectLang(l.code); setShowLang(false); }}>
                  <FlagImg code={l.flag} size={28} />
                  <span>{l.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="bottom-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-btn ${page === item.id ? 'active' : ''}`}
            onClick={() => setPage(item.id)}>
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{t[item.labelKey] || item.id}</span>
          </button>
        ))}
        <button className="nav-btn" onClick={() => setShowLang(v => !v)}>
          <span className="nav-icon"><FlagImg code={currentFlag} size={22} /></span>
          <span className="nav-label">Langue</span>
        </button>
      </nav>
    </>
  );
}
