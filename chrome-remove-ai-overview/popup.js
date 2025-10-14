// Enhanced popup script for Clean Search Results extension

document.addEventListener('DOMContentLoaded', function() {
  // UI Elements
  const statusDiv = document.getElementById('status');
  const extensionToggle = document.getElementById('extensionToggle');
  const aiToggle = document.getElementById('aiToggle');
  const lowQualityToggle = document.getElementById('lowQualityToggle');
  const adsToggle = document.getElementById('adsToggle');
  const academicToggle = document.getElementById('academicToggle');
  const placeholdersToggle = document.getElementById('placeholdersToggle');
  const scanNowBtn = document.getElementById('scanNow');
  const enhanceSearchBtn = document.getElementById('enhanceSearch');
  const refreshStatsBtn = document.getElementById('refreshStats');
  const resetStatsBtn = document.getElementById('resetStats');
  const manageWhitelistBtn = document.getElementById('manageWhitelist');
  const reportIssueBtn = document.getElementById('reportIssue');
  const viewSourceBtn = document.getElementById('viewSource');
  const showHelpBtn = document.getElementById('showHelp');
  
  // Onboarding elements
  const onboardingModal = document.getElementById('onboardingModal');
  const skipOnboardingBtn = document.getElementById('skipOnboarding');
  const startUsingBtn = document.getElementById('startUsing');
  
  // Advanced settings elements
  const advancedSettingsBtn = document.getElementById('advancedSettings');
  const advancedPanel = document.getElementById('advancedPanel');
  const maxDepthSlider = document.getElementById('maxDepthSlider');
  const maxDepthValue = document.getElementById('maxDepthValue');
  const maxTextLengthSlider = document.getElementById('maxTextLengthSlider');
  const maxTextLengthValue = document.getElementById('maxTextLengthValue');
  const scanDelaySlider = document.getElementById('scanDelaySlider');
  const scanDelayValue = document.getElementById('scanDelayValue');
  const animationDurationSlider = document.getElementById('animationDurationSlider');
  const animationDurationValue = document.getElementById('animationDurationValue');
  const strictMatchingToggle = document.getElementById('strictMatchingToggle');
  const resetScanSettingsBtn = document.getElementById('resetScanSettings');
  const applyScanSettingsBtn = document.getElementById('applyScanSettings');
  
  // Stat elements
  const totalRemovedCount = document.getElementById('totalRemovedCount');
  const aiRemovedCount = document.getElementById('aiRemovedCount');
  const lowQualityRemovedCount = document.getElementById('lowQualityRemovedCount');
  const adsRemovedCount = document.getElementById('adsRemovedCount');
  const pagesProcessedCount = document.getElementById('pagesProcessedCount');
  const sessionCount = document.getElementById('sessionCount');
  const lastActivity = document.getElementById('lastActivity');

  let currentStats = {
    aiElementsRemoved: 0,
    lowQualitySitesRemoved: 0,
    adsRemoved: 0,
    totalElementsRemoved: 0,
    pagesProcessed: 0,
    sessionsCount: 0,
    lastScanTime: 0
  };

  let filterSettings = {
    removeAiOverview: true,
    removeLowQualitySites: true,
    removeAds: true,
    academicMode: false,
    showReplacementPlaceholders: false,
    customWhitelist: [],
    advancedScanning: {
      maxDepth: 12,
      maxTextLength: 500,
      shortTextLength: 200,
      adTextLength: 300,
      sponsoredTextLength: 500,
      scanDelay: 150,
      initialScanDelay: 500,
      finalScanDelay: 2000,
      animationDuration: 200,
      strictMatching: true
    }
  };

  // Helper function to update enhance button state
  function updateEnhanceButtonState() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const currentTab = tabs[0];
      const isGoogleSearch = currentTab.url && (
        currentTab.url.includes('google.com/search') ||
        currentTab.url.includes('google.co.uk/search') ||
        /google\.[a-z]{2,3}\/search/.test(currentTab.url)
      );
      
      if (isGoogleSearch && filterSettings.academicMode) {
        enhanceSearchBtn.disabled = false;
        enhanceSearchBtn.style.opacity = '1';
      } else {
        enhanceSearchBtn.disabled = true;
        enhanceSearchBtn.style.opacity = '0.5';
      }
    });
  }

  // Whitelist management
  function showWhitelistDialog() {
    const currentWhitelist = filterSettings.customWhitelist || [];
    const whitelistText = currentWhitelist.join('\n');
    
    const newWhitelist = prompt(
      'Enter domains to whitelist (one per line):\nExample:\nwikipedia.org\nstackoverflow.com', 
      whitelistText
    );
    
    if (newWhitelist !== null) {
      const domains = newWhitelist.split('\n')
        .map(d => d.trim())
        .filter(d => d.length > 0);
      
      filterSettings.customWhitelist = domains;
      saveFilterSettings();
      
      statusDiv.className = 'status active';
      statusDiv.textContent = `Whitelist updated with ${domains.length} domains`;
      setTimeout(() => updateStatus(extensionToggle.checked), 2000);
    }
  }

  // Initialize popup
  init();

  function checkFirstTimeUser() {
    chrome.storage.local.get(['hasSeenOnboarding'], function(result) {
      if (!result.hasSeenOnboarding) {
        // Show onboarding after a brief delay
        setTimeout(() => {
          showOnboarding(false);
        }, 800);
      }
    });
  }

  function init() {
    loadSettings();
    loadStats();
    checkCurrentPage();
    setupEventListeners();
    checkFirstTimeUser();
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
      placeholdersToggle.checked = filterSettings.showReplacementPlaceholders || false;
      
      // Update enhance search button state
      updateEnhanceButtonState();
      
      updateStatus(enabled);
    });
  }

  function loadStats() {
    chrome.storage.local.get(['cleanSearchStats'], (result) => {
      if (result.cleanSearchStats) {
        currentStats = result.cleanSearchStats;
      }
      updateStatsDisplay();
    });
  }

  function updateStatsDisplay() {
    totalRemovedCount.textContent = currentStats.totalElementsRemoved || 0;
    aiRemovedCount.textContent = currentStats.aiElementsRemoved || 0;
    lowQualityRemovedCount.textContent = currentStats.lowQualitySitesRemoved || 0;
    adsRemovedCount.textContent = currentStats.adsRemoved || 0;
    pagesProcessedCount.textContent = currentStats.pagesProcessed || 0;
    sessionCount.textContent = currentStats.sessionsCount || 0;
    
    // Update last activity
    if (currentStats.lastScanTime) {
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
    } else {
      lastActivity.textContent = 'Last activity: Never';
    }
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
      const currentTab = tabs[0];
      const isGoogleSearch = currentTab.url && (
        currentTab.url.includes('google.com/search') ||
        currentTab.url.includes('google.co.uk/search') ||
        /google\.[a-z]{2,3}\/search/.test(currentTab.url)
      );

      updateStatus(extensionToggle.checked);
    });
  }

  function setupEventListeners() {
    // Master extension toggle
    extensionToggle.addEventListener('change', function() {
      const enabled = extensionToggle.checked;
      chrome.storage.local.set({ cleanSearchEnabled: enabled });
      updateStatus(enabled);
      
      // Notify content script of setting change
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
      updateEnhanceButtonState();
      
      if (filterSettings.academicMode) {
        // Trigger academic enhancement immediately
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            function: enhanceSearchForAcademics
          });
        });
      }
    });

    placeholdersToggle.addEventListener('change', function() {
      filterSettings.showReplacementPlaceholders = placeholdersToggle.checked;
      saveFilterSettings();
      
      // Notify content script to toggle placeholders
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

    function saveFilterSettings() {
      chrome.storage.local.set({ filterSettings: filterSettings });
      
      // Notify content script of filter changes
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

    // Enhance search button
    enhanceSearchBtn.addEventListener('click', function() {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.scripting.executeScript({
          target: {tabId: tabs[0].id},
          function: enhanceSearchForAcademics
        }, function(results) {
          if (chrome.runtime.lastError) {
            console.error('Enhancement failed:', chrome.runtime.lastError);
          } else {
            statusDiv.className = 'status active';
            statusDiv.textContent = 'Search enhanced for academic research';
            setTimeout(() => {
              updateStatus(extensionToggle.checked);
            }, 2000);
          }
        });
      });
    });

    // Refresh stats button
    refreshStatsBtn.addEventListener('click', function() {
      loadStats();
      
      // Get fresh stats from content script
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.scripting.executeScript({
          target: {tabId: tabs[0].id},
          function: getStats
        }, function(results) {
          if (results && results[0] && results[0].result) {
            currentStats = results[0].result;
            updateStatsDisplay();
          }
        });
      });
    });

    // Reset stats button
    resetStatsBtn.addEventListener('click', function() {
      if (confirm('Reset all statistics and settings? This action cannot be undone.')) {
        currentStats = {
          aiElementsRemoved: 0,
          lowQualitySitesRemoved: 0,
          adsRemoved: 0,
          totalElementsRemoved: 0,
          pagesProcessed: 0,
          sessionsCount: 1,
          lastScanTime: Date.now()
        };
        
        chrome.storage.local.set({ cleanSearchStats: currentStats });
        updateStatsDisplay();
        
        // Reset stats in content script too
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

    // Manage whitelist button
    manageWhitelistBtn.addEventListener('click', function() {
      showWhitelistDialog();
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
      // Open a Google search in a new tab to demonstrate
      chrome.tabs.create({
        url: 'https://www.google.com/search?q=artificial+intelligence+overview'
      });
    });

    // Close modal when clicking outside
    onboardingModal.addEventListener('click', function(e) {
      if (e.target === onboardingModal) {
        hideOnboarding();
      }
    });

    // Advanced settings panel toggle
    advancedSettingsBtn.addEventListener('click', function() {
      const isHidden = advancedPanel.style.display === 'none';
      advancedPanel.style.display = isHidden ? 'block' : 'none';
      advancedSettingsBtn.textContent = isHidden ? 'Hide Advanced Settings' : 'Advanced Scanning Settings';
      
      if (isHidden) {
        updateAdvancedUI();
      }
    });

    // Advanced settings sliders
    maxDepthSlider.addEventListener('input', function() {
      maxDepthValue.textContent = this.value;
    });

    maxTextLengthSlider.addEventListener('input', function() {
      maxTextLengthValue.textContent = this.value;
    });

    scanDelaySlider.addEventListener('input', function() {
      scanDelayValue.textContent = this.value;
    });

    animationDurationSlider.addEventListener('input', function() {
      animationDurationValue.textContent = this.value;
    });

    // Reset scan settings
    resetScanSettingsBtn.addEventListener('click', function() {
      const defaults = {
        maxDepth: 12,
        maxTextLength: 500,
        shortTextLength: 200,
        adTextLength: 300,
        sponsoredTextLength: 500,
        scanDelay: 150,
        initialScanDelay: 500,
        finalScanDelay: 2000,
        animationDuration: 200,
        strictMatching: true
      };
      
      filterSettings.advancedScanning = { ...defaults };
      updateAdvancedUI();
      
      // Apply immediately
      applyScanSettings();
    });

    // Apply scan settings
    applyScanSettingsBtn.addEventListener('click', function() {
      applyScanSettings();
    });

    function updateAdvancedUI() {
      const settings = filterSettings.advancedScanning;
      maxDepthSlider.value = settings.maxDepth || 12;
      maxDepthValue.textContent = settings.maxDepth || 12;
      maxTextLengthSlider.value = settings.maxTextLength || 500;
      maxTextLengthValue.textContent = settings.maxTextLength || 500;
      scanDelaySlider.value = settings.scanDelay || 150;
      scanDelayValue.textContent = settings.scanDelay || 150;
      animationDurationSlider.value = settings.animationDuration || 200;
      animationDurationValue.textContent = settings.animationDuration || 200;
      strictMatchingToggle.checked = settings.strictMatching !== false;
    }

    function applyScanSettings() {
      const newSettings = {
        maxDepth: parseInt(maxDepthSlider.value),
        maxTextLength: parseInt(maxTextLengthSlider.value),
        shortTextLength: Math.min(parseInt(maxTextLengthSlider.value) / 2.5, 200),
        adTextLength: Math.min(parseInt(maxTextLengthSlider.value) * 0.6, 300),
        sponsoredTextLength: parseInt(maxTextLengthSlider.value),
        scanDelay: parseInt(scanDelaySlider.value),
        animationDuration: parseInt(animationDurationSlider.value),
        strictMatching: strictMatchingToggle.checked
      };
      
      filterSettings.advancedScanning = { ...filterSettings.advancedScanning, ...newSettings };
      
      // Save to storage
      chrome.storage.local.set({ filterSettings: filterSettings }, function() {
        console.log('Advanced scanning settings saved');
      });
      
      // Update active tabs
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0] && tabs[0].url.includes('google.com/search')) {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: (config) => {
              if (window.cleanSearchDebug && window.cleanSearchDebug.updateScanConfig) {
                window.cleanSearchDebug.updateScanConfig(config);
                console.log('Scan config updated:', config);
              }
            },
            args: [newSettings]
          }).catch(err => {
            console.log('Could not update scan config on page:', err);
          });
        }
      });
      
      applyScanSettingsBtn.textContent = 'Applied!';
      setTimeout(() => {
        applyScanSettingsBtn.textContent = 'Apply Settings';
      }, 2000);
    }

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
      // Open a Google search in a new tab to demonstrate
      chrome.tabs.create({
        url: 'https://www.google.com/search?q=artificial+intelligence+overview'
      });
    });

    // Close modal when clicking outside
    onboardingModal.addEventListener('click', function(e) {
      if (e.target === onboardingModal) {
        hideOnboarding();
      }
    });

    function showOnboarding(isHelp = false) {
      onboardingModal.style.display = 'flex';
      
      if (isHelp) {
        // Modify content for help mode
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
  }
});

// Functions to inject into the current page
function updateExtensionState(enabled) {
  if (window.cleanSearchDebug && window.cleanSearchDebug.setEnabled) {
    window.cleanSearchDebug.setEnabled(enabled);
    console.log(`Clean Search extension ${enabled ? 'enabled' : 'disabled'} via popup`);
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
    console.log('Clean Search not found on page');
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

function enhanceSearchForAcademics() {
  if (window.cleanSearchDebug && window.cleanSearchDebug.enhanceSearch) {
    window.cleanSearchDebug.enhanceSearch();
    console.log('Academic search enhancement triggered via popup');
  }
}

