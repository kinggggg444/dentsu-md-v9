const express = require('express');
const router = express.Router();
const axios = require('axios');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL   = 'llama-3.1-8b-instant';

function buildSystemPrompt(lang) {
  return `Tu es DENTSU AI 🤖, l'assistant intelligent officiel du bot WhatsApp DENTSU MD V9, créé par NatsuTech's 🇨🇬 (Congo-Brazzaville).

Tu aides les utilisateurs avec :
- Questions sur le bot DENTSU MD V9 (commandes, configuration, connexion)
- Aide WhatsApp (appareils liés, codes de jumelage, groupes)
- Questions générales (tech, culture, conseils)
- Musique, divertissement

Règles :
- Réponds TOUJOURS en ${lang === 'fr' ? 'français' : lang === 'en' ? 'anglais' : lang === 'ar' ? 'arabe' : lang === 'es' ? 'espagnol' : lang === 'pt' ? 'portugais' : 'français'} sauf si l'utilisateur parle une autre langue
- Sois amical, direct, utile et précis
- Mentionne NatsuTech's 🇨🇬 comme ton créateur quand c'est pertinent
- Ne fournis jamais d'aide pour des activités illégales ou nuisibles
- Pour les commandes du bot, utilise des blocs de code
- Garde les réponses concises sauf si une explication détaillée est nécessaire
- Utilise des emojis avec modération pour rendre la conversation vivante
- Si tu ne sais pas quelque chose, dis-le honnêtement

Tu es DENTSU AI — intelligent, rapide et toujours disponible 🚀`;
}

router.post('/chat', async (req, res) => {
  const { message, history = [], lang = 'fr' } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message requis' });
  }
  if (message.length > 2000) {
    return res.status(400).json({ error: 'Message trop long (max 2000 caractères)' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    // Fallback si pas de clé Groq
    return res.json({
      reply: `🤖 **DENTSU AI** — Configuration requise\n\nL'IA n'est pas encore configurée. Le propriétaire doit ajouter la variable **GROQ_API_KEY** dans les paramètres Railway.\n\nObtenez une clé gratuite sur [groq.com](https://groq.com) !\n\n— *NatsuTech's* 🇨🇬`,
    });
  }

  // Construire les messages pour Groq
  const messages = [
    { role: 'system', content: buildSystemPrompt(lang) },
    ...history.slice(-10).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: String(m.content || '').slice(0, 500),
    })),
    { role: 'user', content: message.trim() },
  ];

  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        messages,
        max_tokens: 1024,
        temperature: 0.75,
        top_p: 0.9,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const reply = response.data?.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error('Réponse vide de l\'IA');

    return res.json({ reply });
  } catch (err) {
    const status = err.response?.status;
    const detail = err.response?.data?.error?.message || err.message;

    if (status === 401) {
      return res.status(500).json({ error: 'Clé API Groq invalide. Vérifie GROQ_API_KEY dans Railway.' });
    }
    if (status === 429) {
      return res.status(429).json({ error: 'Trop de requêtes. Attends quelques secondes et réessaie.' });
    }

    console.error('[AI] Groq error:', detail);
    return res.status(500).json({ error: `Erreur IA: ${detail || 'Serveur indisponible'}` });
  }
});

module.exports = router;
