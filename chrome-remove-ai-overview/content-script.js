// Chrome Extension: Clean Search Results
// This content script removes AI Overview sections and low-quality content from Google search results

(function() {
  'use strict';

  // Configurable scanning parameters
  let scanConfig = {
    maxDepth: 12,              // Maximum depth to search for element containers
    maxTextLength: 500,        // Maximum text length to consider for AI detection
    shortTextLength: 200,      // Text length threshold for strict AI matching
    adTextLength: 300,         // Maximum ad text length to consider
    sponsoredTextLength: 500,  // Maximum sponsored content text length
    scanDelay: 150,            // Delay before rescanning after mutations (ms)
    initialScanDelay: 500,     // Delay for first additional scan (ms)
    finalScanDelay: 2000,      // Delay for final scan (ms)
    animationDuration: 200     // Element removal animation duration (ms)
  };

  // Statistics tracking
  let stats = {
    aiElementsRemoved: 0,
    lowQualitySitesRemoved: 0,
    adsRemoved: 0,
    totalElementsRemoved: 0,
    pagesProcessed: 0,
    sessionsCount: 1,
    lastScanTime: Date.now()
  };

  // Content filtering settings
  let filterSettings = {
    removeAiOverview: true,
    removeLowQualitySites: true,
    removeAds: true,
    removePopularResults: false,
    academicMode: false,
    showReplacementPlaceholders: false,
    customWhitelist: [],
    // Advanced scanning settings
    advancedScanning: {
      maxDepth: 12,
      maxTextLength: 500,
      shortTextLength: 200,
      adTextLength: 300,
      sponsoredTextLength: 500,
      scanDelay: 150,
      strictMatching: true
    }
  };

  // Academic whitelist - sites to never remove in academic mode
  const ACADEMIC_WHITELIST = [
    'scholar.google.com',
    'pubmed.ncbi.nlm.nih.gov',
    'jstor.org',
    'researchgate.net',
    'academia.edu',
    'arxiv.org',
    'ssrn.com',
    'sciencedirect.com',
    'springer.com',
    'nature.com',
    'science.org',
    'plos.org',
    'wiley.com',
    'tandfonline.com',
    'cambridge.org',
    'oxfordjournals.org',
    'nih.gov',
    'edu',
    'ac.uk',
    'harvard.edu',
    'mit.edu',
    'stanford.edu',
    'berkeley.edu',
    'yale.edu',
    'princeton.edu',
    'columbia.edu',
    'upenn.edu',
    'uchicago.edu',
    'caltech.edu',
    'wikipedia.org',
    'britannica.com',
    'merriam-webster.com',
    'dictionary.com',
    'etymonline.com'
  ];

  // Load existing stats and settings from storage
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get(['cleanSearchStats', 'filterSettings'], (result) => {
      if (result.cleanSearchStats) {
        stats = { ...stats, ...result.cleanSearchStats };
        stats.sessionsCount = (result.cleanSearchStats.sessionsCount || 0) + 1;
      }
      if (result.filterSettings) {
        filterSettings = { ...filterSettings, ...result.filterSettings };
        
        // Update scan config from advanced settings
        if (filterSettings.advancedScanning) {
          scanConfig = { ...scanConfig, ...filterSettings.advancedScanning };
        }
      }
      saveStats();
      
      // Apply academic mode if enabled
      if (filterSettings.academicMode) {
        enhanceSearchForAcademics();
      }
    });
  }

  // Save stats to storage
  function saveStats() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ 
        cleanSearchStats: stats,
        filterSettings: filterSettings
      });
    }
  }

  // Create replacement placeholder for removed content
  function createReplacementPlaceholder(type, element) {
    if (!filterSettings.showReplacementPlaceholders) return null;
    
    const placeholder = document.createElement('div');
    placeholder.className = 'clean-search-placeholder';
    placeholder.setAttribute('data-original-type', type);
    
    // Get some info about what was removed
    let title = '';
    let description = '';
    
    if (element) {
      const titleEl = element.querySelector('h1, h2, h3, h4, h5, h6');
      const linkEl = element.querySelector('a[href]');
      const descEl = element.querySelector('.s, [data-content-feature], .st');
      
      if (titleEl) title = titleEl.textContent.trim();
      if (linkEl && !title) {
        try {
          const url = new URL(linkEl.href);
          title = url.hostname;
        } catch (e) {
          title = 'Unknown site';
        }
      }
      if (descEl) {
        description = descEl.textContent.trim().substring(0, 100) + '...';
      }
    }
    
    // Style the placeholder
    placeholder.style.cssText = `
      margin: 8px 0;
      padding: 12px 16px;
      border-left: 4px solid #e0e0e0;
      background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 100%);
      border-radius: 0 8px 8px 0;
      font-family: "Times New Roman", serif;
      font-size: 13px;
      color: #5f6368;
      transition: all 0.2s ease;
      cursor: pointer;
      border: 1px solid #e8eaed;
    `;
    
    // Different colors for different types
    const typeColors = {
      'ai': '#1a73e8',
      'low-quality': '#ea4335', 
      'ad': '#fbbc04'
    };
    
    const typeLabels = {
      'ai': '🤖 AI Overview',
      'low-quality': '📚 Study Aid Site',
      'ad': '📢 Advertisement'
    };
    
    placeholder.style.borderLeftColor = typeColors[type] || '#e0e0e0';
    
    placeholder.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 4px; color: ${typeColors[type] || '#5f6368'};">
        ${typeLabels[type] || '🚫 Filtered Content'}
        <span style="float: right; font-size: 11px; opacity: 0.7;">Removed by Clean Search</span>
      </div>
      ${title ? `<div style="font-weight: 500; margin-bottom: 2px;">${title}</div>` : ''}
      ${description ? `<div style="font-size: 12px; opacity: 0.8;">${description}</div>` : ''}
      <div style="font-size: 11px; margin-top: 6px; opacity: 0.6;">
        Click to temporarily restore • Right-click for options
      </div>
    `;
    
    // Add hover effect
    placeholder.addEventListener('mouseenter', () => {
      placeholder.style.background = 'linear-gradient(135deg, #f1f3f4 0%, #e8eaed 100%)';
      placeholder.style.borderColor = typeColors[type] || '#dadce0';
    });
    
    placeholder.addEventListener('mouseleave', () => {
      placeholder.style.background = 'linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 100%)';
      placeholder.style.borderColor = '#e8eaed';
    });
    
    // Click to temporarily restore
    placeholder.addEventListener('click', (e) => {
      e.preventDefault();
      if (element.parentNode) {
        element.style.display = '';
        element.style.opacity = '0.7';
        element.style.filter = 'grayscale(50%)';
        placeholder.style.display = 'none';
        
        // Auto-hide again after 10 seconds
        setTimeout(() => {
          if (element.parentNode) {
            element.style.display = 'none';
            placeholder.style.display = 'block';
          }
        }, 10000);
      }
    });
    
    // Right-click menu
    placeholder.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showPlaceholderMenu(e, placeholder, element, type);
    });
    
    return placeholder;
  }
  
  // Show context menu for placeholder
  function showPlaceholderMenu(event, placeholder, element, type) {
    // Remove any existing menus
    const existingMenu = document.querySelector('.clean-search-context-menu');
    if (existingMenu) existingMenu.remove();
    
    const menu = document.createElement('div');
    menu.className = 'clean-search-context-menu';
    menu.style.cssText = `
      position: fixed;
      z-index: 10000;
      background: white;
      border: 1px solid #dadce0;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-family: "Times New Roman", serif;
      font-size: 13px;
      min-width: 200px;
      overflow: hidden;
      left: ${event.clientX}px;
      top: ${event.clientY}px;
    `;
    
    const menuItems = [
      { text: 'Restore permanently', action: () => restorePermanently(placeholder, element, type) },
      { text: 'Restore for this session', action: () => restoreTemporarily(placeholder, element) },
      { text: 'Hide all placeholders', action: () => hideAllPlaceholders() },
      { text: 'Never filter this type', action: () => disableFilterType(type) }
    ];
    
    menuItems.forEach((item, index) => {
      const menuItem = document.createElement('div');
      menuItem.style.cssText = `
        padding: 8px 12px;
        cursor: pointer;
        border-bottom: ${index < menuItems.length - 1 ? '1px solid #f1f3f4' : 'none'};
        transition: background 0.1s ease;
      `;
      menuItem.textContent = item.text;
      
      menuItem.addEventListener('mouseenter', () => {
        menuItem.style.background = '#f8f9fa';
      });
      
      menuItem.addEventListener('mouseleave', () => {
        menuItem.style.background = 'white';
      });
      
      menuItem.addEventListener('click', () => {
        item.action();
        menu.remove();
      });
      
      menu.appendChild(menuItem);
    });
    
    document.body.appendChild(menu);
    
    // Remove menu when clicking elsewhere
    setTimeout(() => {
      document.addEventListener('click', function removeMenu() {
        menu.remove();
        document.removeEventListener('click', removeMenu);
      });
    }, 0);
  }
  
  // Placeholder menu actions
  function restorePermanently(placeholder, element, type) {
    if (element.parentNode) {
      element.style.display = '';
      element.style.opacity = '';
      element.style.filter = '';
      element.removeAttribute('data-removed');
      placeholder.remove();
    }
  }
  
  function restoreTemporarily(placeholder, element) {
    if (element.parentNode) {
      element.style.display = '';
      element.style.opacity = '0.8';
      element.style.filter = 'grayscale(30%)';
      placeholder.style.display = 'none';
    }
  }
  
  function hideAllPlaceholders() {
    document.querySelectorAll('.clean-search-placeholder').forEach(p => {
      p.style.display = 'none';
    });
  }
  
  function disableFilterType(type) {
    switch (type) {
      case 'ai':
        filterSettings.removeAiOverview = false;
        break;
      case 'low-quality':
        filterSettings.removeLowQualitySites = false;
        break;
      case 'ad':
        filterSettings.removeAds = false;
        break;
    }
    saveStats();
    
    // Show notification
    showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} filtering disabled`);
  }
  
  function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #1a73e8;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: "Times New Roman", serif;
      font-size: 13px;
      z-index: 10001;
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideIn 0.3s ease reverse';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Check if extension is enabled
  let extensionEnabled = true;
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get(['cleanSearchEnabled'], (result) => {
      extensionEnabled = result.cleanSearchEnabled !== false;
    });
  }

  // Academic search enhancement
  function enhanceSearchForAcademics() {
    // Only enhance if we're on a search page with a query
    const urlParams = new URLSearchParams(window.location.search);
    const currentQuery = urlParams.get('q');
    
    if (!currentQuery) return;
    
    // Don't modify if already academic terms present
    const academicTerms = ['site:edu', 'site:scholar.google.com', 'filetype:pdf', 'academic', 'research', 'study', 'journal'];
    const hasAcademicTerms = academicTerms.some(term => currentQuery.toLowerCase().includes(term.toLowerCase()));
    
    if (hasAcademicTerms) return;
    
    // Add academic enhancement to search
    const academicEnhancements = [
      'academic',
      'research', 
      'study',
      'site:edu OR site:scholar.google.com OR site:researchgate.net OR site:arxiv.org'
    ];
    
    // Create enhanced query
    const enhancedQuery = `${currentQuery} (${academicEnhancements.join(' OR ')})`;
    
    // Update URL without refreshing page
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('q', enhancedQuery);
    
    // Show academic mode indicator
    showAcademicModeIndicator(currentQuery, enhancedQuery);
  }
  
  function showAcademicModeIndicator(original, enhanced) {
    // Create academic mode notification
    const indicator = document.createElement('div');
    indicator.id = 'academic-mode-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: "Times New Roman", serif;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(30, 64, 175, 0.3);
      z-index: 10000;
      max-width: 300px;
      border: 1px solid rgba(255,255,255,0.2);
    `;
    
    indicator.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">🎓 Academic Mode Active</div>
      <div style="font-size: 11px; opacity: 0.9;">Search enhanced for scholarly results</div>
      <div style="margin-top: 8px; font-size: 10px; opacity: 0.7;">Click to modify search</div>
    `;
    
    indicator.addEventListener('click', () => {
      const searchBox = document.querySelector('input[name="q"], textarea[name="q"]');
      if (searchBox) {
        searchBox.value = enhanced;
        searchBox.focus();
      }
    });
    
    document.body.appendChild(indicator);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.style.opacity = '0';
        indicator.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
          if (indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
          }
        }, 300);
      }
    }, 5000);
  }

  // Low-quality and clutter sites to remove (minimal list - only homework cheating sites)
  const LOW_QUALITY_DOMAINS = [
    'sparknotes.com',
    'litcharts.com', 
    'shmoop.com',
    'cliffsnotes.com',
    'coursehero.com'
  ];

  // Content farm patterns (disabled for now to prevent false positives)
  const CONTENT_FARM_PATTERNS = [
    // Temporarily disabled to prevent over-removal
    // /\d+\s+weird\s+(tricks?|ways?)/i,
    // /doctors\s+hate\s+(this|him|her)/i,
    // /you\s+won'?t\s+believe\s+(what|this|number)/i,
    // /one\s+weird\s+trick/i,
    // /\d+\s+things?\s+that\s+will\s+(shock|amaze)\s+you/i
  ];

  // Text patterns that identify AI Overview content (ULTRA CONSERVATIVE)
  const AI_TEXT_PATTERNS = [
    /^ai overview$/i,
    /^overview from google$/i,
    /^generative ai is experimental$/i
    // Removed all other patterns to prevent false matches
  ];

  // CSS selectors for AI Overview containers (MINIMAL - only most specific)
  const AI_SELECTORS = [
    // Only keep the most specific and reliable selectors
    '[jscontroller="EYwa3d"]',
    '[jscontroller="g5dM4c"]', // New AI Overview format
    '[data-async-type="folsrch"]'
    // Removed all other selectors to prevent over-matching
  ];

  // CSS selectors for ads and promotional content
  const AD_SELECTORS = [
    '[data-text-ad]',
    '.ads-ad',
    '.commercial-unit-desktop-top',
    '.pla-unit',
    '.shopping-carousel',
    '.cu-container',
    '[data-ved*="shopping"]'
  ];

  // Attribute patterns for content identification
  const AI_ATTRIBUTES = [
    'data-async-type',
    'data-ved',
    'jscontroller'
  ];

  function isLowQualitySite(element) {
    if (!element || !filterSettings.removeLowQualitySites) return false;
    
    // Get the main link from this search result
    const mainLink = element.querySelector('a[href*="/url?"], a[href^="http"]');
    if (!mainLink) return false;
    
    let actualUrl = '';
    try {
      // Extract actual URL from Google's redirect
      if (mainLink.href.includes('/url?')) {
        const urlParams = new URLSearchParams(mainLink.href.split('/url?')[1]);
        actualUrl = decodeURIComponent(urlParams.get('q') || '');
      } else {
        actualUrl = mainLink.href;
      }
      
      if (!actualUrl || !actualUrl.startsWith('http')) return false;
      
      const urlObj = new URL(actualUrl);
      const hostname = urlObj.hostname.toLowerCase();
      
      // Check custom whitelist first
      if (filterSettings.customWhitelist && filterSettings.customWhitelist.length > 0) {
        const isCustomWhitelisted = filterSettings.customWhitelist.some(domain => {
          const cleanDomain = domain.toLowerCase();
          return hostname === cleanDomain || 
                 hostname === 'www.' + cleanDomain ||
                 hostname.endsWith('.' + cleanDomain);
        });
        
        if (isCustomWhitelisted) {
          return false; // Never remove custom whitelisted sites
        }
      }
      
      // EXTREMELY strict - only these exact domains
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
      
      // Only remove if hostname exactly matches one of these
      const isExactMatch = exactMatches.includes(hostname);
      
      return isExactMatch;
      
      return false;
      
    } catch (error) {
      // If URL parsing fails, don't remove
      return false;
    }
  }

  function isAdvertisement(element) {
    if (!element) return false;
    
    // Check for ad-specific selectors
    for (const selector of AD_SELECTORS) {
      try {
        if (element.matches && element.matches(selector)) {
          return true;
        }
      } catch (e) {
        // Ignore invalid selectors
      }
    }
    
    // Check for ad indicators in text or attributes (more conservative)
    const text = (element.textContent || '').toLowerCase();
    const className = (element.className || '').toLowerCase();
    
    // Be more specific about ad detection
    const isSponsored = text.includes('sponsored') && text.length < scanConfig.sponsoredTextLength;
    const isAd = (text.includes('advertisement') || className.includes('ads-ad')) && text.length < scanConfig.adTextLength;
    const hasAdAttribute = element.hasAttribute('data-text-ad') || element.hasAttribute('data-ad');
    
    return isSponsored || isAd || hasAdAttribute;
  }

  function containsAiText(element) {
    if (!element || !element.textContent) return false;
    
    const text = element.textContent.trim().toLowerCase();
    if (text.length === 0 || text.length > scanConfig.maxTextLength) return false;
    
    // EXTREMELY restrictive: only exact matches
    const exactPhrases = [
      'ai overview',
      'overview from google', 
      'generative ai is experimental'
    ];
    
    // Must contain exact phrase and be short enough to be a heading/label
    if (text.length < 100) {
      return exactPhrases.some(phrase => text.includes(phrase));
    }
    
    return false;
  }

  function hasAiAttributes(element) {
    if (!element || !element.attributes) return false;
    
    for (const attr of element.attributes) {
      const name = attr.name.toLowerCase();
      const value = attr.value.toLowerCase();
      
      // Check for specific AI-related attribute values
      if (name === 'jscontroller' && value === 'eywa3d') return true;
      if (name === 'data-async-type' && value === 'folsrch') return true;
      if (name === 'jsname' && value === 'dewkxc') return true;
      if (name === 'data-ved' && value.includes('ai')) return true;
      if (value.includes('ai overview')) return true;
    }
    
    return false;
  }

  function findElementContainer(element) {
    let current = element;
    let depth = 0;
    
    while (current && current !== document.body && depth < scanConfig.maxDepth) {
      // Check if current element matches AI selectors
      for (const selector of AI_SELECTORS) {
        try {
          if (current.matches && current.matches(selector)) {
            return current;
          }
        } catch (e) {
          // Ignore invalid selectors
        }
      }
      
      // Check for AI attributes
      if (hasAiAttributes(current)) {
        return current;
      }
      
      // Look for search result containers
      if (current.classList && (
        current.classList.contains('g') ||  // Standard search result
        current.classList.contains('yf') || // AI Overview container
        current.classList.contains('EYwa3d') ||
        current.classList.contains('commercial-unit-desktop-top') || // Ad container
        current.getAttribute('role') === 'complementary' ||
        current.hasAttribute('data-ved') // Google result container
      )) {
        return current;
      }
      
      // Check if this is a main result container by structure (more conservative)
      if (current.tagName === 'DIV' && current.children.length > 0) {
        const hasLink = current.querySelector('a[href*="/url?"], a[href*="http"]');
        const hasTitle = current.querySelector('h1, h2, h3');
        const hasDescription = current.querySelector('.s, [data-content-feature], .st');
        
        // Only consider it a result if it has link, title, AND description/content
        if (hasLink && hasTitle && (hasDescription || current.textContent.length > 100)) {
          return current;
        }
      }
      
      current = current.parentElement;
      depth++;
    }
    
    return element;
  }

  function removeElement(element, type = 'unknown') {
    if (!extensionEnabled || !element || element.hasAttribute('data-removed')) return;
    
    // Extra safety check for AI removal
    if (type === 'ai') {
      // Verify this really looks like AI content
      const text = (element.textContent || '').toLowerCase();
      if (!text.includes('ai overview') && 
          !text.includes('overview from google') && 
          !text.includes('generative ai')) {
        console.log('Blocked removal of element that doesn\'t contain AI indicators:', element);
        return; // Don't remove if it doesn't clearly contain AI text
      }
    }
    
    const container = findElementContainer(element);
    if (!container) return;
    
    try {
      // Mark as removed to prevent duplicate processing
      container.setAttribute('data-removed', 'true');
      container.setAttribute('data-removed-type', type);
      
      // Update statistics based on type
      switch (type) {
        case 'ai':
          stats.aiElementsRemoved++;
          break;
        case 'low-quality':
          stats.lowQualitySitesRemoved++;
          break;
        case 'ad':
          stats.adsRemoved++;
          break;
      }
      stats.totalElementsRemoved++;
      stats.lastScanTime = Date.now();
      saveStats();
      
      // Create replacement placeholder if enabled
      const placeholder = createReplacementPlaceholder(type, container);
      
      if (placeholder) {
        // Insert placeholder before hiding element
        container.parentNode.insertBefore(placeholder, container);
        
        // Simply hide the element instead of removing it
        container.style.display = 'none';
      } else {
        // Original removal behavior when placeholders disabled
        // Smooth fade out animation
        const duration = scanConfig.animationDuration;
        container.style.transition = `opacity ${duration}ms ease-out, height ${duration}ms ease-out, margin ${duration}ms ease-out`;
        container.style.opacity = '0';
        container.style.pointerEvents = 'none';
        container.style.overflow = 'hidden';
        
        // Remove after animation
        setTimeout(() => {
          try {
            if (container.parentNode) {
              container.style.height = '0px';
              container.style.margin = '0px';
              container.style.padding = '0px';
              
              setTimeout(() => {
                if (container.parentNode) {
                  container.parentNode.removeChild(container);
                }
              }, duration);
            }
          } catch (e) {
            // Fallback: hide the element
            container.style.display = 'none';
          }
        }, duration);
      }
      
      // Element removed silently
      
    } catch (error) {
      console.warn(`Error removing ${type} element:`, error);
    }
  }

  function scanForContent(root = document) {
    if (!extensionEnabled) return;
    
    // Track page processing
    if (root === document) {
      stats.pagesProcessed++;
      stats.lastScanTime = Date.now();
      saveStats();
    }
    
    try {
      // Remove AI Overview content if enabled
      if (filterSettings.removeAiOverview) {
        scanForAiContent(root);
      }
      
      // Remove low-quality sites if enabled
      if (filterSettings.removeLowQualitySites) {
        scanForLowQualitySites(root);
      }
      
      // Remove ads if enabled
      if (filterSettings.removeAds) {
        scanForAds(root);
      }
      
    } catch (error) {
      console.warn('Error scanning for content:', error);
    }
  }
  
  function scanForAiContent(root = document) {
    if (!filterSettings.removeAiOverview) return;
    
    try {
      // ONLY use text-based detection with strict controls
      // Disable aggressive selector matching entirely
      
      // Look for headings with AI text first (most reliable method)
      const headings = root.querySelectorAll('h1, h2, h3, h4');
      
      headings.forEach(heading => {
        if (heading.hasAttribute('data-removed')) return;
        
        const headingText = (heading.textContent || '').toLowerCase().trim();
        
        // ONLY match very specific AI Overview text
        const isAiHeading = headingText === 'ai overview' || 
                           headingText === 'overview from google' ||
                           headingText.includes('ai overview') && headingText.length < 50;
        
        if (isAiHeading) {
          // Find the container, but respect max depth setting
          let container = heading.closest('.g'); // Try standard search result first
          
          if (!container) {
            // Try to find parent container within depth limit
            let current = heading.parentElement;
            let depth = 0;
            
            while (current && current !== document.body && depth < scanConfig.maxDepth) {
              if (current.classList && (
                current.classList.contains('g') ||
                current.classList.contains('yf') ||
                current.hasAttribute('data-ved')
              )) {
                container = current;
                break;
              }
              current = current.parentElement;
              depth++;
            }
          }
          
          if (container && !container.hasAttribute('data-removed')) {
            // Double-check: make sure this container actually has AI content
            const containerText = (container.textContent || '').toLowerCase();
            if (containerText.includes('ai overview') || 
                containerText.includes('overview from google') ||
                containerText.includes('generative ai')) {
              removeElement(container, 'ai');
            }
          }
        }
      });
      
      // Fallback: check elements that explicitly have AI selectors
      const criticalSelectors = [
        '[jscontroller="EYwa3d"]',
        '[jscontroller="g5dM4c"]', // Current AI Overview format
        '[data-async-type="folsrch"]'
      ];
      
      criticalSelectors.forEach(selector => {
        try {
          const elements = root.querySelectorAll(selector);
          elements.forEach(el => {
            if (!el.hasAttribute('data-removed')) {
              // Additional verification
              const text = (el.textContent || '').toLowerCase();
              if (text.includes('ai overview') || text.includes('generative ai') || text.includes('overview from google')) {
                removeElement(el, 'ai');
              }
            }
          });
        } catch (e) {
          // Ignore invalid selectors
        }
      });
      
    } catch (error) {
      console.warn('Error scanning for AI content:', error);
    }
  }
  
  function scanForLowQualitySites(root = document) {
    if (!filterSettings.removeLowQualitySites) return;
    
    try {
      // Only scan Google search result containers with class 'g'
      const searchResults = root.querySelectorAll('.g');
      
      searchResults.forEach(result => {
        if (!result.hasAttribute('data-removed')) {
          if (isLowQualitySite(result)) {
            removeElement(result, 'low-quality');
          }
        }
      });
    } catch (error) {
      console.warn('Error scanning for low-quality sites:', error);
    }
  }
  
  function scanForAds(root = document) {
    try {
      // First, try direct ad selector matching
      AD_SELECTORS.forEach(selector => {
        try {
          const elements = root.querySelectorAll(selector);
          elements.forEach(el => {
            if (!el.hasAttribute('data-removed')) {
              removeElement(el, 'ad');
            }
          });
        } catch (e) {
          // Ignore invalid selectors
        }
      });
      
      // Then scan for ad patterns
      scanElementsForPattern(root, isAdvertisement, 'ad');
      
    } catch (error) {
      console.warn('Error scanning for ads:', error);
    }
  }
  
  function scanElementsForPattern(root, testFunction, type) {
    // For low-quality site detection, use the more specific function
    if (type === 'low-quality') {
      return; // Already handled in scanForLowQualitySites
    }
    
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode(node) {
          // Skip already processed nodes
          if (node.hasAttribute('data-removed')) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Focus on elements that might be search results or AI content
          if (node.tagName && /^(DIV|SPAN|P|H1|H2|H3|H4|H5|H6|SECTION|ARTICLE)$/i.test(node.tagName)) {
            // For AI detection, look for specific containers
            if (type === 'ai' && (node.classList.contains('g') || node.hasAttribute('data-ved'))) {
              return NodeFilter.FILTER_ACCEPT;
            }
            // For other types, be more general
            if (type !== 'ai') {
              return NodeFilter.FILTER_ACCEPT;
            }
          }
          
          return NodeFilter.FILTER_SKIP;
        }
      }
    );

    const elementsToCheck = [];
    let node;
    
    while ((node = walker.nextNode())) {
      elementsToCheck.push(node);
    }

    // Check each element with the test function
    elementsToCheck.forEach(element => {
      if (testFunction(element)) {
        removeElement(element, type);
      }
    });
  }

  // Set up mutation observer to handle dynamic content
  const observer = new MutationObserver((mutations) => {
    let shouldScan = false;
    
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Check if any added nodes might contain unwanted content
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Scan the new node
            scanForContent(node);
            shouldScan = true;
          }
        });
      }
    });
    
    // Occasional full scan for safety
    if (shouldScan) {
      setTimeout(() => scanForContent(), scanConfig.scanDelay);
    }
  });

  // Initialize
  function init() {
    // Initial scan
    scanForContent();
    
    // Start observing for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Additional scans after page load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => scanForContent(), scanConfig.initialScanDelay);
        setTimeout(() => scanForContent(), scanConfig.finalScanDelay); // Extra scan for slow loading content
      });
    } else {
      setTimeout(() => scanForContent(), scanConfig.initialScanDelay);
      setTimeout(() => scanForContent(), scanConfig.finalScanDelay);
    }
  }

  // Wait for body to be available
  if (document.body) {
    init();
  } else {
    const bodyObserver = new MutationObserver(() => {
      if (document.body) {
        bodyObserver.disconnect();
        init();
      }
    });
    
    bodyObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // Debug helpers (available in console)
  window.cleanSearchDebug = {
    scan: () => scanForContent(),
    scanAi: () => scanForAiContent(),
    scanLowQuality: () => scanForLowQualitySites(),
    scanAds: () => scanForAds(),
    disconnect: () => observer.disconnect(),
    reconnect: () => {
      observer.disconnect();
      init();
    },
    getStats: () => stats,
    getSettings: () => filterSettings,
    resetStats: () => {
      stats = {
        aiElementsRemoved: 0,
        lowQualitySitesRemoved: 0,
        adsRemoved: 0,
        totalElementsRemoved: 0,
        pagesProcessed: 0,
        sessionsCount: 1,
        lastScanTime: Date.now()
      };
      saveStats();
    },
    setEnabled: (enabled) => {
      extensionEnabled = enabled;
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ cleanSearchEnabled: enabled });
      }
    },
    updateSettings: (newSettings) => {
      filterSettings = { ...filterSettings, ...newSettings };
      
      // Update scan config if advanced scanning settings provided
      if (newSettings.advancedScanning) {
        scanConfig = { ...scanConfig, ...newSettings.advancedScanning };
        filterSettings.advancedScanning = { ...filterSettings.advancedScanning, ...newSettings.advancedScanning };
      }
      
      saveStats();
      
      // Handle academic mode toggle
      if (newSettings.academicMode !== undefined) {
        if (newSettings.academicMode) {
          enhanceSearchForAcademics();
        } else {
          // Remove academic mode indicator if present
          const indicator = document.getElementById('academic-mode-indicator');
          if (indicator) indicator.remove();
        }
      }
    },
    
    getScanConfig: () => scanConfig,
    updateScanConfig: (newConfig) => {
      scanConfig = { ...scanConfig, ...newConfig };
      filterSettings.advancedScanning = { ...filterSettings.advancedScanning, ...newConfig };
      saveStats();
      return scanConfig;
    },
    
    emergencyDisableAI: () => {
      filterSettings.removeAiOverview = false;
      saveStats();
      console.log('AI Overview removal EMERGENCY DISABLED');
      return 'AI removal disabled';
    },
    
    setUltraConservative: () => {
      scanConfig.maxDepth = 3;
      scanConfig.maxTextLength = 100;
      scanConfig.strictMatching = true;
      filterSettings.advancedScanning = { ...scanConfig };
      saveStats();
      console.log('Set to ultra-conservative mode');
      return scanConfig;
    },
    
    resetScanConfig: () => {
      scanConfig = {
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
      filterSettings.advancedScanning = { ...scanConfig };
      saveStats();
      return scanConfig;
    },
    toggleAcademicMode: () => {
      filterSettings.academicMode = !filterSettings.academicMode;
      saveStats();
      if (filterSettings.academicMode) {
        enhanceSearchForAcademics();
      }
      return filterSettings.academicMode;
    },
    togglePlaceholders: () => {
      filterSettings.showReplacementPlaceholders = !filterSettings.showReplacementPlaceholders;
      saveStats();
      
      if (filterSettings.showReplacementPlaceholders) {
        // Show any hidden placeholders
        document.querySelectorAll('.clean-search-placeholder').forEach(p => {
          p.style.display = 'block';
        });
      } else {
        // Hide all placeholders
        document.querySelectorAll('.clean-search-placeholder').forEach(p => {
          p.style.display = 'none';
        });
      }
      
      return filterSettings.showReplacementPlaceholders;
    },
    showPlaceholders: (show) => {
      filterSettings.showReplacementPlaceholders = show;
      saveStats();
      
      document.querySelectorAll('.clean-search-placeholder').forEach(p => {
        p.style.display = show ? 'block' : 'none';
      });
      
      return show;
    },
    enhanceSearch: () => enhanceSearchForAcademics(),
    isEnabled: () => extensionEnabled
  };
  
  // Keep legacy reference for compatibility
  window.debugAiRemover = window.cleanSearchDebug;

})();
