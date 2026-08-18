/** Lume runtime configuration. Safe to publish: no API keys are used for direct retrieval. */
window.LUME_CONFIG = Object.freeze({
  RETRIEVAL_PROVIDER: 'direct-sources',
  RETRIEVAL_TIMEOUT_MS: 9000,
  MAX_PROVIDER_RESULTS: 8,
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
