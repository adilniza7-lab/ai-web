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
    if (url.pathname === '/api/realtime-call' && request.method === 'POST') {
      return createRealtimeCall(request, env);
    }
    return env.ASSETS.fetch(request);
  }
};

async function createRealtimeCall(request, env) {
  if (!env.OPENAI_API_KEY) return json({ error: 'Translation service is not configured yet.' }, 503);
  const { sdp, targetLanguage } = await request.json().catch(() => ({}));
  if (!sdp || !languageNames[targetLanguage]) return json({ error: 'Invalid live translation request.' }, 400);

  const session = {
    type: 'realtime',
    model: 'gpt-realtime-mini',
    output_modalities: ['text'],
    max_output_tokens: 300,
    instructions: `You provide live text translation of a mosque sermon. Detect the speaker's language automatically. Translate each spoken turn faithfully into ${languageNames[targetLanguage]}. Output only the translation, without labels, explanations, greetings, or quotation marks. Preserve names and religious terms accurately.`,
    audio: {
      input: {
        noise_reduction: { type: 'far_field' },
        turn_detection: { type: 'server_vad', create_response: true, interrupt_response: true, prefix_padding_ms: 300, silence_duration_ms: 350, threshold: 0.45 }
      }
    }
  };
  const form = new FormData();
  form.append('sdp', new Blob([sdp], { type: 'application/sdp' }), 'offer.sdp');
  form.append('session', new Blob([JSON.stringify(session)], { type: 'application/json' }), 'session.json');
  const response = await fetch('https://api.openai.com/v1/realtime/calls', {
    method: 'POST', headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` }, body: form
  });
  if (!response.ok) {
    console.error('OpenAI Realtime call failed', response.status);
    return json({ error: `Live translation could not start (${response.status}). Please check API billing and Realtime API access.` }, 502);
  }
  return new Response(await response.text(), { status: 200, headers: { 'Content-Type': 'application/sdp', 'Cache-Control': 'no-store' } });
}

function json(body, status) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
