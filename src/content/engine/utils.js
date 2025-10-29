// SLURPSLOP Utilities

(() => {
  const NS = (window.SlurpSlop = window.SlurpSlop || {});
  NS.utils = NS.utils || {};

  // just helpful to aggregate our lil sanitized values for us
  function unique(values) {
    return [...new Set(values)];
  }

  // Keep only strings, trim, lowercase, and drop empties, remove dupes
  function sanitizeCaseInsensitiveArray(values = []) {
    return unique(
      (Array.isArray(values) ? values : [])
        .filter(v => typeof v === 'string')
        .map(v => v.trim().toLowerCase())
        .filter(Boolean)
    );
  }

  // Keep only strings, trim, drop empties, remove dupes
  function sanitizeSelectors(values = []) {
    return unique(
      (Array.isArray(values) ? values : [])
        .filter(v => typeof v === 'string')
        .map(v => v.trim())
        .filter(Boolean)
    );
  }

  // good utility func, not used as of right now but smart to keep
  // just for safe fetching through chrome api
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

  // this code won't need to change ever, just the logger definitions
  let _enabled = false;
  const Logger = {
    setEnabled(v) {
      _enabled = !!v;
    },
    info(msg, data) {
      if (!_enabled) {
        return;
      }
      console.log(`[SlurpSlop] INFO: ${msg}`, data || '');
    },
    debug(msg, data) {
      if (!_enabled) {
        return;
      }
      console.log(`[SlurpSlop] DEBUG: ${msg}`, data || '');
    },
    warn(msg, data) {
      console.warn(`[SlurpSlop] WARN: ${msg}`, data || '');
    },
    error(msg, data) {
      console.error(`[SlurpSlop] ERROR: ${msg}`, data || '');
    }
  };

  // filter data, KEEP EMPTY!!!!

  function getFilterData() {
    // Filter data is set by core/data.js upon bundle, defining it here as it's a getter func thus belongs in utils
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

  // Collect snippet/description text from a result container using shared selectors
  function collectSnippetText(result) {
    try {
      const SEL = NS.selectors;
      if (!result || !SEL || !Array.isArray(SEL.SNIPPETS)) {
        return '';
      }
      const snippets = [];
      SEL.SNIPPETS.forEach(selector => {
        result.querySelectorAll(selector).forEach(node => {
          const text = node.textContent || '';
          if (text) {
            snippets.push(text);
          }
        });
      });
      return snippets.join(' ');
    } catch {
      return '';
    }
  }

  // Domain name handlers

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
    // this will return true if any word in the hostname matches any of the no no
    // identifiers defined in data.js
    return data.lowQualityDomains.some(
      domain => normalized === domain || normalized.includes(`.${domain}`)
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

  // Backwards-compatible export: some modules read from NS.collectSnippetText
  if (!NS.collectSnippetText) {
    NS.collectSnippetText = collectSnippetText;
  }
})();
