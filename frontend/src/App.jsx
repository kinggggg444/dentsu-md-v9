import { useState, useEffect } from 'react';
import { translations, langMeta } from './i18n.js';
import Home from './pages/Home.jsx';
import Connect from './pages/Connect.jsx';
import AIChat from './pages/AIChat.jsx';
import Music from './pages/Music.jsx';
import Unban from './pages/Unban.jsx';
import BottomNav from './components/BottomNav.jsx';
import LangOverlay from './components/LangOverlay.jsx';

export const BOT_NAME = import.meta.env.VITE_BOT_NAME || 'DENTSU MD V9';
export const DEV_NAME = import.meta.env.VITE_DEV_NAME || "NatsuTech's";
export const BOT_IMAGE = import.meta.env.VITE_BOT_IMAGE || 'https://i.imgur.com/MtOSJqh.jpeg';
export const CHANNEL_LINK = import.meta.env.VITE_CHANNEL_LINK || 'https://whatsapp.com/channel/0029VbC1s7fFnSz1YhZYc01h';
export const GROUP_LINK = import.meta.env.VITE_GROUP_LINK || 'https://chat.whatsapp.com/GtXASqDdchAFvEJ95cQQ0F';
export const TELEGRAM = import.meta.env.VITE_TELEGRAM || 'https://t.me/Natsu_or_Dentsu';
export const OWNER_EMAIL = import.meta.env.VITE_OWNER_EMAIL || 'natsutechs@gmail.com';
export const API_URL = '/api';

export default function App() {
  const [lang, setLang] = useState('fr');
  const [showLangOverlay, setShowLangOverlay] = useState(true);
  const [page, setPage] = useState('home');
  const [particles, setParticles] = useState([]);

  const t = translations[lang] || translations.fr;
  const isRtl = lang === 'ar';

  useEffect(() => {
    const saved = localStorage.getItem('dentsu-lang');
    if (saved && translations[saved]) {
      setLang(saved);
      setShowLangOverlay(false);
    }
    setParticles(Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 10 + 8,
      delay: Math.random() * 5,
    })));
  }, []);

  const selectLang = (code) => {
    setLang(code);
    localStorage.setItem('dentsu-lang', code);
    setShowLangOverlay(false);
  };

  const pageProps = { lang, t, isRtl, setPage };

  return (
    <div className="app" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Video background */}
      <video className="bg-video" src="https://files.catbox.moe/v2mp0e.mp4" autoPlay loop muted playsInline />
      <div className="bg-video-overlay" />

      {/* Particles */}
      <div className="particles">
        {particles.map(p => (
          <div key={p.id} className="particle" style={{
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }} />
        ))}
      </div>
      <div className="blob blob-1" />
      <div className="blob blob-2" />

      {/* Language Overlay */}
      {showLangOverlay && <LangOverlay onSelect={selectLang} />}

      {/* Pages */}
      {!showLangOverlay && (
        <div className="app-layout">
          <div className="page-container">
            {page === 'home'    && <Home    {...pageProps} />}
            {page === 'connect' && <Connect {...pageProps} />}
            {page === 'ai'      && <AIChat  {...pageProps} />}
            {page === 'music'   && <Music   {...pageProps} />}
            {page === 'unban'   && <Unban   {...pageProps} />}
          </div>
          <BottomNav page={page} setPage={setPage} t={t} lang={lang} langMeta={langMeta} selectLang={selectLang} />
        </div>
      )}
    </div>
  );
}
