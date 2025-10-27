// SlopSlurp Ads removal module
(() => {
  const NS = (window.SlopSlurp = window.SlopSlurp || {});
  const { Logger, getFilterData } = NS.utils || {};
  const { collectSnippetText } = NS;
  const SEL = NS.selectors;

  function removeAdvertisements(removeElement) {
    const filterData = getFilterData();
    Logger?.debug('Removing advertisements', {
      selectorCount: filterData.adSelectors.length
    });
    try {
      filterData.adSelectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(element => {
            const container = findAdContainer(element, filterData);
            if (container && typeof removeElement === 'function') {
              removeElement(container, 'ad');
            }
          });
        } catch (error) {
          Logger?.error('Error with ad selector ' + selector, error);
        }
      });

      const adIndicators = document.querySelectorAll(SEL.ADS.indicators);
      adIndicators.forEach(result => {
        if (result.hasAttribute('data-removed')) {
          return;
        }

        const combinedText = [
          result.querySelector(SEL.RESULTS.heading)?.innerText || '',
          collectSnippetText ? collectSnippetText(result) : '',
          result.getAttribute('aria-label') || ''
        ]
          .join(' ')
          .toLowerCase();

        const matches = filterData.adIndicatorLabels.some(label =>
          combinedText.includes(label)
        );

        if (matches) {
          const container = findAdContainer(result, filterData);
          if (typeof removeElement === 'function') {
            removeElement(container, 'ad');
          }
        }
      });
    } catch (error) {
      Logger?.error('Error removing advertisements', error);
    }
  }

  function findAdContainer(element, filterData) {
    if (!filterData) {
      filterData = getFilterData();
    }

    for (const selector of filterData.adSelectors) {
      const match = element.closest(selector);
      if (match && !match.hasAttribute('data-removed')) {
        return match;
      }
    }

    const fallbacks = SEL.ADS.fallbackContainers;
    for (const sel of fallbacks) {
      const fallback = element.closest(sel);
      if (fallback && !fallback.hasAttribute('data-removed')) {
        return fallback;
      }
    }

    return element;
  }

  // Export to namespace
  Object.assign(NS, {
    removeAdvertisements,
    findAdContainer
  });
})();
