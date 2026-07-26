const languageNames = {
  en: 'English', ru: 'Russian', ar: 'Arabic', tr: 'Turkish', de: 'German',
  fr: 'French', es: 'Spanish', it: 'Italian', nl: 'Dutch', sv: 'Swedish',
  no: 'Norwegian', da: 'Danish', fi: 'Finnish', pl: 'Polish', ro: 'Romanian',
  uk: 'Ukrainian', so: 'Somali', ur: 'Urdu', fa: 'Persian (Farsi)', prs: 'Dari',
  ku: 'Kurdish', bn: 'Bengali', sq: 'Albanian', bs: 'Bosnian'
};

export async function onRequestPost({ request, env }) {
  if (!env.OPENAI_API_KEY) return json({ error: 'Translation service is not configured yet.' }, 503);
  const form = await request.formData();
  const audio = form.get('audio');
  const targetLanguage = form.get('targetLanguage');
  if (!(audio instanceof File) || !languageNames[targetLanguage]) return json({ error: 'Invalid translation request.' }, 400);

  const transcriptionForm = new FormData();
  transcriptionForm.append('file', audio, audio.name || 'sermon.webm');
  transcriptionForm.append('model', 'gpt-4o-mini-transcribe');
  const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST', headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` }, body: transcriptionForm
  });
  if (!transcriptionResponse.ok) {
    console.error('OpenAI transcription failed', transcriptionResponse.status);
    return json({ error: `Speech recognition failed (${transcriptionResponse.status}).` }, 502);
  }
  const { text } = await transcriptionResponse.json();
  if (!text?.trim()) return json({ translation: '' });

  const translationResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4.1-mini', temperature: 0, response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `Detect the language of the text and translate it faithfully into ${languageNames[targetLanguage]}. Preserve religious terms where appropriate. Return only JSON with keys detectedLanguage and translation.` },
        { role: 'user', content: text }
      ]
    })
  });
  if (!translationResponse.ok) {
    console.error('OpenAI translation failed', translationResponse.status);
    return json({ error: `Translation failed (${translationResponse.status}).` }, 502);
  }
  const completion = await translationResponse.json();
  try { return json(JSON.parse(completion.choices[0].message.content)); }
  catch { return json({ error: 'Translation response was invalid.' }, 502); }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
