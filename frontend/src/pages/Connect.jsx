import { useState, useRef, useEffect } from 'react';
import { API_URL, BOT_NAME } from '../App.jsx';

const CODE_EXPIRY = 5 * 60 * 1000;

function useCountdown(active) {
  const [remaining, setRemaining] = useState(CODE_EXPIRY);
  const start = useRef(null);
  useEffect(() => {
    if (!active) { setRemaining(CODE_EXPIRY); start.current = null; return; }
    start.current = Date.now();
    const tick = setInterval(() => {
      const left = Math.max(0, CODE_EXPIRY - (Date.now() - start.current));
      setRemaining(left);
      if (left === 0) clearInterval(tick);
    }, 1000);
    return () => clearInterval(tick);
  }, [active]);
  const m = Math.floor(remaining / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return { m, s, expired: remaining === 0, pct: (remaining / CODE_EXPIRY) * 100 };
}

export default function Connect({ t }) {
  const [step, setStep] = useState('form');
  const [number, setNumber] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);
  const { m, s, expired, pct } = useCountdown(step === 'success');

  const handlePair = async (e) => {
    e.preventDefault();
    const sanitized = number.replace(/[^0-9]/g, '');
    if (sanitized.length < 7 || sanitized.length > 15) {
      setError('Numéro invalide. Ex: 242053323191');
      setStep('error');
      return;
    }
    setStep('loading');
    try {
      const res = await fetch(`${API_URL}/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: sanitized }),
      });
      const data = await res.json();
      if (data.success && data.code) {
        setCode(data.code);
        setStep('success');
      } else if (data.success && !data.code) {
        setError(t.alreadyConnected || 'Numéro déjà connecté !');
        setStep('error');
      } else {
        setError(data.error || 'Erreur inconnue');
        setStep('error');
      }
    } catch {
      setError('Impossible de contacter le serveur.');
      setStep('error');
    }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(code); } catch {
      const ta = document.createElement('textarea');
      ta.value = code; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setStep('form'); setNumber(''); setCode(''); setError('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <div className="page connect-page">
      <div className="page-header">
        <h2 className="page-title">📱 {t.connectTitle || 'Connecter WhatsApp'}</h2>
        <p className="page-sub">{t.connectSubtitle || "Entre ton numéro pour obtenir ton code de jumelage"}</p>
      </div>

      {/* How it works */}
      <div className="info-banner">
        <span>💡</span>
        <span>{t.connectInfo || 'Ton numéro avec indicatif pays (ex: 242053323191 pour Congo)'}</span>
      </div>

      <div className="card">
        {step === 'form' && (
          <form onSubmit={handlePair} className="pair-form">
            <div className="input-wrap">
              <span className="input-icon">+</span>
              <input
                ref={inputRef}
                type="tel"
                inputMode="numeric"
                value={number}
                onChange={e => setNumber(e.target.value)}
                placeholder={t.placeholder || 'Ex: 242053323191'}
                className="phone-input"
                required
                autoFocus
              />
            </div>
            <button type="submit" className="btn-primary btn-green">
              <span>📲</span>
              {t.btnConnect || 'Obtenir le code'}
            </button>
          </form>
        )}

        {step === 'loading' && (
          <div className="center-col">
            <div className="spinner" />
            <p className="loading-text">{t.btnLoading || 'Génération...'}</p>
            <p className="loading-num">+{number.replace(/[^0-9]/g, '')}</p>
            <p className="loading-hint">⏳ ~15 secondes</p>
          </div>
        )}

        {step === 'success' && (
          <div className="success-col">
            <div className="success-icon">✅</div>
            <h3 className="card-title">{t.successTitle || 'Ton code de jumelage'}</h3>
            <p className="card-sub">{t.successSub || 'Entre ce code dans WhatsApp'}</p>

            <div className="code-box">
              <span className="code-text">{code}</span>
              <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={copy} type="button">
                {copied ? <>✓ {t.copied || 'Copié'}</> : <>📋 {t.copy || 'Copier'}</>}
              </button>
            </div>

            <div className="expiry-bar-wrap">
              <div className="expiry-bar" style={{
                width: `${pct}%`,
                background: expired ? '#ff4d4d' : pct < 30 ? '#ffaa00' : '#25D366'
              }} />
            </div>
            <p className={`expiry-text ${expired ? 'expired' : pct < 30 ? 'warn' : ''}`}>
              {expired ? '⚠️ Code expiré — génère un nouveau code'
                       : `⏱ Valable encore ${m}:${String(s).padStart(2, '0')}`}
            </p>

            <div className="steps-list">
              {[t.step1, t.step2, t.step3, t.step4].filter(Boolean).map((s, i) => (
                <div key={i} className="step-item">
                  <div className="step-num">{i + 1}</div>
                  <span>{s}</span>
                </div>
              ))}
            </div>
            <button className="btn-outline" onClick={reset} type="button">{t.tryAgain || 'Nouveau numéro'}</button>
          </div>
        )}

        {step === 'error' && (
          <div className="error-col">
            <div className="error-icon">⚠️</div>
            <h3 className="card-title">Oops!</h3>
            <p className="error-msg">{error}</p>
            <button className="btn-primary btn-green" onClick={reset} type="button">
              {t.tryAgain || 'Réessayer'}
            </button>
          </div>
        )}
      </div>

      {/* Why use bot */}
      <div className="why-card">
        <h3>🌟 Pourquoi {BOT_NAME} ?</h3>
        <ul className="why-list">
          <li>🤖 200+ commandes IA et multimédia</li>
          <li>🎵 Téléchargement musique & vidéos</li>
          <li>👥 Gestion avancée de groupes</li>
          <li>🌍 Multi-langues (10 langues)</li>
          <li>⚡ Réponse en moins de 2 secondes</li>
        </ul>
      </div>
    </div>
  );
}
