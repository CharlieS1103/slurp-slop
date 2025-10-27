// SlopSlurp Utilities
// Common helpers shared across modules and the transitional monolith.
(() => {
  const NS = (window.SlopSlurp = window.SlopSlurp || {});
  NS.utils = NS.utils || {};

  // Internal unique helper
  function unique(values) {
    return [...new Set(values)];
  }

  // Keep only strings, trim, lowercase, and drop empties; remove duplicates
  function sanitizeCaseInsensitiveArray(values = []) {
    return unique(
      (Array.isArray(values) ? values : [])
        .filter(v => typeof v === 'string')
        .map(v => v.trim().toLowerCase())
        .filter(Boolean)
    );
  }

  // Keep only strings, trim, and drop empties; remove duplicates
  function sanitizeSelectors(values = []) {
    return unique(
      (Array.isArray(values) ? values : [])
        .filter(v => typeof v === 'string')
        .map(v => v.trim())
        .filter(Boolean)
    );
  }

  // Resolve a web-accessible asset to a fully-qualified extension URL
  function getAssetUrl(relativePath) {
    try {
      if (
        typeof chrome !== 'undefined' &&
        chrome.runtime &&
        typeof chrome.runtime.getURL === 'function'
      ) {
        return chrome.runtime.getURL(relativePath);
      }

      if (
        typeof browser !== 'undefined' &&
        browser.runtime &&
        typeof browser.runtime.getURL === 'function'
      ) {
        return browser.runtime.getURL(relativePath);
      }
    } catch {}
    return null;
  }

  // Lightweight logger with an enable toggle so monolith and modules share verbosity
  let _enabled = false;
  const Logger = {
    setEnabled(v) {
      _enabled = !!v;
    },
    info(msg, data) {
      if (!_enabled) {
        return;
      }
      console.log(`[SlopSlurp] INFO: ${msg}`, data || '');
    },
    debug(msg, data) {
      if (!_enabled) {
        return;
      }
      console.log(`[SlopSlurp] DEBUG: ${msg}`, data || '');
    },
    warn(msg, data) {
      console.warn(`[SlopSlurp] WARN: ${msg}`, data || '');
    },
    error(msg, data) {
      console.error(`[SlopSlurp] ERROR: ${msg}`, data || '');
    }
  };

  // ============ FILTER DATA MANAGEMENT ============
  // Data is now bundled directly in core/data.js - no async loading needed!

  function getFilterData() {
    // Filter data is set by core/data.js at load time
    return (
      NS.filterData || {
        disableTerms: [],
        aiOverviewPatterns: [],
        aiIndicatorPhrases: [],
        lowQualityDomains: [],
        adIndicatorLabels: [],
        aiSelectors: [],
        adSelectors: []
      }
    );
  }

  // ============ DOMAIN & TEXT HELPERS ============

  function extractHostname(urlString, depth = 0) {
    if (!urlString || depth > 3) {
      return null;
    }

    try {
      const parsed = new URL(urlString, window.location.origin);
      const hostname = parsed.hostname.toLowerCase();

      if (/(^|\.)google\./i.test(hostname)) {
        const candidateParams = ['url', 'q', 'u', 'target', 'continue'];
        for (const param of candidateParams) {
          const paramValue = parsed.searchParams.get(param);
          if (paramValue) {
            const extracted = extractHostname(paramValue, depth + 1);
            if (extracted) {
              return extracted;
            }
          }
        }
      }

      return hostname;
    } catch {
      return null;
    }
  }

  function isDomainWhitelisted(hostname, customWhitelist = []) {
    if (!hostname) {
      return false;
    }

    if (!Array.isArray(customWhitelist)) {
      return false;
    }

    const normalized = hostname.toLowerCase();
    return customWhitelist.some(entry => {
      if (typeof entry !== 'string') {
        return false;
      }
      const candidate = entry.trim().toLowerCase();
      if (!candidate) {
        return false;
      }
      return normalized === candidate || normalized.endsWith(`.${candidate}`);
    });
  }

  function isLowQualityHostname(hostname, customWhitelist = []) {
    if (!hostname) {
      return false;
    }

    const normalized = hostname.toLowerCase();
    if (isDomainWhitelisted(normalized, customWhitelist)) {
      return false;
    }

    const data = getFilterData();
    return data.lowQualityDomains.some(
      domain => normalized === domain || normalized.endsWith(`.${domain}`)
    );
  }

  function containsAiOverviewHeading(text) {
    if (!text) {
      return false;
    }
    const normalized = text.toLowerCase();
    const data = getFilterData();
    return data.aiOverviewPatterns.some(pattern =>
      normalized.includes(pattern)
    );
  }

  function containsAiIndicator(text) {
    if (!text) {
      return false;
    }
    const normalized = text.toLowerCase();
    const data = getFilterData();
    return data.aiIndicatorPhrases.some(phrase => normalized.includes(phrase));
  }

  // Export to namespace (only once at the end)
  Object.assign(NS.utils, {
    Logger,
    sanitizeCaseInsensitiveArray,
    sanitizeSelectors,
    getAssetUrl,
    getFilterData,
    extractHostname,
    isDomainWhitelisted,
    isLowQualityHostname,
    containsAiOverviewHeading,
    containsAiIndicator
  });
})();
