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
const sourceText = document.querySelector('#sourceText');
const statusText = document.querySelector('#statusText');
const voiceEnabled = document.querySelector('#voiceEnabled');
const volume = document.querySelector('#volume');
const translatedAudio = document.querySelector('#translatedAudio');
const enableMicrophone = document.querySelector('#enableMicrophone');
let peerConnection;
let dataChannel;
let mediaStream;
let activeLanguage = language.value;
let sourceTranscript = '';

function chooseLanguage() {
  activeLanguage = language.value;
  target.textContent = names[activeLanguage];
  if (peerConnection) reconnect();
}

language.addEventListener('change', chooseLanguage);
voiceEnabled.addEventListener('change', () => { translatedAudio.muted = !voiceEnabled.checked; });
volume.addEventListener('input', () => { translatedAudio.volume = Number(volume.value); });
enableMicrophone.addEventListener('click', startListening);
translatedAudio.muted = true;
chooseLanguage();
startListening();

async function startListening() {
  if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
    showMicrophoneHelp('This browser does not support live microphone translation. Please open the QR link in Chrome or Safari.');
    return;
  }
  try {
    mediaStream?.getTracks().forEach((track) => track.stop());
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    enableMicrophone.classList.remove('visible');
    await connect();
  } catch {
    showMicrophoneHelp('Tap “Enable microphone”, then choose Allow. If the browser has blocked it before, open the lock icon next to the website address and allow Microphone.');
  }
}

async function connect() {
  closeConnection();
  statusText.textContent = 'Connecting to live translation…';
  peerConnection = new RTCPeerConnection();
  mediaStream.getTracks().forEach((track) => peerConnection.addTrack(track, mediaStream));
  peerConnection.addEventListener('track', ({ streams }) => {
    translatedAudio.srcObject = streams[0];
    translatedAudio.play().catch(() => {});
  });
  dataChannel = peerConnection.createDataChannel('oai-events');
  dataChannel.addEventListener('open', () => {
    statusText.textContent = 'Listening, translating, and speaking live';
    document.querySelector('#source').textContent = "Speaker's language: detecting automatically";
  });
  dataChannel.addEventListener('message', handleTranslationEvent);
  dataChannel.addEventListener('close', () => { if (peerConnection?.connectionState !== 'closed') showError('Live connection closed. Please reload the page.'); });
  peerConnection.addEventListener('connectionstatechange', () => { if (peerConnection.connectionState === 'failed') showError('Live connection failed. Please reload the page.'); });

  const { value: clientSecret } = await fetch('/api/translation-session', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetLanguage: activeLanguage })
  }).then(async (response) => {
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Unable to start live translation.');
    return result;
  });
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  const response = await fetch('https://api.openai.com/v1/realtime/translations/calls', {
    method: 'POST', headers: { Authorization: `Bearer ${clientSecret}`, 'Content-Type': 'application/sdp' }, body: offer.sdp
  });
  if (!response.ok) throw new Error('Unable to connect to live translation.');
  await peerConnection.setRemoteDescription({ type: 'answer', sdp: await response.text() });
}

function handleTranslationEvent({ data }) {
  const event = JSON.parse(data);
  if (event.type === 'session.output_transcript.delta') {
    translation.textContent += event.delta;
    translation.classList.remove('empty');
  }
  if (event.type === 'session.input_transcript.delta') {
    sourceTranscript += event.delta;
    sourceText.textContent = sourceTranscript;
    sourceText.classList.remove('empty');
  }
  if (event.type === 'error') showError(event.error?.message || 'Live translation service error.');
}

function reconnect() {
  if (!mediaStream) return;
  translation.textContent = '';
  sourceTranscript = '';
  sourceText.textContent = "The speaker's words will appear here.";
  sourceText.classList.add('empty');
  connect().catch((error) => showError(error.message));
}

function closeConnection() {
  dataChannel?.close();
  peerConnection?.close();
  dataChannel = undefined;
  peerConnection = undefined;
}

function showError(message) {
  statusText.textContent = message;
  translation.textContent = 'Live translation is temporarily unavailable.';
  translation.classList.add('empty');
}

function showMicrophoneHelp(message) {
  statusText.textContent = message;
  translation.textContent = 'Microphone permission is needed to start live translation.';
  translation.classList.add('empty');
  enableMicrophone.classList.add('visible');
}
