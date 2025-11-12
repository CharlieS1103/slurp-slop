/* global enforceSettingsRules */

// SLURPSLOP Extension Popup (source)
// Handles user interface interactions and extension state management
// TODO: BREAK UP THIS FILE
document.addEventListener('DOMContentLoaded', function () {
  // UI Elements
  const statusDiv = document.getElementById('status');
  const extensionToggle = document.getElementById('extension-toggle');
  const aiToggle = document.getElementById('ai-toggle');
  const lowQualityToggle = document.getElementById('low-quality-toggle');
  const adsToggle = document.getElementById('ads-toggle');
  const aggressiveToggle = document.getElementById('aggressive-toggle');
  const placeholdersToggle = document.getElementById('placeholders-toggle');
  const minimalistToggle = document.getElementById('minimalist-toggle');
  const linksOnlyToggle = document.getElementById('links-only-toggle');
  const hideAiModeToggle = document.getElementById('hide-ai-mode-toggle');
  //const scanNowBtn = document.getElementById('scanNow');
  const addToWhitelistBtn = document.getElementById('add-to-whitelist');
  const clearWhitelistBtn = document.getElementById('clear-whitelist');
  const whitelistDisplay = document.getElementById('whitelist-display');
  const whitelistInput = document.getElementById('whitelist-input');
  const reportIssueBtn = document.getElementById('report-issue');
  const showHelpBtn = document.getElementById('show-help');
  const toggleLoggingBtn = document.getElementById('toggle-logging');

  const hideableSection = document.getElementById('can-be-hidden');

  // Logging state for popup UI
  let loggingEnabled = false;

  // Stat elements
  const totalRemovedCount = document.getElementById('total-removed-count');
  const aiRemovedCount = document.getElementById('ai-removed-count');
  const dailyRemovedCount = document.getElementById('daily-removed-count');
  const lowQualityRemovedCount = document.getElementById(
    'low-quality-removed-count'
  );
  const adsRemovedCount = document.getElementById('ads-removed-count');

  const lastActivity = document.getElementById('last-activity');

  let currentStats = {
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

  // Keep previous toggle states to restore when leaving Minimalist Mode
  const _prevToggleState = {
    aiToggle: null,
    lowQualityToggle: null,
    adsToggle: null,
    placeholdersToggle: null
  };


  // Initialize tooltip text bs
  document.querySelectorAll('.tooltip').forEach(element => {
    const tooltipText = element.querySelector('.tooltip-text');

    let hoverInterval = null;
    let tooltipHoverTime = 0;

    element.addEventListener('mouseenter', () => {
      hoverInterval = setInterval(() => {
        tooltipHoverTime++;

        if (tooltipHoverTime > 150) 
          tooltipText.style.visibility = 'visible';
      }, 1);
    });


    element.addEventListener('mouseleave', () => {
      clearInterval(hoverInterval);
      hoverInterval = null;
      tooltipHoverTime = 0;
      tooltipText.style.visibility = 'hidden';
    });



    element.addEventListener('mousemove', e => {
      const x = e.clientX;
      const y = e.clientY;

      const winWidth = window.innerWidth;
      const winHeight = window.innerHeight;

      const tooltipWidth = tooltipText.offsetWidth;
      const tooltipHeight = tooltipText.offsetHeight;
      
      const defaultPadding = 15;
      let left = x + defaultPadding - (tooltipWidth / 2);
      let top = y + defaultPadding;

      if (left + tooltipWidth > winWidth - (defaultPadding / 2)) {
        left = winWidth - tooltipWidth - (defaultPadding / 2);
      }
      if (left < 0) left = 0;

      if (top + tooltipHeight > winHeight - (defaultPadding / 2)) {
        top = winHeight - tooltipHeight - (defaultPadding / 2);
      }
      if (top < 0) top = 0;

      tooltipText.style.left = `${left}px`;
      tooltipText.style.top = `${top}px`;
    });
  });


  function updatePlaceholdersToggleState() {
    if (!placeholdersToggle) {
      return;
    }

    const shouldDisable =
      filterSettings.minimalistMode ||
      filterSettings.linksOnlyMode ||
      filterSettings.aggressiveMode;

    placeholdersToggle.disabled = shouldDisable;

    if (shouldDisable) {
      placeholdersToggle.checked = false;
    } else {
      placeholdersToggle.checked = !!filterSettings.showReplacementPlaceholders;
    }
  }

  // Hide every setting if master switch is off; there's no need to show everything if the extension is off. -e
  function toggleSettingVisibility() {
    if (!hideableSection) {
      return;
    }
    const shouldHide = !extensionToggle.checked;
    hideableSection.classList.toggle('hidden', shouldHide);
    hideableSection.setAttribute('aria-hidden', shouldHide ? 'true' : 'false');
  }

  // Save filter settings function (enforces rules before persisting)
  function saveFilterSettings() {
    try {
      const prev = { ...filterSettings };
      // enforce central rules if available
      if (typeof enforceSettingsRules === 'function') {
        filterSettings = enforceSettingsRules(filterSettings, prev);
      }
    } catch { }

    updatePlaceholdersToggleState();

    const filterData = { filterSettings };
    chrome.storage.local.set(filterData);

    // Broadcast to all tabs
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (!tabs[0]) {
        return;
      }
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: updateFilterSettings,
        args: [filterSettings]
      });
    });
  }

  // Whitelist management functions
  // TODO: this feels clunky idk if there's a better way though
  function updateWhitelistDisplay() {
    const whitelist = filterSettings.customWhitelist || [];

    if (whitelist.length === 0) {
      whitelistDisplay.innerHTML = '<p>No whitelisted sites</p>';
      whitelistDisplay.className = 'whitelist-display empty';
    } else {
      whitelistDisplay.className = 'whitelist-display';
      whitelistDisplay.innerHTML = whitelist
        .map(
          site =>
            `<span class="whitelist-site" data-site="${site}"><p>${site}</p></span>`
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
      const whitelistInput = document.getElementById('whitelist-input');
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

  // Stats loading, we can make these better but this is a simple start
  function loadStats() {
    // Get current page stats from storage
    chrome.storage.local.get(['cleanSearchStats'], result => {
      let storedStats = {
        ...currentStats,
        ...(result.cleanSearchStats || {})
      };

      // Try to get real-time stats from active tab's content script
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const activeTab = tabs[0];
        const activeUrl = activeTab ? activeTab.url || '' : '';
        const activeSignature = computePageSignature(activeUrl);

        if (
          storedStats.pageSignature &&
          activeSignature &&
          storedStats.pageSignature !== activeSignature
        ) {
          // Different page than the stored stats were recorded on; show a fresh slate for this page
          storedStats = {
            ...storedStats,
            aiElementsRemoved: 0,
            lowQualitySitesRemoved: 0,
            adsRemoved: 0,
            currentPageRemoved: 0,
            scanCount: 0,
            lastScanTime: 0,
            placeholdersCreated: 0,
            pageSignature: activeSignature
          };
        }

        currentStats = storedStats;

        if (activeTab && activeUrl && activeUrl.includes('google.com/search')) {
          try {
            chrome.scripting.executeScript(
              {
                target: { tabId: activeTab.id },
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
                  const liveStats = result[0].result;
                  if (liveStats) {
                    if (
                      !liveStats.pageSignature ||
                      !activeSignature ||
                      liveStats.pageSignature === activeSignature
                    ) {
                      // Use current page stats directly
                      currentStats = {
                        ...currentStats,
                        ...liveStats
                      };
                    }
                  }
                  updateStatsDisplay();
                } else {
                  updateStatsDisplay();
                }
              }
            );
          } catch (error) {
            console.log('Error grabbing stats data:', error);
            updateStatsDisplay();
          }
        } else {
          // can you tell i want these damn stats to update??
          updateStatsDisplay();
        }
      });
    });
  }

  function computePageSignature(urlString = '') {
    if (!urlString) {
      return '';
    }

    try {
      const parsed = new URL(urlString);
      if (!/google\.[a-z.]+\/search/i.test(parsed.href)) {
        return '';
      }

      const query = parsed.searchParams.get('q') || '';
      const start = parsed.searchParams.get('start') || '0';
      const tbm = parsed.searchParams.get('tbm') || '';
      const udm = parsed.searchParams.get('udm') || '';

      return [
        parsed.pathname || '',
        `q=${query}`,
        `start=${start}`,
        `tbm=${tbm}`,
        `udm=${udm}`
      ].join('|');
    } catch (error) {
      console.log('Could not compute page signature', error);
      return '';
    }
  }

  function updateStatsDisplay() {
    if (totalRemovedCount) {
      totalRemovedCount.textContent = currentStats.currentPageRemoved || 0;
    }
    if (dailyRemovedCount) {
      dailyRemovedCount.textContent = currentStats.dailyRemoved || 0;
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
  async function init() {
    try {
      console.log('SlurpSlop popup initializing...');
      await loadSettings();
      loadStats();
      checkCurrentPage();
      setupEventListeners();
      toggleSettingVisibility();
      console.log('SlurpSlop popup initialized successfully');
    } catch (error) {
      console.error('Error initializing popup:', error);
      if (statusDiv) {
        statusDiv.className = 'status disabled';
        statusDiv.textContent = 'Initialization Error';
      }
    }
  }

  function loadSettings() {
    return new Promise(resolve => {
      chrome.storage.local.get(
        ['cleanSearchEnabled', 'filterSettings', 'loggingEnabled'],
        result => {
          const enabled = result.cleanSearchEnabled !== false;
          extensionToggle.checked = enabled;

          if (result.filterSettings) {
            filterSettings = { ...filterSettings, ...result.filterSettings };
          }
          // enforce central rules if available
          if (typeof enforceSettingsRules === 'function') {
            filterSettings = enforceSettingsRules(filterSettings);
          }

          // Update individual toggles
          aiToggle.checked = filterSettings.removeAiOverview;
          lowQualityToggle.checked = filterSettings.removeLowQualitySites;
          adsToggle.checked = filterSettings.removeAds;
          minimalistToggle.checked = filterSettings.minimalistMode || false;
          linksOnlyToggle.checked = filterSettings.linksOnlyMode || false;
          aggressiveToggle.checked = filterSettings.aggressiveMode || false;
          hideAiModeToggle.checked = filterSettings.hideAiModeButton !== false; // Default to true if not set
          placeholdersToggle.checked =
            filterSettings.showReplacementPlaceholders || false;

          // Update whitelist display
          updateWhitelistDisplay();
          // Set disable terms button state
          const disableTermsBtn = document.getElementById('disableTermsToggle');
          if (disableTermsBtn) {
            const on = !!filterSettings.disableTermsEnabled;
            disableTermsBtn.textContent = `Disable terms: ${on ? 'On' : 'Off'}`;
          }

          // Load logging state and update UI
          loggingEnabled = !!result.loggingEnabled;
          updateLoggingButtonUI(loggingEnabled);

          // Broadcast current logging state to active tab
          // i feel like the logging in it's current state could be annoying
          // TODO: don't print logs to console when in prod, have them appended to a show logs modal or smth
          chrome.tabs.query(
            { active: true, currentWindow: true },
            function (tabs) {
              if (!tabs[0]) {
                return;
              }
              chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                function: setLogging,
                args: [loggingEnabled]
              });
            }
          );

          // enforce all UI rules
          if (filterSettings.minimalistMode) {
            aiToggle.checked = true;
            lowQualityToggle.checked = false;
            adsToggle.checked = false;
            placeholdersToggle.checked = false;

            lowQualityToggle.disabled = true;
            adsToggle.disabled = true;
            filterSettings.showReplacementPlaceholders = false;
          }

          // If links-only mode is enabled, disable placeholders toggle
          if (filterSettings.linksOnlyMode) {
            filterSettings.showReplacementPlaceholders = false;
          }

          if (filterSettings.aggressiveMode) {
            filterSettings.showReplacementPlaceholders = false;
          }

          updatePlaceholdersToggleState();

          updateStatus(enabled);
          resolve(result);
        }
      );
    });
  }

  function updateLoggingButtonUI(enabled) {
    if (!toggleLoggingBtn) {
      return;
    }
    toggleLoggingBtn.classList.toggle('enabled', enabled);
    toggleLoggingBtn.classList.toggle('disabled', !enabled);
    toggleLoggingBtn.innerHTML = enabled
      ? '<p>Logging Enabled</p>'
      : '<p>Logging Disabled</p>';
  }

  function updateStatus(enabled) {
    if (!statusDiv) {
      return;
    }
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const currentTab = tabs[0];
      const isGoogleSearch =
        currentTab.url &&
        (currentTab.url.includes('google.com/search') ||
          currentTab.url.includes('google.co.uk/search') ||
          /google\.[a-z]{2,3}\/search/.test(currentTab.url));

      if (!enabled) {
        statusDiv.className = 'status disabled';
        statusDiv.textContent = 'disabled.';
        // scanNowBtn.disabled = true;
      } else if (!isGoogleSearch) {
        statusDiv.className = 'status inactive';
        statusDiv.innerHTML = 'enabled<br>enter query to use.';
        // scanNowBtn.disabled = true;
      } else {
        statusDiv.className = 'status active';
        statusDiv.innerHTML = 'enabled and monitoring.';
        // scanNowBtn.disabled = false;
      }
    });
  }

  function checkCurrentPage() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (_tabs) {
      updateStatus(extensionToggle.checked);
    });
  }

  function setupEventListeners() {
    // Master extension toggle
    extensionToggle.addEventListener('change', function () {
      const enabled = extensionToggle.checked;
      chrome.storage.local.set({ cleanSearchEnabled: enabled });
      updateStatus(enabled);
      toggleSettingVisibility();
      loadSettings();
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: updateExtensionState,
          args: [enabled]
        });
      });
    });

    // Individual filter toggles
    aiToggle.addEventListener('change', function () {
      filterSettings.removeAiOverview = aiToggle.checked;
      saveFilterSettings();
    });

    lowQualityToggle.addEventListener('change', function () {
      filterSettings.removeLowQualitySites = lowQualityToggle.checked;
      saveFilterSettings();
    });

    adsToggle.addEventListener('change', function () {
      filterSettings.removeAds = adsToggle.checked;
      saveFilterSettings();
    });

    placeholdersToggle.addEventListener('change', function () {
      filterSettings.showReplacementPlaceholders = placeholdersToggle.checked;
      saveFilterSettings();
      // TODO: prompt user to reload on placeholder toggle, give them a banner to click
      // you guys got this
    });

    minimalistToggle.addEventListener('change', function () {
      filterSettings.minimalistMode = minimalistToggle.checked;

      // Minimalist and links-only are mutually exclusive
      if (filterSettings.minimalistMode && filterSettings.linksOnlyMode) {
        filterSettings.linksOnlyMode = false;
        linksOnlyToggle.checked = false;
      }

      // Minimalist mode needs to disable other filters
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

        lowQualityToggle.disabled = true;
        adsToggle.disabled = true;
        updatePlaceholdersToggleState();

        statusDiv.className = 'status active';
        statusDiv.textContent =
          'Minimalist Mode: Lightweight AI Overview removal only';
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

        lowQualityToggle.disabled = false;
        adsToggle.disabled = false;
        updatePlaceholdersToggleState();

        statusDiv.className = 'status active';
        statusDiv.textContent = 'Minimalist Mode disabled';
        setTimeout(() => updateStatus(extensionToggle.checked), 1500);
      }

      saveFilterSettings();
    });

    // Links-only mode
    linksOnlyToggle.addEventListener('change', function () {
      filterSettings.linksOnlyMode = linksOnlyToggle.checked;

      // Minimalist and links-only are mutually exclusive
      if (filterSettings.linksOnlyMode && filterSettings.minimalistMode) {
        filterSettings.minimalistMode = false;
        minimalistToggle.checked = false;

        // Re-enable the toggles that minimalist mode disabled
        lowQualityToggle.disabled = false;
        adsToggle.disabled = false;
      }

      // When links-only mode is enabled, disable placeholders toggle
      if (filterSettings.linksOnlyMode) {
        filterSettings.showReplacementPlaceholders = false;
      }

      updatePlaceholdersToggleState();

      saveFilterSettings();
      statusDiv.className = 'status active';
      statusDiv.textContent = linksOnlyToggle.checked
        ? 'Links-only Mode: Showing links only'
        : 'Links-only Mode disabled';
      setTimeout(() => updateStatus(extensionToggle.checked), 2000);
    });

    aggressiveToggle.addEventListener('change', function () {
      filterSettings.aggressiveMode = aggressiveToggle.checked;

      if (filterSettings.aggressiveMode) {
        if (filterSettings.minimalistMode) {
          minimalistToggle.checked = false;
          minimalistToggle.dispatchEvent(new Event('change'));
        }

        filterSettings.showReplacementPlaceholders = false;
        updatePlaceholdersToggleState();

        statusDiv.className = 'status active';
        statusDiv.textContent = 'Aggressive Mode active';
      } else {
        updatePlaceholdersToggleState();
        statusDiv.className = 'status active';
        statusDiv.textContent = 'Aggressive Mode disabled';
      }

      saveFilterSettings();
      setTimeout(() => updateStatus(extensionToggle.checked), 2000);
    });

    // Logging toggle
    toggleLoggingBtn.addEventListener('click', function () {
      loggingEnabled = !loggingEnabled;
      chrome.storage.local.set({ loggingEnabled });

      updateLoggingButtonUI(loggingEnabled);

      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: setLogging,
          args: [loggingEnabled]
        });
      });
    });

    // Scan current page button
    // honestly this isn't needed, it's kind of stupid
    /*
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
*/
    // Whitelist input field and button event listeners

    addToWhitelistBtn.addEventListener('click', function () {
      const domain = whitelistInput.value;
      if (domain) {
        addToWhitelist(domain);
      }
    });

    // Also add domain when pressing Enter in the input field
    whitelistInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        const domain = whitelistInput.value;
        if (domain) {
          addToWhitelist(domain);
        }
      }
    });

    clearWhitelistBtn.addEventListener('click', function () {
      clearWhitelist();
    });

    // Disable terms toggle button, seemed smart but not sure if necessary
    const disableTermsBtn = document.getElementById('disableTermsToggle');
    if (disableTermsBtn) {
      disableTermsBtn.addEventListener('click', function () {
        filterSettings.disableTermsEnabled =
          !filterSettings.disableTermsEnabled;
        saveFilterSettings();
        disableTermsBtn.textContent = `Disable terms: ${filterSettings.disableTermsEnabled ? 'On' : 'Off'}`;
        statusDiv.className = 'status active';
        statusDiv.textContent = filterSettings.disableTermsEnabled
          ? 'Query-based disable terms enabled'
          : 'Query-based disable terms disabled';
        setTimeout(() => updateStatus(extensionToggle.checked), 1500);
      });
    }

    // Report issue button -> open email to me,
    // TODO: we should do something else, i don't want to be mailed
    reportIssueBtn.addEventListener('click', function () {
      chrome.tabs.create({ url: 'mailto:slurpslopsupprt@gmail.com' });
    });

    // Show help -> open email
    showHelpBtn.addEventListener('click', function () {
      chrome.tabs.create({ url: 'mailto:slrupslopsupprt@gmail.com' });
    });
    // we're lying to our userbase, i'm not helping with jackshit

    // AI Mode button toggle
    hideAiModeToggle.addEventListener('change', function () {
      filterSettings.hideAiModeButton = hideAiModeToggle.checked;
      saveFilterSettings();
    });
  }
  init();
});

// Functions to inject into the current page

function updateExtensionState(enabled) {
  if (
    window.SlurpSlop &&
    typeof window.SlurpSlop.setExtensionEnabledImmediate === 'function'
  ) {
    window.SlurpSlop.setExtensionEnabledImmediate(enabled);
    console.log(
      `SlurpSlop extension ${enabled ? 'enabled' : 'disabled'} via popup`
    );
  }
}

function updateFilterSettings(settings) {
  if (
    window.SlurpSlop &&
    typeof window.SlurpSlop.applyFilterSettings === 'function'
  ) {
    window.SlurpSlop.applyFilterSettings(settings);
    console.log('Filter settings updated via popup:', settings);
  }
}
/*
function triggerScan() {
  if (window.cleanSearchDebug && window.cleanSearchDebug.scan) {
    window.cleanSearchDebug.scan();
    console.log('Manual scan triggered by extension popup');
    return true;
  } else {
    console.log('SlurpSlop not found on page');
    return false;
  }
}
*/
function getStats() {
  if (
    window.SlurpSlop &&
    typeof window.SlurpSlop.getCurrentStats === 'function'
  ) {
    return window.SlurpSlop.getCurrentStats();
  }
  return null;
}
// smart to keep
/*
function resetStats() {
  if (window.SlurpSlop && typeof window.SlurpSlop.resetCurrentStats === 'function') {
    window.SlurpSlop.resetCurrentStats();
    console.log('Statistics reset via popup');
  }
}
  */

function setLogging(enabled) {
  if (
    window.SlurpSlop &&
    typeof window.SlurpSlop.setLoggingEnabled === 'function'
  ) {
    window.SlurpSlop.setLoggingEnabled(enabled);
    console.log(`Logging ${enabled ? 'enabled' : 'disabled'} via popup`);
  }
}
