import { onRequestPost as translate } from './functions/api/translate.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/translate' && request.method === 'POST') {
      return translate({ request, env });
    }
    return env.ASSETS.fetch(request);
  }
};
