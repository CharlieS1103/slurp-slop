// SlopSlurp Config
// Central place for static configuration constants used by modules.
(() => {
  const NS = (window.SlopSlurp = window.SlopSlurp || {});
  NS.config = NS.config || {};

  // Configuration can be added here as needed
  // Data is now bundled directly in core/data.js

  // Export to namespace
  Object.assign(NS.config, {
    // Future config options go here
  });
})();
