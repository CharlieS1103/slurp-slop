// SLURPSLOP Config
// Central place for static configuration constants used by modules
// ex of import (unused)

(() => {
  const NS = (window.SlurpSlop = window.SlurpSlop || {});
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
