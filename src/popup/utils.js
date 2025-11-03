// SLURPSLOP Extension Utilities
/* eslint-disable no-unused-vars */

// Settings management
const Settings = {
  defaults: {
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
  },

  async load() {
    try {
      const result = await chrome.storage.local.get(['filterSettings']);
      return { ...this.defaults, ...result.filterSettings };
    } catch (error) {
      console.error('Failed to load settings:', error);
      return this.defaults;
    }
  },

  async save(settings) {
    try {
      await chrome.storage.local.set({ filterSettings: settings });
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  }
};

// Centralized popup-side rules enforcement to mirror content rules
/* make sure you change these as you change rules inside of content*/
function enforceSettingsRules(settings, oldSettings = {}) {
  const result = { ...Settings.defaults, ...settings };

  if (result.minimalistMode && result.linksOnlyMode) {
    if (result.minimalistMode && !oldSettings.minimalistMode) {
      result.linksOnlyMode = false;
    } else if (result.linksOnlyMode && !oldSettings.linksOnlyMode) {
      result.minimalistMode = false;
    } else {
      result.linksOnlyMode = false;
    }
  }

  if (result.aggressiveMode && result.minimalistMode) {
    if (result.aggressiveMode && !oldSettings.aggressiveMode) {
      result.minimalistMode = false;
    } else if (result.minimalistMode && !oldSettings.minimalistMode) {
      result.aggressiveMode = false;
    } else {
      result.minimalistMode = false;
    }
  }

  if (result.minimalistMode) {
    result.removeAiOverview = true;
    result.removeLowQualitySites = false;
    result.removeAds = false;
    result.showReplacementPlaceholders = false;
  }

  if (result.aggressiveMode) {
    result.showReplacementPlaceholders = false;
  }

  if (result.linksOnlyMode) {
    result.showReplacementPlaceholders = false;
  }

  return result;
}

// Statistics management
const Stats = {
  defaults: {
    aiElementsRemoved: 0,
    lowQualitySitesRemoved: 0,
    adsRemoved: 0,
    currentPageRemoved: 0,
    scanCount: 0,
    lastScanTime: 0,
    placeholdersCreated: 0,
    dailyRemoved: 0,
    date: new Date().toISOString().split('T')[0],
    pageSignature: ''
  },

  async load() {
    try {
      const result = await chrome.storage.local.get(['cleanSearchStats']);
      const merged = { ...this.defaults, ...result.cleanSearchStats };
      if (
        typeof merged.currentPageRemoved !== 'number' &&
        typeof merged.totalElementsRemoved === 'number'
      ) {
        merged.currentPageRemoved = merged.totalElementsRemoved;
      }
      delete merged.totalElementsRemoved;
      return merged;
    } catch (error) {
      console.error('Failed to load stats:', error);
      return this.defaults;
    }
  },

  async save(stats) {
    try {
      await chrome.storage.local.set({ cleanSearchStats: stats });
      return true;
    } catch (error) {
      console.error('Failed to save stats:', error);
      return false;
    }
  },

  async reset() {
    const resetStats = { ...this.defaults, lastScanTime: Date.now() };
    await this.save(resetStats);
    return resetStats;
  }
};

// UI utilities
const UI = {
  showNotification(element, message, type = 'active', duration = 2000) {
    const originalClass = element.className;
    const originalText = element.textContent;

    element.className = `status ${type}`;
    element.textContent = message;

    setTimeout(() => {
      element.className = originalClass;
      element.textContent = originalText;
    }, duration);
  },

  formatTimeAgo(timestamp) {
    if (!timestamp) {
      return 'Never';
    }

    const now = new Date();
    const time = new Date(timestamp);
    const diffMinutes = Math.floor((now - time) / 60000);

    if (diffMinutes < 1) {
      return 'Just now';
    }
    if (diffMinutes < 60) {
      return `${diffMinutes} minutes ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours} hours ago`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  }
};

// Content script communication
const ContentScript = {
  async execute(tabId, func, args = []) {
    try {
      const result = await chrome.scripting.executeScript({
        target: { tabId },
        function: func,
        args
      });
      return result[0].result;
    } catch (error) {
      console.error('Content script execution failed:', error);
      return null;
    }
  },

  async getCurrentTabId() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0].id;
  },

  // TODO: Ensure we use this to not scan on webpages
  async isGoogleSearchTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tabs[0].url;
    return (
      url &&
      (url.includes('google.com/search') ||
        url.includes('google.co.uk/search') ||
        /google\.[a-z]{2,3}\/search/.test(url))
    );
  }
};
