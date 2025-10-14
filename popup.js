// SlopSlurp Extension Popup Script

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
  const scanNowBtn = document.getElementById('scanNow');
  const resetStatsBtn = document.getElementById('resetStats');
  const addToWhitelistBtn = document.getElementById('addToWhitelist');
  const clearWhitelistBtn = document.getElementById('clearWhitelist');
  const whitelistDisplay = document.getElementById('whitelistDisplay');
  const reportIssueBtn = document.getElementById('reportIssue');
  const viewSourceBtn = document.getElementById('viewSource');
  const showHelpBtn = document.getElementById('showHelp');
  
  // Onboarding elements
  const onboardingModal = document.getElementById('onboardingModal');
  const skipOnboardingBtn = document.getElementById('skipOnboarding');
  const startUsingBtn = document.getElementById('startUsing');
  
  // Stat elements - simplified
  const totalRemovedCount = document.getElementById('totalRemovedCount');
  const aiRemovedCount = document.getElementById('aiRemovedCount');
  const lowQualityRemovedCount = document.getElementById('lowQualityRemovedCount');
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

  // Whitelist management functions
  function updateWhitelistDisplay() {
    const whitelist = filterSettings.customWhitelist || [];
    
    if (whitelist.length === 0) {
      whitelistDisplay.innerHTML = 'No whitelisted sites';
      whitelistDisplay.className = 'whitelist-display empty';
    } else {
      whitelistDisplay.className = 'whitelist-display';
      whitelistDisplay.innerHTML = whitelist.map(site => 
        `<span class="whitelist-site" data-site="${site}">${site}</span>`
      ).join('');
      
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
    if (!domain || domain.trim() === '') return;
    
    const cleanDomain = domain.trim().toLowerCase();
    if (!filterSettings.customWhitelist) {
      filterSettings.customWhitelist = [];
    }
    
    if (!filterSettings.customWhitelist.includes(cleanDomain)) {
      filterSettings.customWhitelist.push(cleanDomain);
      saveFilterSettings();
      updateWhitelistDisplay();
      
      statusDiv.className = 'status active';
      statusDiv.textContent = `Added ${cleanDomain} to whitelist`;
      setTimeout(() => updateStatus(extensionToggle.checked), 2000);
    }
  }

  function removeFromWhitelist(domain) {
    if (!filterSettings.customWhitelist) return;
    
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
    chrome.storage.local.get(['cleanSearchStats'], (result) => {
      if (result.cleanSearchStats) {
        currentStats = { ...currentStats, ...result.cleanSearchStats };
      }
      
      // Try to get real-time stats from active tab's content script
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0] && tabs[0].url && tabs[0].url.includes('google.com/search')) {
          try {
            chrome.scripting.executeScript({
              target: {tabId: tabs[0].id},
              function: getStats
            }, (result) => {
              if (chrome.runtime.lastError) {
                console.log('Could not access content script:', chrome.runtime.lastError.message);
                updateStatsDisplay();
              } else if (result && result[0] && result[0].result) {
                // Use current page stats directly
                currentStats = { ...currentStats, ...result[0].result };
                updateStatsDisplay();
              } else {
                updateStatsDisplay();
              }
            });
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
    if (totalRemovedCount) totalRemovedCount.textContent = currentStats.totalElementsRemoved || 0;
    if (aiRemovedCount) aiRemovedCount.textContent = currentStats.aiElementsRemoved || 0;
    if (lowQualityRemovedCount) lowQualityRemovedCount.textContent = currentStats.lowQualitySitesRemoved || 0;
    if (adsRemovedCount) adsRemovedCount.textContent = currentStats.adsRemoved || 0;
    if (pagesProcessedCount) pagesProcessedCount.textContent = currentStats.pagesProcessed || 0;
    
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
      checkFirstTimeUser();
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
    chrome.storage.local.get(['cleanSearchEnabled', 'filterSettings'], (result) => {
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
      placeholdersToggle.checked = filterSettings.showReplacementPlaceholders || false;
      
      // Update whitelist display
      updateWhitelistDisplay();
      
      updateStatus(enabled);
    });
  }

  function updateStatus(enabled) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const currentTab = tabs[0];
      const isGoogleSearch = currentTab.url && (
        currentTab.url.includes('google.com/search') ||
        currentTab.url.includes('google.co.uk/search') ||
        /google\.[a-z]{2,3}\/search/.test(currentTab.url)
      );

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
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      updateStatus(extensionToggle.checked);
    });
  }

  function checkFirstTimeUser() {
    chrome.storage.local.get(['hasSeenOnboarding'], function(result) {
      if (!result.hasSeenOnboarding) {
        setTimeout(() => {
          showOnboarding(false);
        }, 800);
      }
    });
  }

  function setupEventListeners() {
    // Master extension toggle
    extensionToggle.addEventListener('change', function() {
      const enabled = extensionToggle.checked;
      chrome.storage.local.set({ cleanSearchEnabled: enabled });
      updateStatus(enabled);
      
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.scripting.executeScript({
          target: {tabId: tabs[0].id},
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
      
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.scripting.executeScript({
          target: {tabId: tabs[0].id},
          func: (show) => {
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
      
      // If minimalist mode is enabled, disable other filters and show a note
      if (filterSettings.minimalistMode) {
        filterSettings.removeLowQualitySites = false;
        filterSettings.removeAds = false;
        filterSettings.showReplacementPlaceholders = false;
        
        lowQualityToggle.checked = false;
        adsToggle.checked = false;
        placeholdersToggle.checked = false;
        
        statusDiv.className = 'status active';
        statusDiv.textContent = 'Minimalist Mode: Lightweight AI Overview removal only';
        setTimeout(() => updateStatus(extensionToggle.checked), 3000);
      }
      
      saveFilterSettings();
    });

    function saveFilterSettings() {
      chrome.storage.local.set({ filterSettings: filterSettings });
      
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.scripting.executeScript({
          target: {tabId: tabs[0].id},
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
      
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.scripting.executeScript({
          target: {tabId: tabs[0].id},
          function: triggerScan
        }, function(results) {
          if (chrome.runtime.lastError) {
            console.error('Script injection failed:', chrome.runtime.lastError);
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
        });
      });
    });

    // Whitelist button event listeners
    addToWhitelistBtn.addEventListener('click', function() {
      const domain = prompt('Enter domain to whitelist (e.g., wikipedia.org):');
      if (domain) {
        addToWhitelist(domain);
      }
    });

    clearWhitelistBtn.addEventListener('click', function() {
      clearWhitelist();
    });

    // Reset stats button
    resetStatsBtn.addEventListener('click', function() {
      if (confirm('Reset statistics for this page? This action cannot be undone.')) {
        currentStats = {
          aiElementsRemoved: 0,
          lowQualitySitesRemoved: 0,
          adsRemoved: 0,
          totalElementsRemoved: 0,
          scanCount: 0,
          lastScanTime: Date.now(),
          placeholdersCreated: 0
        };
        
        chrome.storage.local.set({ cleanSearchStats: currentStats });
        updateStatsDisplay();
        
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            function: resetStats
          });
        });
      }
    });

    // Report issue button
    reportIssueBtn.addEventListener('click', function() {
      chrome.tabs.create({
        url: 'https://github.com/charliesimons/ai-overwith/issues'
      });
    });

    // View source button
    viewSourceBtn.addEventListener('click', function() {
      chrome.tabs.create({
        url: 'https://github.com/charliesimons/ai-overwith'
      });
    });

    // Show help button
    showHelpBtn.addEventListener('click', function() {
      showOnboarding(true);
    });

    // Onboarding event handlers
    skipOnboardingBtn.addEventListener('click', function() {
      hideOnboarding();
      markOnboardingComplete();
    });

    startUsingBtn.addEventListener('click', function() {
      hideOnboarding();
      markOnboardingComplete();
      chrome.tabs.create({
        url: 'https://www.google.com/search?q=artificial+intelligence+overview'
      });
    });

    onboardingModal.addEventListener('click', function(e) {
      if (e.target === onboardingModal) {
        hideOnboarding();
      }
    });
  }

  function showOnboarding(isHelp = false) {
    onboardingModal.style.display = 'flex';
    
    if (isHelp) {
      const title = onboardingModal.querySelector('h2');
      const startBtn = document.getElementById('startUsing');
      title.textContent = 'Clean Search Help Guide 📖';
      startBtn.textContent = 'Got it!';
    }
  }

  function hideOnboarding() {
    onboardingModal.style.display = 'none';
  }

  function markOnboardingComplete() {
    chrome.storage.local.set({ hasSeenOnboarding: true });
  }

  // Initialize the popup
  init();
});

// Functions to inject into the current page
function updateExtensionState(enabled) {
  if (window.cleanSearchDebug && window.cleanSearchDebug.setEnabled) {
    window.cleanSearchDebug.setEnabled(enabled);
    console.log(`SlopSlurp extension ${enabled ? 'enabled' : 'disabled'} via popup`);
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

function resetStats() {
  if (window.cleanSearchDebug && window.cleanSearchDebug.resetStats) {
    window.cleanSearchDebug.resetStats();
    console.log('Statistics reset via popup');
  }
}