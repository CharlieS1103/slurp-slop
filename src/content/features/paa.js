// SlopSlurp PAA (People Also Ask) module
(() => {
  const NS = (window.SlopSlurp = window.SlopSlurp || {});
  const {
    Logger,
    getFilterData,
    extractHostname,
    isLowQualityHostname,
    containsAiIndicator,
    containsAiOverviewHeading
  } = NS.utils || {};
  const SEL = NS.selectors;

  function collectSnippetText(result) {
    const snippets = [];
    SEL.SNIPPETS.forEach(selector => {
      result.querySelectorAll(selector).forEach(node => {
        const text = node.textContent || '';
        if (text) {
          snippets.push(text);
        }
      });
    });
    return snippets.join(' ');
  }

  function removePeopleAlsoAskEntries(removeElement, customWhitelist = []) {
    const filterData = getFilterData();
    const questionPairs = document.querySelectorAll(SEL.PAA.questionPair);
    Logger?.debug('Found PAA question pairs', { count: questionPairs.length });

    // Track parent containers to check if they're empty after removal
    const paaContainers = new Set();

    questionPairs.forEach(pair => {
      if (!pair || pair.hasAttribute('data-clean-search-removed')) {
        return;
      }

      // Try to find container using centralized selectors
      let container = null;
      if (SEL.PAA?.containers) {
        for (const sel of SEL.PAA.containers) {
          container = pair.closest(sel);
          if (container) {
            break;
          }
        }
      }
      if (!container) {
        container = pair;
      }

      if (container.hasAttribute('data-clean-search-removed')) {
        return;
      }

      const textParts = [
        pair.getAttribute('data-q'),
        pair.getAttribute('data-lk'),
        pair.textContent
      ].filter(Boolean);

      const snippetText = collectSnippetText(container);
      if (snippetText) {
        textParts.push(snippetText);
      }

      const combinedText = textParts.join(' ').toLowerCase();

      const hasSgeAttribution = Array.from(
        container.querySelectorAll(SEL.PAA.attributionNodes)
      ).some(node => {
        const attrId = node.getAttribute('data-attrid');
        return Boolean(attrId && attrId.toLowerCase().includes('sge'));
      });

      // Explicit AI selector hits within the PAA answer area
      let hasAiSelectorHit = false;
      try {
        for (const selector of filterData.aiSelectors) {
          if (container.querySelector(selector)) {
            hasAiSelectorHit = true;
            break;
          }
        }
      } catch {}

      let hasLowQualityLink = false;
      const links = container.querySelectorAll('a[href^="http"]');
      links.forEach(link => {
        if (hasLowQualityLink) {
          return;
        }

        try {
          const hostname = extractHostname(link.href);
          if (isLowQualityHostname(hostname, customWhitelist)) {
            hasLowQualityLink = true;
          }
        } catch {
          // Ignore malformed URLs
        }
      });

      if (!hasLowQualityLink) {
        const attributionNodes = container.querySelectorAll(
          SEL.PAA.feedbackUrl
        );
        attributionNodes.forEach(node => {
          if (hasLowQualityLink) {
            return;
          }

          const fburl = node.getAttribute('data-fburl');
          if (!fburl) {
            return;
          }

          try {
            const hostname = extractHostname(fburl);
            if (isLowQualityHostname(hostname, customWhitelist)) {
              hasLowQualityLink = true;
            }
          } catch {
            // Ignore malformed URLs
          }
        });
      }

      const hasAiSignals =
        hasSgeAttribution ||
        hasAiSelectorHit ||
        containsAiIndicator(combinedText) ||
        containsAiOverviewHeading(combinedText);

      if (hasAiSignals || hasLowQualityLink) {
        const removalType = hasLowQualityLink ? 'low-quality' : 'ai';
        
        // Track the parent PAA container for later cleanup
        let paaContainer = null;
        for (const sel of SEL.PAA.containers) {
          paaContainer = container.closest(sel);
          if (paaContainer) {
            paaContainers.add(paaContainer);
            break;
          }
        }
        
        if (typeof removeElement === 'function') {
          removeElement(container, removalType);
        }
      }
    });

    // Clean up empty PAA containers
    paaContainers.forEach(paaContainer => {
      if (paaContainer.hasAttribute('data-clean-search-removed')) {
        return;
      }
      
      // Check if all question pairs inside are removed
      const remainingPairs = paaContainer.querySelectorAll(
        SEL.PAA.questionPair + ':not([data-clean-search-removed])'
      );
      
      if (remainingPairs.length === 0) {
        Logger?.debug('Removing empty PAA container');
        if (typeof removeElement === 'function') {
          removeElement(paaContainer, 'paa-container');
        }
      }
    });
    
    // Clean up entire PAA section if all entries removed
    // Look for PAA section containers using centralized selectors
    const paaSectionSelector = `${SEL.PAA.section} ${SEL.PAA.sectionController}`;
    const paaSection = document.querySelector(paaSectionSelector);
    if (paaSection && !paaSection.hasAttribute('data-clean-search-removed')) {
      const allPairs = paaSection.querySelectorAll(SEL.PAA.questionPair);
      const visiblePairs = Array.from(allPairs).filter(
        pair => !pair.hasAttribute('data-clean-search-removed')
      );
      
      if (allPairs.length > 0 && visiblePairs.length === 0) {
        // All PAA entries were removed, remove the entire section
        const fullSection = paaSection.closest(SEL.PAA.section);
        if (fullSection) {
          Logger?.debug('Removing entire empty PAA section');
          if (typeof removeElement === 'function') {
            removeElement(fullSection, 'paa-section');
          }
        }
      }
    }
  }

  function removePeopleAlsoAskBlocksFully(removeElement) {
    const pairs = document.querySelectorAll(SEL.PAA.questionPair);
    pairs.forEach(pair => {
      // Try AI container selectors first
      let container = null;
      if (SEL.AI.containers) {
        for (const sel of SEL.AI.containers) {
          container = pair.closest(sel);
          if (container) {
            break;
          }
        }
      }

      if (container && !container.hasAttribute('data-clean-search-removed')) {
        if (typeof removeElement === 'function') {
          removeElement(container, 'links-only');
        }
      }
    });
  }

  // Export to namespace
  Object.assign(NS, {
    removePeopleAlsoAskEntries,
    removePeopleAlsoAskBlocksFully,
    collectSnippetText
  });
})();
