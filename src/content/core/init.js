// SlopSlurp Initialization & Main Entry Point
// This is the final module that orchestrates everything and sets up the extension
// I(cole) can take all the todo's in here
(() => {
  'use strict';

  const NS = (window.SlopSlurp = window.SlopSlurp || {});
  const { Logger, getFilterData } = NS.utils || {};

  // State variables
  // TODO: honestly might be worth moving to a more OOP based approach
  // given the shear number of variables this extension has to have
  // gonna start working on creating lets and the objects into one object, then refactor throughout the code

  let extension = {
    //State Variables
    extensionEnabled: true,
    lastQuery: '',
    minimalistObserver: null,
    comprehensiveObserver: null, 
    loggingEnabled: false,

    currentStats: {
      aiElementsRemoved: 0,
      lowQualitySitesRemoved: 0,
      adsRemoved: 0,
      totalElementsRemoved: 0,
      scanCount: 0,
      lastScanTime: Date.now(),
      placeholdersCreated: 0
    },

    filterSettings: {
      removeAiOverview: true,
      removeLowQualitySites: true,
      removeAds: true,
      academicMode: false,
      minimalistMode: false,
      linksOnlyMode: false,
      hideAiModeButton: true,
      showReplacementPlaceholders: false,
      disableTermsEnabled: false,
      customWhitelist: []
    }

  }

  // Safety mechanism, added default vals in addition to config for safety, but honestly could be removed.
  let safetyCounter = 0;
  const MAX_REMOVALS_PER_SCAN = NS.config?.CONFIG?.maxRemovalsPerScan || 25;

  // CORE FUNCTIONALITY / ELEMENT REMOVAL!!!! (from here down to the next capitalized text)

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
      // TODO: either switch this stuff into an array or pop them in selectors, haven't decided yet.
      id === 'rcnt' ||
      id === 'search' ||
      id === 'appbar' ||
      id === 'rso' ||
      id === 'res' ||
      id === 'center_col' ||
      id === 'cnt' ||
      role === 'main'
    ) {
      return true;
    }

    try {
      const main = document.querySelector('[role="main"], #search');
      const resultsRoot = document.querySelector('#rso');
      // Protect any parent that wraps the main or the primary results container
      if (
        (main && (el === main || el.contains(main))) ||
        (resultsRoot && (el === resultsRoot || el.contains(resultsRoot)))
      ) {
        return true;
      }
      // protect other large wrapper
      if (
        el.matches?.('#rso, #res, #center_col, #cnt, .mnr-c, .GLcBOb') ||
        el.closest?.('#center_col') === el
      ) {
        return true;
      }
    } catch {}

    return false;
  }

  function removeElement(element, type = 'unknown') {
    if (
      !extension.extensionEnabled ||
      !element ||
      element.hasAttribute('data-slopslurp-placeholder') ||
      element.hasAttribute('data-slopslurp-wrapper') ||
      element.hasAttribute('data-removed') ||
      element.hasAttribute('data-clean-search-removed') ||
      // If an parent was already removed, skip to avoid double placeholders, this is so annoying
      // TODO: fix all this placeholder nonsense
      (element.closest && element.closest('[data-clean-search-removed]')) ||
      // If element already has a placeholder as its next sibling, it was already processed
      // so skip it too...
      (element.nextElementSibling &&
        element.nextElementSibling.hasAttribute &&
        element.nextElementSibling.hasAttribute('data-slopslurp-container')) ||
      safetyCounter >= MAX_REMOVALS_PER_SCAN
    ) {
      // it won't work this is the most annoying part for sure
      return;
    }

    if (isDangerousContainer(element)) {
      // warn for this one of course
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
      //  TODO: Document all the html elements we create / modify + attributes
      // it'll get out of hand eventually even though it's whatever now
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

  // stats

  function resetStats() {
    const urlParams = new URLSearchParams(window.location.search);
    const currentQuery = urlParams.get('q');

    if (currentQuery !== extension.lastQuery) {
      extension.lastQuery = currentQuery;
      safetyCounter = 0;

      // Reset current page stats, called each load
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

  function updateStats(type, count = 1) {
    currentStats[type] += count;

    // if you remove this if statement we'll have inflated value since it'll increment
    if (
      type !== 'totalElementsRemoved' &&
      type !== 'scanCount' &&
      type !== 'placeholdersCreated'
    ) {
      currentStats.totalElementsRemoved += count;
    }

    currentStats.lastScanTime = Date.now();

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ cleanSearchStats: currentStats });
    }
  }

  // Disable terms, if user has that setting enabled when they search certain terms such as queries containing "AI", it will disable
  // slop slurp !

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

  // settings enforcement

  /*IMPORTANT IMPORTANT IMPORTANT
  this needs to be called after any settings change for one
  also needs to mirror the UI logic in popup.js, which is annoying as hell i'm ngl
  */
  function enforceSettingsRules(settings, oldSettings = {}) {
    const result = { ...settings };

    // if minimalist no link if link no minimalist. they're exclusive.
    if (result.minimalistMode && result.linksOnlyMode) {
      // If both are being enabled go with whichever is newly enabled
      if (result.minimalistMode && !oldSettings.minimalistMode) {
        result.linksOnlyMode = false;
      } else if (result.linksOnlyMode && !oldSettings.linksOnlyMode) {
        result.minimalistMode = false;
      }
    }

    // ensure the minimalist mode reqs are true
    if (result.minimalistMode) {
      result.removeAiOverview = true;
      result.removeLowQualitySites = false;
      result.removeAds = false;
      result.showReplacementPlaceholders = false;
    }

    // Enforce links-only mode dependencies
    if (result.linksOnlyMode) {
      result.showReplacementPlaceholders = false;
    }

    return result;
  }

  // MODE INIT!!

  function initMinimalistMode() {
    Logger?.info('Starting minimalist mode');

    if (e) {
      e.disconnect();
    }
    if (extension.comprehensiveObserver) {
      extension.comprehensiveObserver.disconnect();
    }

    e = new MutationObserver(() => {
      const enabled = extension.extensionEnabled;
      if (NS.runMinimalistScan) {
        NS.runMinimalistScan(removeElement, isDangerousContainer, {
          enabled,
          hideAiModeButton: filterSettings.hideAiModeButton,
          customWhitelist: filterSettings.customWhitelist
        });
      }
    });

    e.observe(document, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      const enabled = extension.extensionEnabled;
      e.takeRecords();
      if (NS.runMinimalistScan) {
        NS.runMinimalistScan(removeElement, isDangerousContainer, {
          enabled,
          hideAiModeButton: filterSettings.hideAiModeButton,
          customWhitelist: filterSettings.customWhitelist
        });
      }
    }, 100);
  }

  function initComprehensiveMode() {
    Logger?.info('Starting comprehensive mode');

    if (e) {
      e.disconnect();
    }
    if (extension.comprehensiveObserver) {
      extension.comprehensiveObserver.disconnect();
    }
    // arbitrary ass numbers play around with it.
    let scanTimeout = null;
    let lastScanTime = 0;
    const SCAN_DEBOUNCE_MS = NS.config?.CONFIG?.scanDebounceMs || 500;
    const MIN_SCAN_INTERVAL_MS = NS.config?.CONFIG?.minScanIntervalMs || 1000;

    const scanWrapper = () => {
      if (!extension.extensionEnabled || filterSettings.minimalistMode) {
        return;
      }

      // Clear any pending scan, would just be annoying with logs otherwise, perchance a lil memory sucker??
      if (scanTimeout) {
        clearTimeout(scanTimeout);
      }

      // Debounce, performance is so much better with it
      scanTimeout = setTimeout(() => {
        const now = Date.now();
        const timeSinceLastScan = now - lastScanTime;

        // Throttle or else it goes crazy
        if (timeSinceLastScan < MIN_SCAN_INTERVAL_MS) {
          return;
        }

        lastScanTime = now;
        safetyCounter = 0;

        if (NS.scanForContent) {
          const enabled = extension.extensionEnabled;
          NS.scanForContent(
            removeElement,
            isDangerousContainer,
            { ...filterSettings, enabled },
            currentStats
          );
        }
      }, SCAN_DEBOUNCE_MS);
    };

    extension.comprehensiveObserver = new MutationObserver(scanWrapper);

    extension.comprehensiveObserver.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });

    // Initial scans and whatnot
    safetyCounter = 0;
    if (NS.scanForContent) {
      const enabled = extension.extensionEnabled;
      NS.scanForContent(
        removeElement,
        isDangerousContainer,
        { ...filterSettings, enabled },
        currentStats
      );
    }

    setTimeout(() => {
      const enabled = extension.extensionEnabled;
      if (filterSettings.hideAiModeButton && NS.hideAiModeInTopbar) {
        NS.hideAiModeInTopbar(
          extension.extensionEnabled,
          filterSettings.hideAiModeButton
        );
      }
      safetyCounter = 0;
      if (NS.scanForContent) {
        NS.scanForContent(
          removeElement,
          isDangerousContainer,
          { ...filterSettings, enabled },
          currentStats
        );
      }
    }, 500);

    setTimeout(() => {
      const enabled = extension.extensionEnabled;
      safetyCounter = 0;
      if (NS.scanForContent) {
        NS.scanForContent(
          removeElement,
          isDangerousContainer,
          { ...filterSettings, enabled },
          currentStats
        );
      }
    }, 2000);
  }

  // INIT

  function initialize() {
    try {
      if (extension.loggingEnabled) {
        Logger?.info('Filter data loaded', getFilterData());
      }

      resetStats();

      // Export updateStats to namespace for use by other modules
      NS.updateStats = updateStats;

      const applySettings = () => {
        // If user enabled auto-disable terms and the query matches, show banner and bail
        if (filterSettings.disableTermsEnabled && shouldAutoDisable()) {
          extension.extensionEnabled = false;
          if (NS.showAutoDisableBanner) {
            NS.showAutoDisableBanner(() => {
              extension.extensionEnabled = true;
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
        if (NS.handlePlaceholderSettingChange) {
          NS.handlePlaceholderSettingChange(
            extension.extensionEnabled && !!filterSettings.showReplacementPlaceholders,
            filterSettings
          );
        }

        if (!extension.extensionEnabled) {
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
          [
            'cleanSearchEnabled',
            'filterSettings',
            'extension.loggingEnabled',
            'cleanSearchStats'
          ],
          result => {
            // Default to enabled
            // in the context of the code repo i often use cleanSearch as a technical term for the changes we make
            // saying slopslurp in variable names just feels wrong for whatever reason
            extension.extensionEnabled =
              result.cleanSearchEnabled !== false && extension.extensionEnabled;

            // Initialize storage on first run
            if (result.cleanSearchEnabled === undefined) {
              chrome.storage.local.set({ cleanSearchEnabled: true });
            }

            if (result.filterSettings) {
              filterSettings = {
                ...filterSettings,
                ...result.filterSettings
              };
              // Enforce rules after loading from storage
              // enforce rules after eating
              // sleeping
              // breathing.
              // enforce rules whenever changes are made to the settings.
              filterSettings = enforceSettingsRules(filterSettings);
            }

            if (typeof result.extension.loggingEnabled !== 'undefined') {
              extension.loggingEnabled = !!result.extension.loggingEnabled;
              if (Logger && typeof Logger.setEnabled === 'function') {
                Logger.setEnabled(extension.loggingEnabled);
              }
            }

            if (result.cleanSearchStats) {
              currentStats = { ...currentStats, ...result.cleanSearchStats };
            }

            applySettings();
            // don't have to do it when applying though!
          }
        );
      } else {
        applySettings();
      }

      Logger?.info('SlopSlurp initialized', {
        url: window.location.href,
        mode: filterSettings.minimalistMode ? 'minimalist' : 'comprehensive',
        enabled: extension.extensionEnabled
      });

      // Debug API you don't have to worry about this stuff
      //if you wan't, it should be pretty helpful in console though
      window.cleanSearchDebug = {
        scan: () => {
          safetyCounter = 0;
          if (filterSettings.minimalistMode && NS.runMinimalistScan) {
            const enabled = extension.extensionEnabled;
            NS.runMinimalistScan(removeElement, isDangerousContainer, {
              enabled,
              hideAiModeButton: filterSettings.hideAiModeButton,
              customWhitelist: filterSettings.customWhitelist
            });
          } else if (NS.scanForContent) {
            const enabled = extension.extensionEnabled;
            NS.scanForContent(
              removeElement,
              isDangerousContainer, // dangerous containers are just for safety, don't want to gut a whole dom accidentally
              { ...filterSettings, enabled },
              currentStats
            );
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
          extension.extensionEnabled = enabled;
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
            if (e) {
              e.disconnect();
            }
            if (extension.comprehensiveObserver) {
              extension.comprehensiveObserver.disconnect();
            }
          }
        },
        /*
        IMPORTANT IMPORTANT
        Any changes you make here should be mirrored in ../popup/popup.js, 
        it's annoying to keep track of so i'll detail it hear, update as you update:
        Link-only disables minimalist mode and disables + locks show placeholders
        Minamlist mode disables link-only, and disables + locks sponsored search removal, and low quality cite removal
        If something is not locked, it means clicking it will disable the other mode which it's incompatible with
        i.e if user is on minimalist mode and clicks link-only, minimalist mode turns off, link only turns on.
        tried to centralize it in the enforceSetting rules, but just be careful particularly with minimalist mode and link
        */
        updateSettings: newSettings => {
          const oldSettings = { ...filterSettings };

          // Merge new settings with existing
          filterSettings = { ...filterSettings, ...newSettings };

          // Enforce all mode rules and dependencies
          filterSettings = enforceSettingsRules(filterSettings, oldSettings);

          if (
            newSettings &&
            typeof newSettings.extension.loggingEnabled !== 'undefined'
          ) {
            extension.loggingEnabled = !!newSettings.extension.loggingEnabled;
            if (Logger && typeof Logger.setEnabled === 'function') {
              Logger.setEnabled(extension.loggingEnabled);
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

          // Handle mode transitions
          const oldMinimalistMode = oldSettings.minimalistMode;
          const oldLinksOnlyMode = oldSettings.linksOnlyMode;

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
        isEnabled: () => extension.extensionEnabled,
        getMode: () =>
          filterSettings.minimalistMode ? 'minimalist' : 'comprehensive',
        setLogging: enabled => {
          const loggingEnabled = extension.loggingEnabled;
          extension.loggingEnabled = !!enabled;
          if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ loggingEnabled: loggingEnabled });
          }
          if (Logger && typeof Logger.setEnabled === 'function') {
            Logger.setEnabled(extension.loggingEnabled);
          }
          if (extension.loggingEnabled) {
            Logger?.info('Logging enabled');
          } else {
            console.log('[SlopSlurp] Logging disabled');
          }
        },
        getLogging: () => extension.loggingEnabled,
        switchMode: () => {
          filterSettings.minimalistMode = !filterSettings.minimalistMode;
          window.cleanSearchDebug.updateSettings(filterSettings);
          return filterSettings.minimalistMode ? 'minimalist' : 'comprehensive';
        },
        runDiagnostics: () => {
          Logger?.info('Running diagnostics...');
          const wasEnabled = extension.loggingEnabled;
          extension.loggingEnabled = true;
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

          extension.loggingEnabled = wasEnabled;
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
