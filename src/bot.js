const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
  delay,
} = require('baileys');

// Codes qui déclenchent reconnexion (pas logout)
const RECONNECT_CODES = new Set([405, 408, 503, 428, 500, 502]);
const pino = require('pino');
const fs = require('fs-extra');
const path = require('path');
const config = require('./config');
const store = require('./lib/store');
const { messageHandler } = require('./handlers/message');
const { setupStatusHandlers } = require('./handlers/status');

const logger = pino({ level: 'silent' });
const pendingSockets = new Map();
const msgCaches = new Map();
const watchdogs = new Map();

const FALLBACK_VERSION = [2, 3000, 1023596128];

// Attendre que le WebSocket soit en état 'connecting' ou 'open'
// Nettoie correctement le listener après résolution/rejet
function waitForConnecting(sock, timeoutMs = 25000) {
  return new Promise((resolve, reject) => {
    let settled = false;

    const settle = (fn, val) => {
      if (settled) return;
      settled = true;
      clearTimeout(t);
      // Retirer le listener
      try { sock.ev.off('connection.update', handler); } catch (_) {}
      fn(val);
    };

    const t = setTimeout(
      () => settle(reject, new Error('WebSocket connection timeout')),
      timeoutMs
    );

    const handler = ({ connection }) => {
      if (connection === 'connecting' || connection === 'open') {
        settle(resolve, undefined);
      } else if (connection === 'close') {
        settle(reject, new Error('Connection closed before pairing code'));
      }
    };

    sock.ev.on('connection.update', handler);
  });
}

async function getVersion() {
  try {
    const { version } = await fetchLatestBaileysVersion();
    console.log('[BOT] WhatsApp version:', version.join('.'));
    return version;
  } catch (e) {
    console.log('[BOT] fetchLatestBaileysVersion failed → fallback version');
    return FALLBACK_VERSION;
  }
}

function getBrowserValue() {
  // Ubuntu Chrome fonctionne mieux que macOS Safari sur les hébergements cloud
  // (Railway, Render) — WhatsApp le bloque moins souvent
  if (typeof Browsers?.ubuntu === 'function') return Browsers.ubuntu('Chrome');
  if (typeof Browsers?.macOS === 'function') return Browsers.macOS('Chrome');
  return ['Ubuntu', 'Chrome', '120.0.6099.119'];
}

function clearWatchdog(sanitized) {
  if (watchdogs.has(sanitized)) {
    clearInterval(watchdogs.get(sanitized));
    watchdogs.delete(sanitized);
  }
}

// Envoyer le message de bienvenue avec retry (3 tentatives)
async function sendWelcomeMessage(sock, sanitized) {
  const selfJid = sanitized + '@s.whatsapp.net';
  const pushName = sock.user?.name || sock.user?.verifiedName || sanitized;

  const now = new Date();
  const date = now.toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
  const heure = now.toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  const welcome =
`╔══════════════╗
║ *DENTSU MD* 🤖 ✅ ║
╚══════════════╝

🎉 *Connexion réussie !*

👤 *Nom:* ${pushName}
📱 *Numéro:*  +${sanitized}
⚙️ *Préfixe:* . ! # / $ , ; - + (ou sans préfixe)
📦 *Version:* 9.0.0
📅 *Date:* ${date} à ${heure}

👑 *Owner:* NatsuTech's
💬 *Telegram:* https://t.me/Natsu_or_Dentsu

📢 *Canal WhatsApp:*
🔗 https://whatsapp.com/channel/0029VbC1s7fFnSz1YhZYc01h

> _Tape .help pour les commandes_
> _*DENTSU MD* est en ligne !_ 🚀`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await sock.sendPresenceUpdate('available');
      await delay(500);
      await sock.sendMessage(selfJid, { text: welcome });
      console.log(`[${sanitized}] ✅ Message de bienvenue envoyé (tentative ${attempt})`);
      return; // succès
    } catch (err) {
      console.warn(`[${sanitized}] ⚠️ Message de bienvenue échec tentative ${attempt}:`, err.message);
      if (attempt < 3) await delay(3000 * attempt);
    }
  }
  console.error(`[${sanitized}] ❌ Message de bienvenue impossible après 3 tentatives`);
}

async function startSession(number) {
  const sanitized = number.replace(/[^0-9]/g, '');
  const sessionPath = path.join(config.SESSION_BASE_PATH, sanitized);

  fs.ensureDirSync(sessionPath);

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const version = await getVersion();

  const msgRetryCounterMap = new Map();
  if (!msgCaches.has(sanitized)) msgCaches.set(sanitized, new Map());
  const msgCache = msgCaches.get(sanitized);

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: getBrowserValue(),
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 10000,
    retryRequestDelayMs: 250,
    generateHighQualityLinkPreview: false,
    markOnlineOnConnect: true,
    syncFullHistory: false,
    msgRetryCounterMap,
    getMessage: async (key) => {
      const cached = msgCache.get(key.id);
      if (cached) return cached;
      return { conversation: '' };
    },
  });

  pendingSockets.set(sanitized, sock);
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages: msgs, type }) => {
    for (const m of msgs) {
      if (m.message && m.key?.id) {
        msgCache.set(m.key.id, m.message);
        if (msgCache.size > 500) {
          msgCache.delete(msgCache.keys().next().value);
        }
      }
    }
    messageHandler(sock, { messages: msgs, type }).catch(e =>
      console.error(`[${sanitized}] messageHandler error:`, e.message)
    );
  });

  setupStatusHandlers(sock);

  sock.ev.on('group-participants.update', async (update) => {
    try {
      const { id, participants, action } = update;
      const meta = await sock.groupMetadata(id);
      for (const jid of participants) {
        const num = jid.split('@')[0];
        if (action === 'add') {
          await sock.sendMessage(id, {
            image: { url: config.MENU_IMAGE },
            caption: `╔╦══════════════════╦╗\n║║   *WELCOME* 🎉   ║║\n╚╩══════════════════╩╝\n\n👋 Welcome @${num} to *${meta.subject}*!\n\nWe're glad to have you here. Please read the group rules.\n\n_Powered by DENTSU MD V9_`,
            mentions: [jid],
          });
        } else if (action === 'remove') {
          await sock.sendMessage(id, {
            image: { url: config.MENU_IMAGE },
            caption: `╔╦══════════════════╦╗\n║║   *GOODBYE* 👋   ║║\n╚╩══════════════════╩╝\n\n😢 @${num} has left *${meta.subject}*.\n\nWe'll miss you! Come back anytime.\n\n_Powered by DENTSU MD V9_`,
            mentions: [jid],
          });
        }
      }
    } catch (e) {
      console.log(`[group-participants] Error:`, e.message);
    }
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'open') {
      console.log(`[${sanitized}] ✅ Connecté !`);
      pendingSockets.delete(sanitized);
      store.setSession(sanitized, { sock, number: sanitized, connectedAt: Date.now() });

      // Annoncer présence immédiatement
      try { await sock.sendPresenceUpdate('available'); } catch (_) {}

      // Message de bienvenue avec délai suffisant pour stabiliser la connexion
      setTimeout(() => sendWelcomeMessage(sock, sanitized), 5000);

      // ── WATCHDOG: détecte les connexions zombie ───────────────
      clearWatchdog(sanitized);
      let _wdFails = 0;
      const wd = setInterval(async () => {
        if (!store.getSession(sanitized)) { clearWatchdog(sanitized); return; }
        try {
          await Promise.race([
            sock.sendPresenceUpdate('available'),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000)),
          ]);
          _wdFails = 0;
        } catch (e) {
          _wdFails++;
          console.log(`[${sanitized}] ⚠️ Watchdog échec ${_wdFails}/3...`);
          if (_wdFails >= 3) {
            console.log(`[${sanitized}] 🔴 Zombie confirmé après 3 échecs, reconnexion...`);
            clearWatchdog(sanitized);
            store.deleteSession(sanitized);
            try { sock.end(new Error('watchdog')); } catch (_) {}
            setTimeout(() => reconnectSession(sanitized), 3000);
          }
        }
      }, 45000);
      watchdogs.set(sanitized, wd);

      return;
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const reason = lastDisconnect?.error?.output?.payload?.error || statusCode;
      console.log(`[${sanitized}] Connexion fermée. Raison: ${reason} (code: ${statusCode})`);

      clearWatchdog(sanitized);
      pendingSockets.delete(sanitized);

      if (statusCode === DisconnectReason.loggedOut) {
        store.deleteSession(sanitized);
        fs.removeSync(sessionPath);
        msgCaches.delete(sanitized);
        console.log(`[${sanitized}] Session supprimée (logout)`);
      } else if (statusCode === DisconnectReason.restartRequired || statusCode === 515) {
        store.deleteSession(sanitized);
        console.log(`[${sanitized}] Redémarrage requis, reconnexion dans 2s...`);
        setTimeout(() => reconnectSession(sanitized), 2000);
      } else if (RECONNECT_CODES && RECONNECT_CODES.has(statusCode)) {
        store.deleteSession(sanitized);
        console.log(`[${sanitized}] Code ${statusCode} → reconnexion dans 8s...`);
        setTimeout(() => reconnectSession(sanitized), 8000);
      } else {
        store.deleteSession(sanitized);
        console.log(`[${sanitized}] Reconnexion dans 5s...`);
        setTimeout(() => reconnectSession(sanitized), 5000);
      }
    }
  });

  if (!sock.authState.creds.registered) {
    // Attendre que le WebSocket soit vraiment ouvert avant de demander le code
    try {
      console.log(`[${sanitized}] En attente de la connexion WebSocket...`);
      await waitForConnecting(sock, 25000);
      console.log(`[${sanitized}] WebSocket connecté, demande du code de jumelage...`);
    } catch (connErr) {
      pendingSockets.delete(sanitized);
      try { sock.end(); } catch (_) {}
      throw new Error(`Connexion fermée: ${connErr.message}`);
    }

    // Petit buffer de stabilisation
    await delay(1500);

    // Jusqu'à 3 tentatives avec délai croissant entre chaque
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[${sanitized}] Code de jumelage — tentative ${attempt}/3 (version ${version.join('.')})...`);
        const code = await sock.requestPairingCode(sanitized);
        const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;
        console.log(`[${sanitized}] ✅ Code: ${formattedCode}`);

        setTimeout(() => {
          if (pendingSockets.has(sanitized)) {
            console.log(`[${sanitized}] Timeout jumelage (5min), nettoyage`);
            pendingSockets.delete(sanitized);
          }
        }, 5 * 60 * 1000);

        return { sock, code: formattedCode };
      } catch (err) {
        lastError = err;
        console.warn(`[${sanitized}] Tentative ${attempt} échouée: ${err.message}`);
        if (attempt < 3) await delay(4000 * attempt); // 4s, puis 8s
      }
    }

    // Toutes les tentatives échouées
    pendingSockets.delete(sanitized);
    try { sock.end(); } catch (_) {}
    throw new Error(`Code de jumelage impossible après 3 tentatives: ${lastError?.message}`);
  }

  pendingSockets.delete(sanitized);
  store.setSession(sanitized, { sock, number: sanitized, connectedAt: Date.now() });
  return { sock, code: null };
}

async function reconnectSession(sanitized) {
  const sessionPath = path.join(config.SESSION_BASE_PATH, sanitized);
  if (!fs.existsSync(sessionPath)) return;
  if (store.getSession(sanitized)) return;
  try {
    await startSession(sanitized);
  } catch (e) {
    console.error(`[${sanitized}] Erreur reconnexion:`, e.message);
    setTimeout(() => reconnectSession(sanitized), 15000);
  }
}

async function startExistingSessions() {
  if (!fs.existsSync(config.SESSION_BASE_PATH)) return;
  const dirs = fs.readdirSync(config.SESSION_BASE_PATH).filter(d => {
    const p = path.join(config.SESSION_BASE_PATH, d);
    return fs.statSync(p).isDirectory() && fs.readdirSync(p).length > 0;
  });
  console.log(`[BOT] ${dirs.length} session(s) existante(s) à restaurer`);
  for (const dir of dirs) {
    try {
      await startSession(dir);
      await delay(2000);
    } catch (e) {
      console.error(`[BOT] Erreur session ${dir}:`, e.message);
    }
  }
}

function startBot() {
  startExistingSessions();
}

module.exports = { startBot, startSession };
