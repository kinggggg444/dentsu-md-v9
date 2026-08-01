import { useState } from 'react';
import { DEV_NAME, OWNER_EMAIL, TELEGRAM, BOT_NAME } from '../App.jsx';

const SUPPORT_SUBJECTS = [
  { value: 'temp', label: '⏳ Bannissement temporaire' },
  { value: 'perm', label: '🔴 Bannissement permanent' },
  { value: 'policy', label: '📋 Violation de politique' },
  { value: 'spam', label: '📵 Signalement comme spam' },
  { value: 'hack', label: '🔓 Compte piraté/signalé' },
  { value: 'other', label: '❓ Autre raison' },
];

export default function Unban({ t }) {
  const [number, setNumber] = useState('');
  const [reason, setReason] = useState('temp');
  const [description, setDescription] = useState('');
  const [step, setStep] = useState('form'); // form | sent

  const handleSubmit = (e) => {
    e.preventDefault();
    const sanitized = number.replace(/[^0-9]/g, '');
    if (sanitized.length < 7) return;

    const subject = encodeURIComponent(`[DENTSU UNBAN] Demande de débannissement — +${sanitized}`);
    const reasonLabel = SUPPORT_SUBJECTS.find(s => s.value === reason)?.label || reason;
    const body = encodeURIComponent(
`Bonjour NatsuTech's,

Je sollicite une assistance pour le débannissement de mon compte WhatsApp.

━━━━━━━━━━━━━━━━━━━━
📱 NUMÉRO: +${sanitized}
🔴 TYPE: ${reasonLabel}
━━━━━━━━━━━━━━━━━━━━

📝 DESCRIPTION:
${description || 'Aucune description fournie.'}

━━━━━━━━━━━━━━━━━━━━

Je confirme que ce numéro m'appartient et je demande votre aide pour soumettre une demande de débannissement auprès de WhatsApp.

Merci,
Utilisateur de ${BOT_NAME}`
    );

    window.open(`mailto:${OWNER_EMAIL}?subject=${subject}&body=${body}`, '_blank');
    setStep('sent');
  };

  const reset = () => {
    setStep('form');
    setNumber('');
    setReason('temp');
    setDescription('');
  };

  return (
    <div className="page unban-page">
      <div className="page-header">
        <h2 className="page-title">🔓 {t.unbanTitle || 'Débannir un numéro'}</h2>
        <p className="page-sub">{t.unbanSub || 'Demande de débannissement WhatsApp via support'}</p>
      </div>

      {/* Warning banner */}
      <div className="warning-banner">
        <span>⚠️</span>
        <span>{t.unbanWarning || 'Ce service aide uniquement les propriétaires légitimes à demander un débannissement auprès de WhatsApp.'}</span>
      </div>

      {step === 'form' ? (
        <div className="card">
          <form onSubmit={handleSubmit} className="unban-form">
            <div className="form-group">
              <label className="form-label">📱 Numéro banni</label>
              <div className="input-wrap">
                <span className="input-icon">+</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={number}
                  onChange={e => setNumber(e.target.value)}
                  placeholder="Ex: 242053323191"
                  className="phone-input"
                  required
                />
              </div>
              <p className="input-hint">Avec l'indicatif pays, sans le +</p>
            </div>

            <div className="form-group">
              <label className="form-label">🔴 Raison du bannissement</label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="form-select">
                {SUPPORT_SUBJECTS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">📝 Description (optionnel)</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Explique brièvement ce qui s'est passé..."
                className="form-textarea"
                rows={4}
              />
            </div>

            <button type="submit" className="btn-primary btn-orange">
              <span>📧</span>
              {t.unbanSend || 'Envoyer la demande'}
            </button>

            <p className="form-note">
              📧 La demande sera envoyée à <strong>{OWNER_EMAIL}</strong> — {DEV_NAME} 🇨🇬 traitera ton dossier.
            </p>
          </form>
        </div>
      ) : (
        <div className="card">
          <div className="success-col">
            <div className="success-icon">✅</div>
            <h3 className="card-title">{t.unbanSent || 'Demande envoyée !'}</h3>
            <p className="card-sub">{t.unbanSentSub || `Ton email s'est ouvert avec les informations pré-remplies. Envoie-le à ${OWNER_EMAIL}.`}</p>
            <div className="unban-next-steps">
              <div className="step-item"><div className="step-num orange">1</div><span>Vérifie que l'email est bien composé</span></div>
              <div className="step-item"><div className="step-num orange">2</div><span>Envoie l'email depuis ton application mail</span></div>
              <div className="step-item"><div className="step-num orange">3</div><span>{DEV_NAME} soumettra la demande à WhatsApp</span></div>
              <div className="step-item"><div className="step-num orange">4</div><span>Délai de traitement : 24–72h</span></div>
            </div>
            <a href={TELEGRAM} target="_blank" rel="noopener noreferrer" className="btn-primary btn-tg">
              <span>💬</span> Suivre sur Telegram
            </a>
            <button className="btn-outline" onClick={reset} type="button">
              {t.unbanNew || 'Nouvelle demande'}
            </button>
          </div>
        </div>
      )}

      {/* Process explanation */}
      <div className="about-card orange-card">
        <h3>ℹ️ Comment ça marche ?</h3>
        <p>Tu remplis le formulaire → {DEV_NAME} 🇨🇬 reçoit ta demande → soumet un ticket officiel à WhatsApp → tu es notifié du résultat. Ce service est <strong>gratuit</strong> et disponible pour tous les utilisateurs de {BOT_NAME}.</p>
      </div>
    </div>
  );
}
