# Minbar Live

Mobile-first English-language prototype for live, text-only sermon translation.

The visitor opens a QR-code link directly to the live translation screen. They can choose or change their language at any time without interrupting the sermon. The page is intentionally lightweight and does not ask a visitor for microphone permission.

## What is needed for live operation

One mosque-controlled broadcaster needs a microphone and a small server that:

1. streams the imam's audio to a speech-recognition service with automatic language identification;
2. translates completed speech segments into the languages currently in use;
3. sends each translation to listeners over WebSocket.

The visitor page is ready to receive `{ type: 'translation', detectedLanguage, text, targetLanguage }` events. A production version should also use a unique session QR link, access controls for the broadcaster, and a notice that translations are automated.
