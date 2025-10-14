// Copied canonical popup script into src/ for refactor
// SlopSlurp Extension Popup (source)
// Handles user interface interactions and extension state management

document.addEventListener('DOMContentLoaded', function() {
  // UI Elements
  const statusDiv = document.getElementById('status');
  const extensionToggle = document.getElementById('extensionToggle');
  const aiToggle = document.getElementById('aiToggle');
  const lowQualityToggle = document.getElementById('lowQualityToggle');
  const adsToggle = document.getElementById('adsToggle');
  const academicToggle = document.getElementById('academicToggle');
  const placeholdersToggle = document.getElementById('placeholdersToggle');
  const minimalistToggle = document.getElementById('minimalistToggle');
  const hideAiModeToggle = document.getElementById('hideAiModeToggle');
  const scanNowBtn = document.getElementById('scanNow');
  const addToWhitelistBtn = document.getElementById('addToWhitelist');
  const clearWhitelistBtn = document.getElementById('clearWhitelist');
  const whitelistDisplay = document.getElementById('whitelistDisplay');
  const reportIssueBtn = document.getElementById('reportIssue');
  const viewSourceBtn = document.getElementById('viewSource');
  const showHelpBtn = document.getElementById('showHelp');
  const toggleLoggingBtn = document.getElementById('toggleLogging');

  // Logging state for popup UI
  let loggingEnabled = false;

  // Stat elements - simplified
  const totalRemovedCount = document.getElementById('totalRemovedCount');
  const aiRemovedCount = document.getElementById('aiRemovedCount');
  const lowQualityRemovedCount = document.getElementById(
    'lowQualityRemovedCount'
  );
  const adsRemovedCount = document.getElementById('adsRemovedCount');
  const pagesProcessedCount = document.getElementById('pagesProcessedCount');
  const lastActivity = document.getElementById('lastActivity');

  let currentStats = {
    aiElementsRemoved: 0,
    lowQualitySitesRemoved: 0,
    adsRemoved: 0,
    totalElementsRemoved: 0,
    scanCount: 0,
    lastScanTime: 0,
    placeholdersCreated: 0
  };

  let filterSettings = {
    removeAiOverview: true,
    removeLowQualitySites: true,
    removeAds: true,
    academicMode: false,
    minimalistMode: false,
    showReplacementPlaceholders: false,
    customWhitelist: []
  };

  // Keep previous toggle states to restore when leaving Minimalist Mode
  const _prevToggleState = {
    aiToggle: null,
    lowQualityToggle: null,
    adsToggle: null,
    placeholdersToggle: null
  };

  // Save filter settings function
  function saveFilterSettings() {
    const filterData = { filterSettings };
    chrome.storage.local.set(filterData);

    // Broadcast to all tabs
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: updateFilterSettings,
        args: [filterSettings]
      });
    });
  }

  // Whitelist management functions
  function updateWhitelistDisplay() {
    const whitelist = filterSettings.customWhitelist || [];

    if (whitelist.length === 0) {
      whitelistDisplay.innerHTML = 'No whitelisted sites';
      whitelistDisplay.className = 'whitelist-display empty';
    } else {
      whitelistDisplay.className = 'whitelist-display';
      whitelistDisplay.innerHTML = whitelist
        .map(
          site =>
            `<span class="whitelist-site" data-site="${site}">${site}</span>`
        )
        .join('');

      // Add click handlers to remove sites
      whitelistDisplay.querySelectorAll('.whitelist-site').forEach(siteEl => {
        siteEl.addEventListener('click', () => {
          const site = siteEl.getAttribute('data-site');
          removeFromWhitelist(site);
        });
      });
    }
  }

  function addToWhitelist(domain) {
    if (!domain || domain.trim() === '') {
      return;
    }

    const cleanDomain = domain.trim().toLowerCase();
    if (!filterSettings.customWhitelist) {
      filterSettings.customWhitelist = [];
    }

    if (!filterSettings.customWhitelist.includes(cleanDomain)) {
      filterSettings.customWhitelist.push(cleanDomain);
      saveFilterSettings();
      updateWhitelistDisplay();

      // Clear the input field after adding
      const whitelistInput = document.getElementById('whitelistInput');
      if (whitelistInput) {
        whitelistInput.value = '';
      }

      statusDiv.className = 'status active';
      statusDiv.textContent = `Added ${cleanDomain} to whitelist`;
      setTimeout(() => updateStatus(extensionToggle.checked), 2000);
    }
  }

  function removeFromWhitelist(domain) {
    if (!filterSettings.customWhitelist) {
      return;
    }

    const index = filterSettings.customWhitelist.indexOf(domain);
    if (index > -1) {
      filterSettings.customWhitelist.splice(index, 1);
      saveFilterSettings();
      updateWhitelistDisplay();

      statusDiv.className = 'status active';
      statusDiv.textContent = `Removed ${domain} from whitelist`;
      setTimeout(() => updateStatus(extensionToggle.checked), 2000);
    }
  }

  function clearWhitelist() {
    if (confirm('Remove all whitelisted sites? This cannot be undone.')) {
      filterSettings.customWhitelist = [];
      saveFilterSettings();
      updateWhitelistDisplay();

      statusDiv.className = 'status active';
      statusDiv.textContent = 'Whitelist cleared';
      setTimeout(() => updateStatus(extensionToggle.checked), 2000);
    }
  }

  // Simplified stats loading
  function loadStats() {
    // Get current page stats from storage
    chrome.storage.local.get(['cleanSearchStats'], result => {
      if (result.cleanSearchStats) {
        currentStats = { ...currentStats, ...result.cleanSearchStats };
      }

      // Try to get real-time stats from active tab's content script
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (
          tabs[0] &&
          tabs[0].url &&
          tabs[0].url.includes('google.com/search')
        ) {
          try {
            chrome.scripting.executeScript(
              {
                target: { tabId: tabs[0].id },
                function: getStats
              },
              result => {
                if (chrome.runtime.lastError) {
                  console.log(
                    'Could not access content script:',
                    chrome.runtime.lastError.message
                  );
                  updateStatsDisplay();
                } else if (result && result[0] && result[0].result) {
                  // Use current page stats directly
                  currentStats = { ...currentStats, ...result[0].result };
                  updateStatsDisplay();
                } else {
                  updateStatsDisplay();
                }
              }
            );
          } catch (error) {
            console.log('Error accessing content script:', error);
            updateStatsDisplay();
          }
        } else {
          updateStatsDisplay();
        }
      });
    });
  }

  function updateStatsDisplay() {
    if (totalRemovedCount) {
      totalRemovedCount.textContent = currentStats.totalElementsRemoved || 0;
    }
    if (aiRemovedCount) {
      aiRemovedCount.textContent = currentStats.aiElementsRemoved || 0;
    }
    if (lowQualityRemovedCount) {
      lowQualityRemovedCount.textContent =
        currentStats.lowQualitySitesRemoved || 0;
    }
    if (adsRemovedCount) {
      adsRemovedCount.textContent = currentStats.adsRemoved || 0;
    }
    if (pagesProcessedCount) {
      pagesProcessedCount.textContent = currentStats.pagesProcessed || 0;
    }

    // Update last activity
    if (lastActivity && currentStats.lastScanTime) {
      const lastTime = new Date(currentStats.lastScanTime);
      const now = new Date();
      const diffMinutes = Math.floor((now - lastTime) / 60000);

      if (diffMinutes < 1) {
        lastActivity.textContent = 'Last activity: Just now';
      } else if (diffMinutes < 60) {
        lastActivity.textContent = `Last activity: ${diffMinutes} minutes ago`;
      } else {
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) {
          lastActivity.textContent = `Last activity: ${diffHours} hours ago`;
        } else {
          const diffDays = Math.floor(diffHours / 24);
          lastActivity.textContent = `Last activity: ${diffDays} days ago`;
        }
      }
    } else if (lastActivity) {
      lastActivity.textContent = 'Last activity: Never';
    }
  }

  // Initialize popup
  function init() {
    try {
      console.log('SlopSlurp popup initializing...');
      loadSettings();
      loadStats();
      checkCurrentPage();
      setupEventListeners();
      console.log('SlopSlurp popup initialized successfully');
    } catch (error) {
      console.error('Error initializing popup:', error);
      if (statusDiv) {
        statusDiv.className = 'status disabled';
        statusDiv.textContent = 'Initialization Error';
      }
    }
  }

  function loadSettings() {
    chrome.storage.local.get(['cleanSearchEnabled', 'filterSettings', 'loggingEnabled'], result => {
      const enabled = result.cleanSearchEnabled !== false;
      extensionToggle.checked = enabled;

      if (result.filterSettings) {
        filterSettings = { ...filterSettings, ...result.filterSettings };
      }

      // Update individual toggles
      aiToggle.checked = filterSettings.removeAiOverview;
      lowQualityToggle.checked = filterSettings.removeLowQualitySites;
      adsToggle.checked = filterSettings.removeAds;
      academicToggle.checked = filterSettings.academicMode;
      minimalistToggle.checked = filterSettings.minimalistMode || false;
      hideAiModeToggle.checked = filterSettings.hideAiModeButton !== false; // Default to true if not set
      placeholdersToggle.checked =
        filterSettings.showReplacementPlaceholders || false;

      // Update whitelist display
      updateWhitelistDisplay();

      // AI filter control should be present and styled like the other filters

      // Load logging state and update UI
      loggingEnabled = !!result.loggingEnabled;
      updateLoggingButtonUI(loggingEnabled);

      // Broadcast current logging state to active tab so content script is in sync
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (!tabs[0]) {
          return;
        }
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: setLogging,
          args: [loggingEnabled]
        });
      });

      // If minimalist mode was stored as enabled, enforce UI state
      if (filterSettings.minimalistMode) {
        aiToggle.checked = true;
        lowQualityToggle.checked = false;
        adsToggle.checked = false;
        placeholdersToggle.checked = false;

        lowQualityToggle.disabled = true;
        adsToggle.disabled = true;
        placeholdersToggle.disabled = true;
      }

      updateStatus(enabled);
    });
  }

  function updateLoggingButtonUI(enabled) {
    if (!toggleLoggingBtn) {
      return;
    }
    toggleLoggingBtn.classList.toggle('enabled', enabled);
    toggleLoggingBtn.classList.toggle('disabled', !enabled);
    toggleLoggingBtn.textContent = enabled ? 'Logging Enabled' : 'Logging Disabled';
  }

  function updateStatus(enabled) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      const currentTab = tabs[0];
      const isGoogleSearch =
        currentTab.url &&
        (currentTab.url.includes('google.com/search') ||
          currentTab.url.includes('google.co.uk/search') ||
          /google\.[a-z]{2,3}\/search/.test(currentTab.url));

      if (!enabled) {
        statusDiv.className = 'status disabled';
        statusDiv.textContent = 'Extension Disabled';
        scanNowBtn.disabled = true;
      } else if (!isGoogleSearch) {
        statusDiv.className = 'status inactive';
        statusDiv.textContent = 'Navigate to Google Search';
        scanNowBtn.disabled = true;
      } else {
        statusDiv.className = 'status active';
        statusDiv.textContent = 'Extension Active & Monitoring';
        scanNowBtn.disabled = false;
      }
    });
  }

  function checkCurrentPage() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(_tabs) {
      updateStatus(extensionToggle.checked);
    });
  }

  function setupEventListeners() {
    // Master extension toggle
    extensionToggle.addEventListener('change', function() {
      const enabled = extensionToggle.checked;
      chrome.storage.local.set({ cleanSearchEnabled: enabled });
      updateStatus(enabled);

      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: updateExtensionState,
          args: [enabled]
        });
      });
    });

    // Individual filter toggles
    aiToggle.addEventListener('change', function() {
      filterSettings.removeAiOverview = aiToggle.checked;
      saveFilterSettings();
    });

    lowQualityToggle.addEventListener('change', function() {
      filterSettings.removeLowQualitySites = lowQualityToggle.checked;
      saveFilterSettings();
    });

    adsToggle.addEventListener('change', function() {
      filterSettings.removeAds = adsToggle.checked;
      saveFilterSettings();
    });

    academicToggle.addEventListener('change', function() {
      filterSettings.academicMode = academicToggle.checked;
      saveFilterSettings();
    });

    placeholdersToggle.addEventListener('change', function() {
      filterSettings.showReplacementPlaceholders = placeholdersToggle.checked;
      saveFilterSettings();

      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: show => {
            if (window.cleanSearchDebug) {
              window.cleanSearchDebug.showPlaceholders(show);
            }
          },
          args: [filterSettings.showReplacementPlaceholders]
        });
      });
    });

    minimalistToggle.addEventListener('change', function() {
      filterSettings.minimalistMode = minimalistToggle.checked;

      // If minimalist mode is enabled, remember previous states and disable other filters
      if (filterSettings.minimalistMode) {
        // save previous states
        _prevToggleState.aiToggle = aiToggle.checked;
        _prevToggleState.lowQualityToggle = lowQualityToggle.checked;
        _prevToggleState.adsToggle = adsToggle.checked;
        _prevToggleState.placeholdersToggle = placeholdersToggle.checked;

        // turn off dependant toggles
        filterSettings.removeAiOverview = true; // keep AI overview removal on
        filterSettings.removeLowQualitySites = false;
        filterSettings.removeAds = false;
        filterSettings.showReplacementPlaceholders = false;

        // update UI and disable them
        aiToggle.checked = filterSettings.removeAiOverview;
        lowQualityToggle.checked = false;
        adsToggle.checked = false;
        placeholdersToggle.checked = false;

        lowQualityToggle.disabled = true;
        adsToggle.disabled = true;
        placeholdersToggle.disabled = true;

        statusDiv.className = 'status active';
        statusDiv.textContent = 'Minimalist Mode: Lightweight AI Overview removal only';
        setTimeout(() => updateStatus(extensionToggle.checked), 3000);
      } else {
        // restore previous states
        filterSettings.removeAiOverview =
          _prevToggleState.aiToggle === null
            ? filterSettings.removeAiOverview
            : _prevToggleState.aiToggle;
        filterSettings.removeLowQualitySites =
          _prevToggleState.lowQualityToggle === null
            ? filterSettings.removeLowQualitySites
            : _prevToggleState.lowQualityToggle;
        filterSettings.removeAds =
          _prevToggleState.adsToggle === null
            ? filterSettings.removeAds
            : _prevToggleState.adsToggle;
        filterSettings.showReplacementPlaceholders =
          _prevToggleState.placeholdersToggle === null
            ? filterSettings.showReplacementPlaceholders
            : _prevToggleState.placeholdersToggle;

        // update UI and re-enable
        aiToggle.checked = !!filterSettings.removeAiOverview;
        lowQualityToggle.checked = !!filterSettings.removeLowQualitySites;
        adsToggle.checked = !!filterSettings.removeAds;
        placeholdersToggle.checked = !!filterSettings.showReplacementPlaceholders;

        lowQualityToggle.disabled = false;
        adsToggle.disabled = false;
        placeholdersToggle.disabled = false;

        statusDiv.className = 'status active';
        statusDiv.textContent = 'Minimalist Mode disabled';
        setTimeout(() => updateStatus(extensionToggle.checked), 1500);
      }

      saveFilterSettings();
    });

    // Logging toggle
    toggleLoggingBtn.addEventListener('click', function() {
      loggingEnabled = !loggingEnabled;
      chrome.storage.local.set({ loggingEnabled });

      updateLoggingButtonUI(loggingEnabled);

      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: setLogging,
          args: [loggingEnabled]
        });
      });
    });

    function saveFilterSettings() {
      chrome.storage.local.set({ filterSettings: filterSettings });

      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: updateFilterSettings,
          args: [filterSettings]
        });
      });
    }

    // Scan current page button
    scanNowBtn.addEventListener('click', function() {
      scanNowBtn.disabled = true;
      const originalText = scanNowBtn.textContent;
      scanNowBtn.textContent = 'Scanning Page...';

      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.scripting.executeScript(
          {
            target: { tabId: tabs[0].id },
            function: triggerScan
          },
          function(_results) {
            if (chrome.runtime.lastError) {
              console.error(
                'Script injection failed:',
                chrome.runtime.lastError
              );
              statusDiv.className = 'status inactive';
              statusDiv.textContent = 'Failed to scan page';
            } else {
              statusDiv.className = 'status active';
              statusDiv.textContent = 'Scan completed successfully';
              setTimeout(() => {
                loadStats();
                updateStatus(extensionToggle.checked);
              }, 1000);
            }

            scanNowBtn.disabled = false;
            scanNowBtn.textContent = originalText;
          }
        );
      });
    });

    // Whitelist input field and button event listeners
    const whitelistInput = document.getElementById('whitelistInput');
    
    addToWhitelistBtn.addEventListener('click', function() {
      const domain = whitelistInput.value;
      if (domain) {
        addToWhitelist(domain);
      }
    });
    
    // Also add domain when pressing Enter in the input field
    whitelistInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        const domain = whitelistInput.value;
        if (domain) {
          addToWhitelist(domain);
        }
      }
    });

    clearWhitelistBtn.addEventListener('click', function() {
      clearWhitelist();
    });

    // Reset stats button removed as requested

    // Report issue button -> open email
    reportIssueBtn.addEventListener('click', function() {
      chrome.tabs.create({ url: 'mailto:charliejsomons@gmail.com' });
    });

    // View source button -> open email
    viewSourceBtn.addEventListener('click', function() {
      chrome.tabs.create({ url: 'mailto:charliejsomons@gmail.com' });
    });

    // Show help -> open email
    showHelpBtn.addEventListener('click', function() {
      chrome.tabs.create({ url: 'mailto:charliejsomons@gmail.com' });
    });

    // Add event listener for AI Mode button toggle
    hideAiModeToggle.addEventListener('change', function() {
      filterSettings.hideAiModeButton = hideAiModeToggle.checked;
      saveFilterSettings();
    });
  }

  // Initialize the popup
  init();
});

// Functions to inject into the current page
function updateExtensionState(enabled) {
  if (window.cleanSearchDebug && window.cleanSearchDebug.setEnabled) {
    window.cleanSearchDebug.setEnabled(enabled);
    console.log(
      `SlopSlurp extension ${enabled ? 'enabled' : 'disabled'} via popup`
    );
  }
}

function updateFilterSettings(settings) {
  if (window.cleanSearchDebug && window.cleanSearchDebug.updateSettings) {
    window.cleanSearchDebug.updateSettings(settings);
    console.log('Filter settings updated via popup:', settings);
  }
}

function triggerScan() {
  if (window.cleanSearchDebug && window.cleanSearchDebug.scan) {
    window.cleanSearchDebug.scan();
    console.log('Manual scan triggered by extension popup');
    return true;
  } else {
    console.log('SlopSlurp not found on page');
    return false;
  }
}

function getStats() {
  if (window.cleanSearchDebug && window.cleanSearchDebug.getStats) {
    return window.cleanSearchDebug.getStats();
  }
  return null;
}
/*
function resetStats() {
  if (window.cleanSearchDebug && window.cleanSearchDebug.resetStats) {
    window.cleanSearchDebug.resetStats();
    console.log('Statistics reset via popup');
  }
}
  */

function setLogging(enabled) {
  if (window.cleanSearchDebug && window.cleanSearchDebug.setLogging) {
    window.cleanSearchDebug.setLogging(enabled);
    console.log(`Logging ${enabled ? 'enabled' : 'disabled'} via popup`);
  }
}
