// SlopSlurp Namespace bootstrap
(() => {
  const NS = (window.SlopSlurp = window.SlopSlurp || {});
  NS.version = NS.version || '2.x-dev';
  // Place shared mutable state buckets here as you migrate
  NS.state = NS.state || {};
  NS.config = NS.config || {};
  NS.utils = NS.utils || {};
})();
