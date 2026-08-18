/**
 * Lume runtime configuration.
 * Safe to publish on GitHub Pages. NEVER put API keys here.
 * RETRIEVAL_ENDPOINT points to the Cloudflare Worker that holds the Brave Search token.
 */
window.LUME_CONFIG = Object.freeze({
  RETRIEVAL_PROVIDER: 'web',
  RETRIEVAL_ENDPOINT: '', // e.g. https://lume-search.<account>.workers.dev
  RETRIEVAL_TIMEOUT_MS: 22000,
  AI_ENDPOINT: '', // optional: only for future vision/adaptation; not needed for web recipe retrieval
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
