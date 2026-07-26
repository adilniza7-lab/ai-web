const names = {
  en: 'English', ru: 'Русский', ar: 'العربية', tr: 'Türkçe', de: 'Deutsch',
  fr: 'Français', es: 'Español', it: 'Italiano', nl: 'Nederlands', sv: 'Svenska',
  no: 'Norsk', da: 'Dansk', fi: 'Suomi', pl: 'Polski', ro: 'Română',
  uk: 'Українська', so: 'Soomaali', ur: 'اردو', fa: 'فارسی', prs: 'دری',
  ku: 'Kurdî', bn: 'বাংলা', sq: 'Shqip', bs: 'Bosanski'
};
const language = document.querySelector('#language');
const target = document.querySelector('#target');
const translation = document.querySelector('#translation');
const statusText = document.querySelector('#statusText');
let recorder;
let activeLanguage = language.value;

function chooseLanguage() {
  target.textContent = names[language.value];
  activeLanguage = language.value;
}

language.addEventListener('change', chooseLanguage);
chooseLanguage();
startListening();

async function startListening() {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    statusText.textContent = 'This browser does not support live microphone translation.';
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });
    const mimeType = supportedMimeType();
    recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    recorder.addEventListener('dataavailable', ({ data }) => {
      if (data.size) translateAudio(data);
    });
    recorder.start(4500);
    statusText.textContent = 'Listening and translating live';
    document.querySelector('#source').textContent = "Speaker's language: detecting automatically";
  } catch (error) {
    statusText.textContent = 'Microphone access is needed for live translation.';
    translation.textContent = 'Please allow microphone access in your browser settings, then reload this page.';
  }
}

function supportedMimeType() {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

async function translateAudio(audio) {
  const form = new FormData();
  const extension = audio.type.includes('mp4') ? 'mp4' : 'webm';
  form.append('audio', audio, `sermon.${extension}`);
  form.append('targetLanguage', activeLanguage);

  try {
    const response = await fetch('/api/translate', { method: 'POST', body: form });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Translation failed');
    if (!result.translation) return;
    document.querySelector('#source').textContent = `Speaker's language: ${result.detectedLanguage}`;
    translation.textContent = result.translation;
    translation.classList.remove('empty');
  } catch (error) {
    statusText.textContent = error.message || 'Translation service is unavailable.';
  }
}
