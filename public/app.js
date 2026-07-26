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
let peerConnection;
let dataChannel;
let mediaStream;
let activeLanguage = language.value;
let latestResponseId = '';

function chooseLanguage() {
  activeLanguage = language.value;
  target.textContent = names[activeLanguage];
  if (dataChannel?.readyState === 'open') reconnect();
}

language.addEventListener('change', chooseLanguage);
chooseLanguage();
startListening();

async function startListening() {
  if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
    showError('This browser does not support live microphone translation. Please open the QR link in Chrome or Safari.');
    return;
  }

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });
    await connect();
  } catch (error) {
    showError('Microphone access is needed for live translation. Please allow it in browser settings and reload this page.');
  }
}

async function connect() {
  closeConnection();
  statusText.textContent = 'Connecting to live translation…';
  peerConnection = new RTCPeerConnection();
  mediaStream.getTracks().forEach((track) => peerConnection.addTrack(track, mediaStream));
  dataChannel = peerConnection.createDataChannel('oai-events');
  dataChannel.addEventListener('open', () => {
    statusText.textContent = 'Listening and translating live';
    document.querySelector('#source').textContent = "Speaker's language: detecting automatically";
  });
  dataChannel.addEventListener('message', handleRealtimeEvent);
  dataChannel.addEventListener('close', () => {
    if (peerConnection?.connectionState !== 'closed') showError('Live connection closed. Please reload the page.');
  });
  peerConnection.addEventListener('connectionstatechange', () => {
    if (peerConnection.connectionState === 'failed') showError('Live connection failed. Please reload the page.');
  });

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  const response = await fetch('/api/realtime-call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sdp: offer.sdp, targetLanguage: activeLanguage })
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || 'Unable to start live translation.');
  }
  await peerConnection.setRemoteDescription({ type: 'answer', sdp: await response.text() });
}

function handleRealtimeEvent({ data }) {
  const event = JSON.parse(data);
  if (event.type === 'response.output_text.delta') {
    if (latestResponseId !== event.response_id) {
      latestResponseId = event.response_id;
      translation.textContent = '';
      translation.classList.remove('empty');
    }
    translation.textContent += event.delta;
  }
  if (event.type === 'response.output_text.done' && event.text) {
    translation.textContent = event.text;
    translation.classList.remove('empty');
  }
  if (event.type === 'error') showError(event.error?.message || 'Live translation service error.');
}

function reconnect() {
  if (!mediaStream) return;
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
