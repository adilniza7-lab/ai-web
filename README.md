# Minbar Live

Mobile-first live, text-only sermon translation. A visitor scans a QR code, allows microphone access, selects a language, and receives a new translation every few seconds.

## Required setup before testing

This site uses a Cloudflare Worker. In the Worker settings, add an encrypted secret named `OPENAI_API_KEY` with an OpenAI API key. Never add the key to the repository or to browser code.

After the next deployment, open the public site on a phone over HTTPS, allow microphone access, and speak near the phone speaker. The server recognizes the source language automatically and translates it into the selected language.

## Notes

- Each phone processes only its own microphone input; a phone closer to the mosque speaker will usually have better results.
- Audio is transmitted in short segments only to perform transcription and translation.
- Automatic religious translation can contain errors and should not be treated as an authoritative interpretation.
