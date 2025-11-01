/* eslint-disable no-unused-vars */
/* eslint-disable prefer-const */
// disable prefer-const, all the settings in here aren't changed in this file, but are in the namespace
// SLURPSLOP Initialization & Main Entry Point
// This is the final module that orchestrates everything and sets up the extension
(() => {
  'use strict';

  const NS = (window.SlurpSlop = window.SlurpSlop || {});
  const { Logger, getFilterData } = NS.utils;
  const { enforceSettingsRules: enforceSettingsRulesCore } = NS.settings;
  const SEL = NS.selectors;

  // State variables
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
      minimalistMode: false,
      linksOnlyMode: false,
      aggressiveMode: false,
      hideAiModeButton: true,
      showReplacementPlaceholders: false,
      disableTermsEnabled: false,
      customWhitelist: []
    }
  };

  let filterSettings = {
    removeAiOverview: true,
    removeLowQualitySites: true,
    removeAds: true,
    minimalistMode: false,
    linksOnlyMode: false,
    aggressiveMode: false,
    hideAiModeButton: true,
    showReplacementPlaceholders: false,
    disableTermsEnabled: false,
    customWhitelist: []
  };

  let storageListenerRegistered = false;

  // Safety mechanism
  let safetyCounter = 0;
  const MAX_REMOVALS_PER_SCAN = NS.config.CONFIG.maxRemovalsPerScan;

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

    if (SEL.PROTECTED.ids.includes(id) || SEL.PROTECTED.roles.includes(role)) {
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
      const matchSel = SEL.PROTECTED.matchSelectors.join(', ');
      if (
        (matchSel && el.matches(matchSel)) ||
        el.closest('#center_col') === el
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
      element.hasAttribute('data-slurpslop-placeholder') ||
      element.hasAttribute('data-slurpslop-wrapper') ||
      element.hasAttribute('data-slurpslop-removed') ||
      // If a parent was already removed, skip to avoid double placeholders
      (element.closest && element.closest('[data-slurpslop-removed]')) ||
      // If element already has a placeholder as its next sibling, it was already processed
      (element.nextElementSibling &&
        element.nextElementSibling.hasAttribute &&
        element.nextElementSibling.hasAttribute('data-slurpslop-container')) ||
      safetyCounter >= MAX_REMOVALS_PER_SCAN
    ) {
      return;
    }

    if (isDangerousContainer(element)) {
      // warn for this one of course
      Logger?.warn('Refusing to remove dangerous container', { type, element });
      return;
    }

    safetyCounter++;

    try {
      if (!element.hasAttribute('data-slurpslop-original-display')) {
        let originalDisplay = '';
        try {
          originalDisplay = window.getComputedStyle(element).display || '';
        } catch {
          originalDisplay = '';
        }
        element.setAttribute(
          'data-slurpslop-original-display',
          originalDisplay
        );
      }
      element.setAttribute('data-slurpslop-type', type);
      element.setAttribute('data-slurpslop-removed', 'true');
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
        extension.filterSettings.showReplacementPlaceholders &&
        NS.createRemovalPlaceholder
      ) {
        NS.createRemovalPlaceholder(element, type, extension.filterSettings);
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
      extension.currentStats = {
        aiElementsRemoved: 0,
        lowQualitySitesRemoved: 0,
        adsRemoved: 0,
        totalElementsRemoved: 0,
        scanCount: 0,
        lastScanTime: Date.now(),
        placeholdersCreated: 0
      };

      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ cleanSearchStats: extension.currentStats });
      }
    }
  }

  function updateStats(type, count = 1) {
    extension.currentStats[type] += count;

    // if you remove this if statement we'll have inflated value since it'll increment
    if (
      type !== 'totalElementsRemoved' &&
      type !== 'scanCount' &&
      type !== 'placeholdersCreated'
    ) {
      extension.currentStats.totalElementsRemoved += count;
    }

    extension.currentStats.lastScanTime = Date.now();

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ cleanSearchStats: extension.currentStats });
    }
  }

  // Disable terms, if user has that setting enabled when they search certain terms such as queries containing "AI", it will disable
  // slurp slop !

  function shouldAutoDisable() {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    if (!query) {
      return false;
    }

    let lowerQuery = query.toLowerCase();
    const filterData = getFilterData();
    // ensure proper spacing
    // 'maim' shouldn't disable 'm ai m' should
    return lowerQuery
      .split(' ')
      .some(term => filterData.disableTerms.includes(term));
  }

  // MODE INIT!!

  function initMinimalistMode() {
    Logger?.info('Starting minimalist mode');

    if (extension.minimalistObserver) {
      extension.minimalistObserver.disconnect();
    }
    if (extension.comprehensiveObserver) {
      extension.comprehensiveObserver.disconnect();
    }

    extension.minimalistObserver = new MutationObserver(() => {
      const enabled = extension.extensionEnabled;
      if (NS.runMinimalistScan) {
        NS.runMinimalistScan(removeElement, isDangerousContainer, {
          extensionEnabled: enabled, // FIX: Pass as extensionEnabled
          hideAiModeButton: extension.filterSettings.hideAiModeButton,
          customWhitelist: extension.filterSettings.customWhitelist
        });
      }
    });

    extension.minimalistObserver.observe(document, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      const enabled = extension.extensionEnabled;
      // FIX: Changed from 'e' to 'extension.minimalistObserver'
      extension.minimalistObserver.takeRecords();
      if (NS.runMinimalistScan) {
        NS.runMinimalistScan(removeElement, isDangerousContainer, {
          extensionEnabled: enabled, // FIX: Pass as extensionEnabled
          hideAiModeButton: extension.filterSettings.hideAiModeButton,
          customWhitelist: extension.filterSettings.customWhitelist
        });
      }
    }, 100);
  }

  function initComprehensiveMode() {
    Logger?.info('Starting comprehensive mode');

    if (extension.minimalistObserver) {
      extension.minimalistObserver.disconnect();
    }
    if (extension.comprehensiveObserver) {
      extension.comprehensiveObserver.disconnect();
    }
    // arbitrary ass numbers play around with it.
    let scanTimeout = null;
    let lastScanTime = 0;
    const SCAN_DEBOUNCE_MS = NS.config.CONFIG.scanDebounceMs;
    const MIN_SCAN_INTERVAL_MS = NS.config.CONFIG.minScanIntervalMs;

    const scanWrapper = () => {
      if (
        !extension.extensionEnabled ||
        extension.filterSettings.minimalistMode
      ) {
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
          NS.scanForContent(
            removeElement,
            isDangerousContainer,
            {
              ...extension.filterSettings,
              extensionEnabled: extension.extensionEnabled
            },
            extension.currentStats
          );
        }
      }, SCAN_DEBOUNCE_MS);
    };

    extension.comprehensiveObserver = new MutationObserver(scanWrapper);

    extension.comprehensiveObserver.observe(
      document.body || document.documentElement,
      {
        childList: true,
        subtree: true
      }
    );

    // Initial scans and whatnot
    safetyCounter = 0;
    if (NS.scanForContent) {
      NS.scanForContent(
        removeElement,
        isDangerousContainer,
        {
          ...extension.filterSettings,
          extensionEnabled: extension.extensionEnabled
        },
        extension.currentStats
      );
    }

    setTimeout(() => {
      const enabled = extension.extensionEnabled;
      if (extension.filterSettings.hideAiModeButton && NS.hideAiModeInTopbar) {
        NS.hideAiModeInTopbar(
          extension.extensionEnabled,
          extension.filterSettings.hideAiModeButton
        );
      }
      safetyCounter = 0;
      if (NS.scanForContent) {
        NS.scanForContent(
          removeElement,
          isDangerousContainer,
          {
            ...extension.filterSettings,
            extensionEnabled: extension.extensionEnabled
          },
          extension.currentStats
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
          {
            ...extension.filterSettings,
            extensionEnabled: extension.extensionEnabled
          },
          extension.currentStats
        );
      }
    }, 2000);
  }

  function applySettings() {
    // If user enabled auto-disable terms and the query matches, show banner and bail
    if (extension.filterSettings.disableTermsEnabled && shouldAutoDisable()) {
      extension.extensionEnabled = false;
      if (NS.showAutoDisableBanner) {
        NS.showAutoDisableBanner(() => {
          extension.extensionEnabled = true;
          if (NS.showNotification) {
            NS.showNotification('SlurpSlop re-enabled', 'success');
          }
          setTimeout(() => {
            if (extension.filterSettings.minimalistMode) {
              initMinimalistMode();
            } else {
              initComprehensiveMode();
            }
          }, 100);
        });
      }
      Logger?.info('Extension auto-disabled due to query content');
      if (NS.setAggressiveRemovalEnabled) {
        NS.setAggressiveRemovalEnabled(false);
      }
      return;
    }

    if (NS.handlePlaceholderSettingChange) {
      NS.handlePlaceholderSettingChange(
        extension.extensionEnabled &&
          !!extension.filterSettings.showReplacementPlaceholders,
        extension.filterSettings
      );
    }

    if (NS.setAggressiveRemovalEnabled) {
      NS.setAggressiveRemovalEnabled(
        extension.extensionEnabled && !!extension.filterSettings.aggressiveMode
      );
    }

    if (!extension.extensionEnabled) {
      return;
    }

    if (extension.filterSettings.minimalistMode) {
      initMinimalistMode();
    } else {
      initComprehensiveMode();
    }
  }

  function registerStorageListener() {
    if (
      storageListenerRegistered ||
      typeof chrome === 'undefined' ||
      !chrome.storage ||
      !chrome.storage.onChanged
    ) {
      return;
    }

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') {
        return;
      }

      let shouldReapply = false;

      if (Object.prototype.hasOwnProperty.call(changes, 'cleanSearchEnabled')) {
        extension.extensionEnabled = changes.cleanSearchEnabled.newValue !== false;
        shouldReapply = true;
      }

      if (Object.prototype.hasOwnProperty.call(changes, 'filterSettings')) {
        const nextSettings = changes.filterSettings.newValue || {};
        const merged = {
          ...extension.filterSettings,
          ...nextSettings
        };
        extension.filterSettings = enforceSettingsRulesCore(
          merged,
          extension.filterSettings
        );
        shouldReapply = true;
      }

      if (shouldReapply) {
        applySettings();
      }

      if (Object.prototype.hasOwnProperty.call(changes, 'loggingEnabled')) {
        extension.loggingEnabled = !!changes.loggingEnabled.newValue;
        if (Logger && typeof Logger.setEnabled === 'function') {
          Logger.setEnabled(extension.loggingEnabled);
        }
      }
    });

    storageListenerRegistered = true;
  }

  // INIT

  async function initialize() {
    if (typeof getFilterData === 'function') {
      await getFilterData();
    } else {
      Logger?.warn('getFilterData() not available at initialize time');
    }
    Logger?.info('Init check', {
      extensionEnabled: extension.extensionEnabled,
      filterSettings: extension.filterSettings,
      getFilterDataType: typeof getFilterData,
      utilsPresent: !!NS.utils
    });
    try {
      if (extension.loggingEnabled) {
        Logger?.info('Filter data loaded', getFilterData());
      }

      resetStats();

      // Export updateStats to namespace for use by other modules
      NS.updateStats = updateStats;
      NS.removeElement = removeElement;

      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(
          [
            'cleanSearchEnabled',
            'filterSettings',
            'loggingEnabled',
            'cleanSearchStats'
          ],
          result => {
            // Default to enabled
            // in the context of the code repo i often use cleanSearch as a technical term for the changes we make
            // saying SLURP SLOP (IT IS SLURP SLOP, NOT SLOP SLURP) in variable names just feels wrong for whatever reason
            // BUT IT IS NONTHELESS RIGHT.

            // Initialize storage on first run
            if (result.cleanSearchEnabled === undefined) {
              extension.extensionEnabled = true;
              chrome.storage.local.set({ cleanSearchEnabled: true });
              Logger?.info('Set cleanSearchEnabled to true (was undefined)');
            } else {
              extension.extensionEnabled = result.cleanSearchEnabled;
              Logger?.info(
                'Loaded cleanSearchEnabled from storage:',
                result.cleanSearchEnabled
              );
            }

            if (result.filterSettings) {
              extension.filterSettings = {
                ...extension.filterSettings,
                ...result.filterSettings
              };
              // Enforce rules after loading from storage
              extension.filterSettings = enforceSettingsRulesCore(
                extension.filterSettings
              );
            }

            if (typeof result.loggingEnabled !== 'undefined') {
              extension.loggingEnabled = !!result.loggingEnabled;
              if (Logger && typeof Logger.setEnabled === 'function') {
                Logger.setEnabled(extension.loggingEnabled);
              }
            }

            if (result.cleanSearchStats) {
              extension.currentStats = {
                ...extension.currentStats,
                ...result.cleanSearchStats
              };
            }

            // Call applySettings() AFTER storage is loaded
            applySettings();
            registerStorageListener();
          }
        );
      } else {
        applySettings();
      }

      Logger?.info('SlurpSlop initialized', {
        url: window.location.href,
        mode: extension.filterSettings.minimalistMode
          ? 'minimalist'
          : 'comprehensive',
        enabled: extension.extensionEnabled
      });
    } catch (error) {
      Logger?.error('Failed to initialize SlurpSlop', error);
    }
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();
