// SlopSlurp: Professional Search Results
// This content script removes AI Overview sections and low-quality content from Google search results
// Now supports both comprehensive and minimalist modes

(function() {
  'use strict';

  // ============ CORE VARIABLES ============

  let extensionEnabled = true;
  let lastQuery = '';
  let minimalistObserver = null;
  let comprehensiveObserver = null;

  let currentStats = {
    aiElementsRemoved: 0,
    lowQualitySitesRemoved: 0,
    adsRemoved: 0,
    totalElementsRemoved: 0,
    scanCount: 0,
    lastScanTime: 0,
    placeholdersCreated: 0
  };

  // Logging toggle for verbose console output
  let loggingEnabled = false;

  let filterSettings = {
    removeAiOverview: true,
    removeLowQualitySites: true,
    removeAds: true,
    academicMode: false,
    minimalistMode: false,
    showReplacementPlaceholders: false,
    customWhitelist: []
  };

  // ============ UTILITY FUNCTIONS ============

  // Simple logger
  const Logger = {
    info: (msg, data) => {
      if (!loggingEnabled) {
        return;
      }
      console.log(`[SlopSlurp] INFO: ${msg}`, data || '');
    },
    warn: (msg, data) => console.warn(`[SlopSlurp] WARN: ${msg}`, data || ''),
    error: (msg, data) => console.error(`[SlopSlurp] ERROR: ${msg}`, data || ''),
    debug: (msg, data) => {
      if (!loggingEnabled) {
        return;
      }
      console.log(`[SlopSlurp] DEBUG: ${msg}`, data || '');
    }
  };

  // Check if we should auto-disable extension based on search query
  function shouldAutoDisable() {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    if (!query) {
      return false;
    }

    const lowerQuery = query.toLowerCase();
    const disableTerms = [
      'ai overview',
      'sparknotes',
      'generative ai',
      'content farms',
      'filter google search',
      'remove ai results',
      'block ai overview'
    ];

    return disableTerms.some(term => lowerQuery.includes(term));
  }

  // Show banner when auto-disabled
  function showAutoDisableBanner() {
    const existingBanner = document.getElementById(
      'clean-search-auto-disable-banner'
    );
    if (existingBanner) {
      existingBanner.remove();
    }

    const banner = document.createElement('div');
    banner.id = 'clean-search-auto-disable-banner';
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #ff8c00 0%, #ff6600 100%);
      color: white;
      padding: 12px 20px;
      text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      transition: all 0.3s ease;
    `;

    banner.innerHTML = `
       SlopSlurp temporarily disabled - Click to re-enable
      <small style="display: block; margin-top: 4px; opacity: 0.9; font-size: 12px;">
        Auto-disabled because your search might be looking for filtered content
      </small>
    `;

    banner.addEventListener('click', () => {
      extensionEnabled = true;
      banner.remove();
      showNotification('SlopSlurp re-enabled', 'success');
      setTimeout(() => {
        if (filterSettings.minimalistMode) {
          initMinimalistMode();
        } else {
          initComprehensiveMode();
        }
      }, 100);
    });

    document.body.appendChild(banner);
  }

  // Show notification
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#10b981' : '#3b82f6'};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      z-index: 10001;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;

    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);

    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  // Reset stats for new query
  function resetStats() {
    const urlParams = new URLSearchParams(window.location.search);
    const currentQuery = urlParams.get('q');

    if (currentQuery !== lastQuery) {
      lastQuery = currentQuery;
      currentStats = {
        aiElementsRemoved: 0,
        lowQualitySitesRemoved: 0,
        adsRemoved: 0,
        totalElementsRemoved: 0,
        scanCount: 0,
        lastScanTime: Date.now(),
        placeholdersCreated: 0
      };

      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ cleanSearchStats: currentStats });
      }
    }
  }

  // Update stats
  function updateStats(type, count = 1) {
    currentStats[type] += count;
    currentStats.totalElementsRemoved += count;
    currentStats.lastScanTime = Date.now();

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ cleanSearchStats: currentStats });
    }
  }

  // ============ MINIMALIST MODE IMPLEMENTATION ============

  function initMinimalistMode() {
    Logger.info('Starting minimalist mode');

    // Disconnect any existing observers
    if (minimalistObserver) {
      minimalistObserver.disconnect();
    }
    if (comprehensiveObserver) {
      comprehensiveObserver.disconnect();
    }

    // Multilingual patterns for AI Overview detection
    const patterns = [
      /übersicht mit ki/i, // de
      /ai overview/i, // en
      /prezentare generală generată de ai/i, // ro
      /AI による概要/, // ja
      /Обзор от ИИ/, // ru
      /AI 摘要/, // zh-TW
      /AI-overzicht/i, // nl
      /Vista creada con IA/i, // es
      /Přehled od AI/i // cz
    ];

    minimalistObserver = new MutationObserver(() => {
      if (!extensionEnabled) {
        return;
      }

      // each time there's a mutation in the document see if there's an ai overview to hide
      const mainBody = document.querySelector('div#rcnt');
      const aiText = [...(mainBody?.querySelectorAll('h1, h2') || [])].find(e =>
        patterns.some(pattern => pattern.test(e.innerText))
      );

      let aiOverview = aiText?.closest('div#rso > div'); // AI overview as a search result
      if (!aiOverview) {
        aiOverview = aiText?.closest('div#rcnt > div');
      } // AI overview above search results

      // Hide AI overview (use centralized removal so logging and stats are consistent)
      if (aiOverview) {
        removeElement(aiOverview, 'ai');
      }

      // Restore padding after header tabs
      const headerTabs = document.querySelector('div#hdtb-sc > div');
      if (headerTabs) {
        headerTabs.style.paddingBottom = '12px';
      }

      const mainElement = document.querySelector('[role="main"]');
      if (mainElement) {
        mainElement.style.marginTop = '24px';
      }

      // Remove entries in "People also ask" section if it contains "AI overview"
      const peopleAlsoAskAiOverviews = [
        ...document.querySelectorAll('div.related-question-pair')
      ].filter(el => patterns.some(pattern => pattern.test(el.innerHTML)));

      peopleAlsoAskAiOverviews.forEach(el => {
        const target = el.parentElement && el.parentElement.parentElement ? el.parentElement.parentElement : el;
        if (target) {
          removeElement(target, 'ai');
        }
      });
    });

    minimalistObserver.observe(document, {
      childList: true,
      subtree: true
    });

    // Trigger initial scan
    setTimeout(() => {
      minimalistObserver.takeRecords();
      // Manually trigger the callback for initial scan
      const mainBody = document.querySelector('div#rcnt');
      if (mainBody) {
        minimalistObserver.callback([]);
      }
    }, 100);
  }

  // ============ COMPREHENSIVE MODE IMPLEMENTATION ============

  const AI_SELECTORS = [
    '[jscontroller="EYwa3d"]',
    '[jscontroller="g5dM4c"]',
    '[data-initdone="true"]',
    '[data-async-context]',
    'div[data-async-token]',
    'g-section-with-header'
  ];

  function isLowQualitySite(url) {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      const exactMatches = [
        'sparknotes.com',
        'www.sparknotes.com',
        'litcharts.com',
        'www.litcharts.com',
        'shmoop.com',
        'www.shmoop.com',
        'cliffsnotes.com',
        'www.cliffsnotes.com',
        'coursehero.com',
        'www.coursehero.com'
      ];

      return exactMatches.includes(hostname);
    } catch {
      return false;
    }
  }

  function removeElement(element, type = 'unknown') {
    if (
      !extensionEnabled ||
      !element ||
      element.hasAttribute('data-removed') ||
      element.hasAttribute('data-clean-search-removed')
    ) {
      return;
    }

    try {
      // Mark element as removed by either system so other code won't try again
      element.setAttribute('data-removed', 'true');
      element.setAttribute('data-clean-search-removed', 'true');
      element.style.display = 'none';

      const statType =
        type === 'ai'
          ? 'aiElementsRemoved'
          : type === 'low-quality'
            ? 'lowQualitySitesRemoved'
            : type === 'ad'
              ? 'adsRemoved'
              : 'totalElementsRemoved';

      updateStats(statType, 1);

      // Log the removed DOM node (object) so developers can inspect it when logging is enabled
      Logger.info('Removed element', { type, element });
    } catch (error) {
      Logger.warn(`Error removing ${type} element:`, error);
    }
  }

  function scanForContent() {
    if (!extensionEnabled || filterSettings.minimalistMode) {
      return;
    }

    try {
      currentStats.scanCount++;

      // Scan for AI content
      if (filterSettings.removeAiOverview) {
        AI_SELECTORS.forEach(selector => {
          try {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
              if (!el.hasAttribute('data-removed')) {
                const text = (el.textContent || '').toLowerCase();
                if (
                  text.includes('ai overview') ||
                  text.includes('generative ai')
                ) {
                  removeElement(el, 'ai');
                }
              }
            });
          } catch {
            // Ignore invalid selectors
          }
        });

        // Text-based detection
        const headings = document.querySelectorAll('h1, h2, h3');
        headings.forEach(heading => {
          const text = (heading.textContent || '').toLowerCase().trim();
          if (text === 'ai overview' || text === 'overview from google') {
            const container = heading.closest('.g, .yf, [data-ved]');
            if (container && !container.hasAttribute('data-removed')) {
              removeElement(container, 'ai');
            }
          }
        });
      }

      // Scan for low-quality sites
      if (filterSettings.removeLowQualitySites) {
        const searchResults = document.querySelectorAll('.g');
        searchResults.forEach(result => {
          if (
            !result.hasAttribute('data-removed') &&
            isLowQualitySite(result)
          ) {
            removeElement(result, 'low-quality');
          }
        });
      }
    } catch (error) {
      Logger.error('Error scanning for content', error);
    }
  }

  function initComprehensiveMode() {
    Logger.info('Starting comprehensive mode');

    // Disconnect any existing observers
    if (minimalistObserver) {
      minimalistObserver.disconnect();
    }
    if (comprehensiveObserver) {
      comprehensiveObserver.disconnect();
    }

    comprehensiveObserver = new MutationObserver(() => {
      if (extensionEnabled && !filterSettings.minimalistMode) {
        setTimeout(() => scanForContent(), 150);
      }
    });

    comprehensiveObserver.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });

    // Initial scans
    scanForContent();
    setTimeout(() => scanForContent(), 500);
    setTimeout(() => scanForContent(), 2000);
  }

  // ============ INITIALIZATION ============

  function initialize() {
    // Check for auto-disable first
    if (shouldAutoDisable()) {
      extensionEnabled = false;
      showAutoDisableBanner();
      Logger.info('Extension auto-disabled due to query content');
      return;
    }

    // Reset stats for new queries
    resetStats();

    // Load settings from storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(
        ['cleanSearchEnabled', 'filterSettings', 'loggingEnabled'],
        result => {
          if (result.cleanSearchEnabled !== undefined) {
            extensionEnabled = result.cleanSearchEnabled && extensionEnabled;
          }
          if (result.filterSettings) {
            filterSettings = { ...filterSettings, ...result.filterSettings };
          }

          // Load logging enabled flag
          if (typeof result.loggingEnabled !== 'undefined') {
            loggingEnabled = !!result.loggingEnabled;
          }

          // Initialize the appropriate mode
          if (extensionEnabled) {
            if (filterSettings.minimalistMode) {
              initMinimalistMode();
            } else {
              initMinimalistMode();
              initComprehensiveMode();
            }
          }
        }
      );
    } else {
      // Fallback when chrome storage is not available
      if (extensionEnabled) {
        if (filterSettings.minimalistMode) {
          initMinimalistMode();
        } else {
          initComprehensiveMode();
        }
      }
    }

    Logger.info('SlopSlurp initialized', {
      url: window.location.href,
      mode: filterSettings.minimalistMode ? 'minimalist' : 'comprehensive',
      enabled: extensionEnabled
    });

    // ============ DEBUG HELPERS ============

    window.cleanSearchDebug = {
      scan: () => {
        if (filterSettings.minimalistMode) {
          initMinimalistMode();
        } else {
          scanForContent();
        }
      },
      getStats: () => currentStats,
      resetStats: () => {
        currentStats = {
          aiElementsRemoved: 0,
          lowQualitySitesRemoved: 0,
          adsRemoved: 0,
          totalElementsRemoved: 0,
          scanCount: 0,
          lastScanTime: Date.now(),
          placeholdersCreated: 0
        };
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.set({ cleanSearchStats: currentStats });
        }
      },
      setEnabled: enabled => {
        extensionEnabled = enabled;
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.set({ cleanSearchEnabled: enabled });
        }
        if (enabled) {
          if (filterSettings.minimalistMode) {
            initMinimalistMode();
          } else {
            initComprehensiveMode();
          }
        } else {
          if (minimalistObserver) {
            minimalistObserver.disconnect();
          }
          if (comprehensiveObserver) {
            comprehensiveObserver.disconnect();
          }
        }
      },
      updateSettings: newSettings => {
        const oldMinimalistMode = filterSettings.minimalistMode;
        filterSettings = { ...filterSettings, ...newSettings };

        // Apply logging flag if present in the settings object
        if (newSettings && typeof newSettings.loggingEnabled !== 'undefined') {
          loggingEnabled = !!newSettings.loggingEnabled;
        }

        // Handle mode changes
        if (oldMinimalistMode !== filterSettings.minimalistMode) {
          if (filterSettings.minimalistMode) {
            initMinimalistMode();
            showNotification('Switched to minimalist mode', 'success');
          } else {
            initComprehensiveMode();
            showNotification('Switched to comprehensive mode', 'success');
          }
        }

        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.set({ filterSettings: filterSettings });
        }
      },
      getSettings: () => filterSettings,
      isEnabled: () => extensionEnabled,
      getMode: () => (filterSettings.minimalistMode ? 'minimalist' : 'comprehensive'),
      setLogging: enabled => {
        loggingEnabled = !!enabled;
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.set({ loggingEnabled: loggingEnabled });
        }
        if (loggingEnabled) {
          Logger.info('Logging enabled');
        } else {
          console.log('[SlopSlurp] Logging disabled');
        }
      },
      getLogging: () => loggingEnabled,
      switchMode: () => {
        filterSettings.minimalistMode = !filterSettings.minimalistMode;
        window.cleanSearchDebug.updateSettings(filterSettings);
        return filterSettings.minimalistMode ? 'minimalist' : 'comprehensive';
      }
    };

    // Legacy compatibility
    window.debugAiRemover = window.cleanSearchDebug;

    // Start initialization when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initialize);
    } else {
      initialize();
    }
  }

  // Initialize on script load
  initialize();
})();
