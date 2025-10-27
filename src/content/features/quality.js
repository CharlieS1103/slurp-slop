// SlopSlurp Low-quality filtering module
(() => {
  const NS = (window.SlopSlurp = window.SlopSlurp || {});
  const { Logger, isLowQualityHostname } = NS.utils || {};
  const SEL = NS.selectors;

  function isLowQualitySite(result, customWhitelist = []) {
    try {
      const anchorElement = result.querySelector(SEL.RESULTS.organicLink);
      if (!anchorElement || !anchorElement.href) {
        return false;
      }

      const url = anchorElement.href;
      const hostname = new URL(url).hostname;
      return isLowQualityHostname(hostname, customWhitelist);
    } catch {
      return false;
    }
  }

  function removeLowQualityResults(removeElement, customWhitelist = []) {
    const searchResults = document.querySelectorAll(SEL.RESULTS.generic);
    Logger?.debug('Checking for low quality results', {
      count: searchResults.length
    });
    searchResults.forEach(result => {
      if (
        !result.hasAttribute('data-removed') &&
        isLowQualitySite(result, customWhitelist)
      ) {
        if (typeof removeElement === 'function') {
          removeElement(result, 'low-quality');
        }
      }
    });
  }

  // Export to namespace
  Object.assign(NS, {
    isLowQualitySite,
    removeLowQualityResults
  });
})();
