/**
 * Lume runtime configuration.
 * GitHub Pages can serve this file publicly: never put API keys here.
 * Point AI_ENDPOINT to your private Cloudflare Worker URL when deployed.
 */
window.LUME_CONFIG = Object.freeze({
  AI_ENDPOINT: '', // e.g. 'https://lume-ai.your-account.workers.dev'
  AI_TIMEOUT_MS: 30000,
  FAMILY: {
    people: 5,
    adults: 2,
    childrenAges: [3, 5, 11],
    allergies: [],
    cuisines: ['portuguesa', 'mediterranica'],
    priorities: ['pratica', 'saudavel', 'criancas']
  }
});
