// SlopSlurp Initialization & Main Entry Point
// This is the final module that orchestrates everything and sets up the extension
(() => {
  'use strict';

  const NS = (window.SlopSlurp = window.SlopSlurp || {});
  const { Logger, getFilterData } = NS.utils || {};

  // ============ STATE VARIABLES ============

  let extensionEnabled = true;
  let lastQuery = '';
  let minimalistObserver = null;
  let comprehensiveObserver = null;
  let loggingEnabled = false;

  let currentStats = {
    aiElementsRemoved: 0,
    lowQualitySitesRemoved: 0,
    adsRemoved: 0,
    totalElementsRemoved: 0,
    scanCount: 0,
    lastScanTime: Date.now(),
    placeholdersCreated: 0
  };

  let lifetimeStats = {
    totalElementsRemoved: 0,
    pagesProcessed: 0
  };

  let filterSettings = {
    removeAiOverview: true,
    removeLowQualitySites: true,
    removeAds: true,
    academicMode: false,
    minimalistMode: false,
    linksOnlyMode: false,
    hideAiModeButton: true,
    showReplacementPlaceholders: false,
    customWhitelist: []
  };

  // Safety mechanism - use config if available
  let safetyCounter = 0;
  const MAX_REMOVALS_PER_SCAN = NS.config?.CONFIG?.maxRemovalsPerScan || 25;

  // ============ CORE ELEMENT REMOVAL ============

  function isDangerousContainer(el) {
    if (!el) {
      return true;
    }

    const tag = (el.tagName || '').toUpperCase();
    if (tag === 'HTML' || tag === 'BODY') {
      return true;
    }

    const id = (el.id || '').toLowerCase();
    const role =
      (el.getAttribute && (el.getAttribute('role') || '').toLowerCase()) || '';

    if (
      id === 'rcnt' ||
      id === 'search' ||
      id === 'appbar' ||
      role === 'main'
    ) {
      return true;
    }

    try {
      const main = document.querySelector('[role="main"], #search');
      if (main && (el === main || el.contains(main))) {
        const childCount = el.childElementCount || 0;
        if (childCount > 5) {
          return true;
        }
      }
    } catch {}

    return false;
  }

  function removeElement(element, type = 'unknown') {
    if (
      !extensionEnabled ||
      !element ||
      element.hasAttribute('data-removed') ||
      element.hasAttribute('data-clean-search-removed') ||
      safetyCounter >= MAX_REMOVALS_PER_SCAN
    ) {
      return;
    }

    if (isDangerousContainer(element)) {
      Logger?.warn('Refusing to remove dangerous container', { type, element });
      return;
    }

    safetyCounter++;

    try {
      if (!element.hasAttribute('data-clean-search-original-display')) {
        let originalDisplay = '';
        try {
          originalDisplay = window.getComputedStyle(element).display || '';
        } catch {
          originalDisplay = '';
        }
        element.setAttribute(
          'data-clean-search-original-display',
          originalDisplay
        );
      }

      element.setAttribute('data-clean-search-type', type);
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

      if (
        filterSettings.showReplacementPlaceholders &&
        NS.createRemovalPlaceholder
      ) {
        NS.createRemovalPlaceholder(element, type, filterSettings);
      }

      Logger?.info('Removed element', { type, element });
    } catch (error) {
      Logger?.warn(`Error removing ${type} element:`, error);
    }
  }

  // ============ STATS MANAGEMENT ============

  function resetStats() {
    const urlParams = new URLSearchParams(window.location.search);
    const currentQuery = urlParams.get('q');

    if (currentQuery !== lastQuery) {
      lastQuery = currentQuery;
      safetyCounter = 0;
      
      // Reset current page stats
      currentStats = {
        aiElementsRemoved: 0,
        lowQualitySitesRemoved: 0,
        adsRemoved: 0,
        totalElementsRemoved: 0,
        scanCount: 0,
        lastScanTime: Date.now(),
        placeholdersCreated: 0
      };

      // Increment pages processed in lifetime stats
      lifetimeStats.pagesProcessed += 1;

      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ 
          cleanSearchStats: currentStats,
          lifetimeStats: lifetimeStats
        });
      }
    }
  }

  function updateStats(type, count = 1) {
    currentStats[type] += count;
    
    // Only increment totalElementsRemoved if we're not updating it directly
    if (type !== 'totalElementsRemoved' && type !== 'scanCount' && type !== 'placeholdersCreated') {
      currentStats.totalElementsRemoved += count;
      lifetimeStats.totalElementsRemoved += count;
    }
    
    currentStats.lastScanTime = Date.now();

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ 
        cleanSearchStats: currentStats,
        lifetimeStats: lifetimeStats
      });
    }
  }

  // ============ AUTO-DISABLE LOGIC ============

  function shouldAutoDisable() {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    if (!query) {
      return false;
    }

    const lowerQuery = query.toLowerCase();
    const filterData = getFilterData();
    return filterData.disableTerms.some(term => lowerQuery.includes(term));
  }

  // ============ MODE INITIALIZATION ============

  function initMinimalistMode() {
    Logger?.info('Starting minimalist mode');

    if (minimalistObserver) {
      minimalistObserver.disconnect();
    }
    if (comprehensiveObserver) {
      comprehensiveObserver.disconnect();
    }

    minimalistObserver = new MutationObserver(() => {
      if (NS.runMinimalistScan) {
        NS.runMinimalistScan(removeElement, isDangerousContainer, {
          extensionEnabled,
          hideAiModeButton: filterSettings.hideAiModeButton,
          customWhitelist: filterSettings.customWhitelist
        });
      }
    });

    minimalistObserver.observe(document, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      minimalistObserver.takeRecords();
      if (NS.runMinimalistScan) {
        NS.runMinimalistScan(removeElement, isDangerousContainer, {
          extensionEnabled,
          hideAiModeButton: filterSettings.hideAiModeButton,
          customWhitelist: filterSettings.customWhitelist
        });
      }
    }, 100);
  }

  function initComprehensiveMode() {
    Logger?.info('Starting comprehensive mode');

    if (minimalistObserver) {
      minimalistObserver.disconnect();
    }
    if (comprehensiveObserver) {
      comprehensiveObserver.disconnect();
    }

    let scanTimeout = null;
    let lastScanTime = 0;
    const SCAN_DEBOUNCE_MS = NS.config?.CONFIG?.scanDebounceMs || 500;
    const MIN_SCAN_INTERVAL_MS = NS.config?.CONFIG?.minScanIntervalMs || 1000;

    const scanWrapper = () => {
      if (!extensionEnabled || filterSettings.minimalistMode) {
        return;
      }

      // Clear any pending scan
      if (scanTimeout) {
        clearTimeout(scanTimeout);
      }

      // Debounce: wait for mutations to settle
      scanTimeout = setTimeout(() => {
        const now = Date.now();
        const timeSinceLastScan = now - lastScanTime;

        // Throttle: enforce minimum interval between scans
        if (timeSinceLastScan < MIN_SCAN_INTERVAL_MS) {
          return;
        }

        lastScanTime = now;
        safetyCounter = 0;

        if (NS.scanForContent) {
          NS.scanForContent(
            removeElement,
            isDangerousContainer,
            { ...filterSettings, extensionEnabled },
            currentStats
          );
        }
      }, SCAN_DEBOUNCE_MS);
    };

    comprehensiveObserver = new MutationObserver(scanWrapper);

    comprehensiveObserver.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });

    // Initial scans
    safetyCounter = 0;
    if (NS.scanForContent) {
      NS.scanForContent(
        removeElement,
        isDangerousContainer,
        { ...filterSettings, extensionEnabled },
        currentStats
      );
    }

    setTimeout(() => {
      if (filterSettings.hideAiModeButton && NS.hideAiModeInTopbar) {
        NS.hideAiModeInTopbar(
          extensionEnabled,
          filterSettings.hideAiModeButton
        );
      }
      safetyCounter = 0;
      if (NS.scanForContent) {
        NS.scanForContent(
          removeElement,
          isDangerousContainer,
          { ...filterSettings, extensionEnabled },
          currentStats
        );
      }
    }, 500);

    setTimeout(() => {
      safetyCounter = 0;
      if (NS.scanForContent) {
        NS.scanForContent(
          removeElement,
          isDangerousContainer,
          filterSettings,
          currentStats
        );
      }
    }, 2000);
  }

  // ============ INITIALIZATION ============

  function initialize() {
    try {
      if (loggingEnabled) {
        Logger?.info('Filter data loaded', getFilterData());
      }

      if (shouldAutoDisable()) {
        extensionEnabled = false;
        if (NS.showAutoDisableBanner) {
          NS.showAutoDisableBanner(() => {
            extensionEnabled = true;
            if (NS.showNotification) {
              NS.showNotification('SlopSlurp re-enabled', 'success');
            }
            setTimeout(() => {
              if (filterSettings.minimalistMode) {
                initMinimalistMode();
              } else {
                initComprehensiveMode();
              }
            }, 100);
          });
        }
        Logger?.info('Extension auto-disabled due to query content');
        return;
      }

      resetStats();

      // Export updateStats to namespace for use by other modules
      NS.updateStats = updateStats;

      const applySettings = () => {
        if (NS.handlePlaceholderSettingChange) {
          NS.handlePlaceholderSettingChange(
            extensionEnabled && !!filterSettings.showReplacementPlaceholders,
            filterSettings
          );
        }

        if (!extensionEnabled) {
          return;
        }

        if (filterSettings.minimalistMode) {
          initMinimalistMode();
        } else {
          initComprehensiveMode();
        }
      };

      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(
          ['cleanSearchEnabled', 'filterSettings', 'loggingEnabled', 'lifetimeStats', 'cleanSearchStats'],
          result => {
            // Default to enabled if not explicitly set
            extensionEnabled = result.cleanSearchEnabled !== false && extensionEnabled;
            
            // Initialize storage on first run
            if (result.cleanSearchEnabled === undefined) {
              chrome.storage.local.set({ cleanSearchEnabled: true });
            }
            
            if (result.filterSettings) {
              filterSettings = {
                ...filterSettings,
                ...result.filterSettings
              };
            }

            if (typeof result.loggingEnabled !== 'undefined') {
              loggingEnabled = !!result.loggingEnabled;
              if (Logger && typeof Logger.setEnabled === 'function') {
                Logger.setEnabled(loggingEnabled);
              }
            }

            if (result.lifetimeStats) {
              lifetimeStats = { ...lifetimeStats, ...result.lifetimeStats };
            }

            if (result.cleanSearchStats) {
              currentStats = { ...currentStats, ...result.cleanSearchStats };
            }

            applySettings();
          }
        );
      } else {
        applySettings();
      }

      Logger?.info('SlopSlurp initialized', {
        url: window.location.href,
        mode: filterSettings.minimalistMode ? 'minimalist' : 'comprehensive',
        enabled: extensionEnabled
      });

      // Debug API
      window.cleanSearchDebug = {
        scan: () => {
          safetyCounter = 0;
          if (filterSettings.minimalistMode && NS.runMinimalistScan) {
            NS.runMinimalistScan(removeElement, isDangerousContainer, {
              extensionEnabled,
              hideAiModeButton: filterSettings.hideAiModeButton,
              customWhitelist: filterSettings.customWhitelist
            });
          } else if (NS.scanForContent) {
            NS.scanForContent(
              removeElement,
              isDangerousContainer,
              { ...filterSettings, extensionEnabled },
              currentStats
            );
          }
        },
        getStats: () => currentStats,
        getLifetimeStats: () => lifetimeStats,
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
            if (NS.handlePlaceholderSettingChange) {
              NS.handlePlaceholderSettingChange(
                !!filterSettings.showReplacementPlaceholders,
                filterSettings
              );
            }
            if (filterSettings.minimalistMode) {
              initMinimalistMode();
            } else {
              initComprehensiveMode();
            }
          } else {
            if (NS.removeAllPlaceholders) {
              NS.removeAllPlaceholders();
            }
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
          const oldLinksOnlyMode = filterSettings.linksOnlyMode;
          filterSettings = { ...filterSettings, ...newSettings };

          if (
            newSettings &&
            typeof newSettings.loggingEnabled !== 'undefined'
          ) {
            loggingEnabled = !!newSettings.loggingEnabled;
            if (Logger && typeof Logger.setEnabled === 'function') {
              Logger.setEnabled(loggingEnabled);
            }
          }

          if (
            newSettings &&
            Object.prototype.hasOwnProperty.call(
              newSettings,
              'showReplacementPlaceholders'
            )
          ) {
            if (NS.handlePlaceholderSettingChange) {
              NS.handlePlaceholderSettingChange(
                !!filterSettings.showReplacementPlaceholders,
                filterSettings
              );
            }
          }

          if (oldMinimalistMode !== filterSettings.minimalistMode) {
            if (filterSettings.minimalistMode) {
              initMinimalistMode();
              if (NS.showNotification) {
                NS.showNotification('Switched to minimalist mode', 'success');
              }
            } else {
              initComprehensiveMode();
              if (NS.showNotification) {
                NS.showNotification(
                  'Switched to comprehensive mode',
                  'success'
                );
              }
            }
          }

          if (oldLinksOnlyMode !== filterSettings.linksOnlyMode) {
            initComprehensiveMode();
            if (NS.showNotification) {
              NS.showNotification(
                filterSettings.linksOnlyMode
                  ? 'Links-only mode enabled'
                  : 'Links-only mode disabled',
                'success'
              );
            }
          }

          if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ filterSettings: filterSettings });
          }
        },
        getSettings: () => filterSettings,
        isEnabled: () => extensionEnabled,
        getMode: () =>
          filterSettings.minimalistMode ? 'minimalist' : 'comprehensive',
        setLogging: enabled => {
          loggingEnabled = !!enabled;
          if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ loggingEnabled: loggingEnabled });
          }
          if (Logger && typeof Logger.setEnabled === 'function') {
            Logger.setEnabled(loggingEnabled);
          }
          if (loggingEnabled) {
            Logger?.info('Logging enabled');
          } else {
            console.log('[SlopSlurp] Logging disabled');
          }
        },
        getLogging: () => loggingEnabled,
        switchMode: () => {
          filterSettings.minimalistMode = !filterSettings.minimalistMode;
          window.cleanSearchDebug.updateSettings(filterSettings);
          return filterSettings.minimalistMode ? 'minimalist' : 'comprehensive';
        },
        runDiagnostics: () => {
          Logger?.info('Running diagnostics...');
          const wasEnabled = loggingEnabled;
          loggingEnabled = true;
          if (Logger && typeof Logger.setEnabled === 'function') {
            Logger.setEnabled(true);
          }

          const filterData = getFilterData();
          const aiElements = {};
          filterData.aiSelectors.forEach(selector => {
            try {
              const elements = document.querySelectorAll(selector);
              aiElements[selector] = elements.length;
              Logger?.info(
                `Selector ${selector} matches ${elements.length} elements`
              );
            } catch (e) {
              Logger?.error(`Error with selector ${selector}:`, e);
            }
          });

          Logger?.info('Checking for AI mode button in topbar');
          const aiModeButtons = Array.from(
            document.querySelectorAll('div[role="listitem"] a')
          ).filter(a => {
            const text = a.textContent.toLowerCase();
            return text.includes('ai mode');
          });
          Logger?.info(`Found ${aiModeButtons.length} AI mode buttons`);

          loggingEnabled = wasEnabled;
          if (Logger && typeof Logger.setEnabled === 'function') {
            Logger.setEnabled(wasEnabled);
          }

          return {
            aiElements,
            aiModeButtons: aiModeButtons.length,
            settings: filterSettings,
            stats: currentStats
          };
        }
      };

      window.debugAiRemover = window.cleanSearchDebug;
    } catch (error) {
      Logger?.error('Failed to initialize SlopSlurp', error);
    }
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();
