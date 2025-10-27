// SlopSlurp Config
// Central place for static configuration constants used by modules.
(() => {
  const NS = (window.SlopSlurp = window.SlopSlurp || {});
  NS.config = NS.config || {};

  // Extension Configuration
  const CONFIG = {
    maxRemovalsPerScan: 25,
    scanDebounceMs: 500,
    minScanIntervalMs: 1000
  };

  // Export to namespace
  Object.assign(NS.config, {
    CONFIG
  });
})();
