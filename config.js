/** Lume runtime configuration. Safe to publish: direct retrieval uses no secret API keys. */
window.LUME_CONFIG = Object.freeze({
  VERSION: '0.14.0',
  RETRIEVAL_PROVIDER: 'direct-sources',
  RETRIEVAL_TIMEOUT_MS: 8500,
  MAX_PROVIDER_RESULTS: 16,
  AI_ENDPOINT: '',
  AI_TIMEOUT_MS: 30000,
  FAMILY: {
    people: 5,
    adults: 2,
    childrenAges: [3,5,11],
    allergies: [],
    cuisines: ['portuguesa','mediterranica'],
    priorities: ['pratica','saudavel','criancas']
  }
});
