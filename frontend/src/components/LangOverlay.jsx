import { langMeta } from '../i18n.js';
import { BOT_NAME, DEV_NAME, BOT_IMAGE } from '../App.jsx';

function FlagImg({ code, size = 48 }) {
  const h = Math.round(size * 0.75);
  return (
    <img src={`https://flagcdn.com/${size}x${h}/${code}.png`} alt={code}
      width={size} height={h} style={{ borderRadius: 3, objectFit: 'cover' }} />
  );
}

export default function LangOverlay({ onSelect }) {
  return (
    <div className="lang-overlay">
      <div className="lang-card">
        <img src={BOT_IMAGE} alt={BOT_NAME} className="lang-bot-img" onError={e => e.target.style.display='none'} />
        <h1 className="lang-title">{BOT_NAME}</h1>
        <p className="lang-by">by {DEV_NAME} 🇨🇬</p>
        <p className="lang-pick">Choisissez votre langue / Choose your language</p>
        <div className="lang-grid">
          {langMeta.map(l => (
            <button key={l.code} className="flag-btn" onClick={() => onSelect(l.code)} title={l.name}>
              <FlagImg code={l.flag} size={40} />
              <span>{l.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
