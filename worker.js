import { onRequestPost as translate } from './functions/api/translate.js';

const languageNames = {
  en: 'English', ru: 'Russian', ar: 'Arabic', tr: 'Turkish', de: 'German', fr: 'French',
  es: 'Spanish', it: 'Italian', nl: 'Dutch', sv: 'Swedish', no: 'Norwegian', da: 'Danish',
  fi: 'Finnish', pl: 'Polish', ro: 'Romanian', uk: 'Ukrainian', so: 'Somali', ur: 'Urdu',
  fa: 'Persian (Farsi)', prs: 'Dari', ku: 'Kurdish', bn: 'Bengali', sq: 'Albanian', bs: 'Bosnian'
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/translate' && request.method === 'POST') {
      return translate({ request, env });
    }
    if (url.pathname === '/api/translation-session' && request.method === 'POST') {
      return createTranslationSession(request, env);
    }
    return env.ASSETS.fetch(request);
  }
};

async function createTranslationSession(request, env) {
  if (!env.OPENAI_API_KEY) return json({ error: 'Translation service is not configured yet.' }, 503);
  const { targetLanguage } = await request.json().catch(() => ({}));
  if (!languageNames[targetLanguage]) return json({ error: 'Invalid live translation request.' }, 400);
  const response = await fetch('https://api.openai.com/v1/realtime/translations/client_secrets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ session: { model: 'gpt-realtime-translate', audio: { output: { language: targetLanguage } } } })
  });
  if (!response.ok) {
    console.error('OpenAI Realtime translation session failed', response.status);
    return json({ error: `Live translation could not start (${response.status}). Please check API billing and Realtime API access.` }, 502);
  }
  return new Response(await response.text(), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}

function json(body, status) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
