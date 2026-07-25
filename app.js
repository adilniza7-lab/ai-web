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

function chooseLanguage() {
  target.textContent = names[language.value];
  connectToTranslationSession(language.value);
}

language.addEventListener('change', chooseLanguage);
chooseLanguage();

// The mosque's broadcaster sends events from its microphone through a secure server.
// Replace this demo hook with a WebSocket, e.g. wss://your-domain/live/{mosque-session}.
function connectToTranslationSession(targetLanguage) {
  document.querySelector('#statusText').textContent = 'Connected to live translation';
  document.querySelector('#source').textContent = "Speaker's language: detecting automatically";

  // Expected event shape from the server:
  // { type: 'translation', detectedLanguage: 'Somali', text: '…', targetLanguage: 'ru' }
  window.receiveTranslation = (event) => {
    if (event.type !== 'translation' || event.targetLanguage !== targetLanguage) return;
    document.querySelector('#source').textContent = `Speaker's language: ${event.detectedLanguage}`;
    translation.textContent = event.text;
    translation.classList.remove('empty');
  };
}
