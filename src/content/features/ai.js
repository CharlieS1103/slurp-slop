// SlopSlurp AI content detection & removal module
(() => {
  const NS = (window.SlopSlurp = window.SlopSlurp || {});
  const {
    Logger,
    getFilterData,
    containsAiIndicator,
    containsAiOverviewHeading
  } = NS.utils || {};
  const { collectSnippetText } = NS;
  const SEL = NS.selectors;

  function hideAiModeInTopbar(extensionEnabled, hideAiModeButton) {
    if (!extensionEnabled || !hideAiModeButton) {
      return;
    }

    try {
      const aiModeButtons = Array.from(
        document.querySelectorAll(`${SEL.PAGE.topbarListItem} a`)
      ).filter(a => {
        const text = a.textContent.toLowerCase();
        return text.includes('ai mode');
      });

      aiModeButtons.forEach(button => {
        const listItem = button.closest(SEL.PAGE.topbarListItem);
        if (listItem && !listItem.hasAttribute('data-removed')) {
          listItem.style.display = 'none';
          listItem.setAttribute('data-removed', 'true');
          Logger?.debug('Hidden AI Mode button in topbar');
        }
      });
    } catch (error) {
      Logger?.error('Error hiding AI Mode button:', error);
    }
  }

  function removeAiBlocksBySelector(removeElement) {
    const filterData = getFilterData();
    filterData.aiSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          if (element.hasAttribute('data-removed')) {
            return;
          }
          const text = element.textContent || '';
          if (containsAiOverviewHeading(text) || containsAiIndicator(text)) {
            Logger?.debug('Found AI element with selector', { selector });
            if (typeof removeElement === 'function') {
              removeElement(element, 'ai');
            }
          }
        });
      } catch (error) {
        Logger?.error('Error with selector ' + selector, error);
      }
    });
  }

  function removeAiBlocksByHeadings(removeElement, isDangerousContainer) {
    const filterData = getFilterData();
    const headings = document.querySelectorAll(SEL.RESULTS.allHeadings);
    headings.forEach(heading => {
      const text = (heading.textContent || '').toLowerCase().trim();
      if (!text) {
        return;
      }

      if (!containsAiIndicator(text) && !containsAiOverviewHeading(text)) {
        return;
      }

      // Prefer the nearest ancestor matching explicit AI selectors
      let container = null;
      try {
        for (const selector of filterData.aiSelectors) {
          const candidate = heading.closest(selector);
          if (candidate && !candidate.hasAttribute('data-removed')) {
            container = candidate;
            break;
          }
        }
      } catch {}

      // Conservative fallbacks
      if (!container) {
        const candidates = (SEL.AI?.containers || []).map(sel =>
          heading.closest(sel)
        );
        container =
          candidates.find(el => el && !el.hasAttribute('data-removed')) || null;
      }

      if (container && !isDangerousContainer(container)) {
        Logger?.debug('Found AI content via heading detection', { text });
        if (typeof removeElement === 'function') {
          removeElement(container, 'ai');
        }
      }
    });
  }

  function removeAiResultsByContent(removeElement) {
    const searchResults = document.querySelectorAll(SEL.RESULTS.searchResult);
    searchResults.forEach(result => {
      if (result.hasAttribute('data-removed')) {
        return;
      }

      const headingText = (
        result.querySelector(SEL.RESULTS.heading)?.innerText || ''
      ).toLowerCase();
      const descriptionText = (
        collectSnippetText ? collectSnippetText(result) : ''
      ).toLowerCase();
      const ariaLabel = (result.getAttribute('aria-label') || '').toLowerCase();

      if (
        containsAiIndicator(headingText) ||
        containsAiIndicator(descriptionText) ||
        containsAiIndicator(ariaLabel)
      ) {
        Logger?.debug('Found AI content via result analysis');
        if (typeof removeElement === 'function') {
          removeElement(result, 'ai');
        }
      }
    });
  }

  // Export to namespace
  Object.assign(NS, {
    removeAiBlocksBySelector,
    removeAiBlocksByHeadings,
    removeAiResultsByContent,
    hideAiModeInTopbar
  });
})();
