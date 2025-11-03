// SLURPSLOP Modes module
// Handles minimalist, comprehensive, and links-only mode logic
(() => {
  const NS = (window.SlurpSlop = window.SlurpSlop || {});
  const { Logger, getFilterData, extractHostname, containsAiOverviewHeading } =
    NS.utils;
  const SEL = NS.selectors;

  /* header search can be optimized
  #search
    > div
      > div
        > div

        should theoretically get a list of possible search results 
        they should also have a data-rpos attribute for additional verification
        */

  // links-only mode

  function removeRightRailPanels(removeElement, isDangerousContainer) {
    const rhs = document.querySelector(SEL.PAGE.rightRail);
    if (
      rhs &&
      !rhs.hasAttribute('data-slurpslop-removed') &&
      !isDangerousContainer(rhs)
    ) {
      if (typeof removeElement === 'function') {
        removeElement(rhs, 'links-only');
      }
    }
  }

  function isOrganicResult(el) {
    try {
      const anchor = el.querySelector(SEL.RESULTS.organicLink);
      const hasH3 = !!el.querySelector(SEL.RESULTS.heading);
      if (!anchor || !hasH3) {
        return false;
      }
      const host = extractHostname(anchor.href);
      if (!host) {
        return false;
      }
      return !/(^|\.)google\./i.test(host);
    } catch {
      return false;
    }
  }

  function pruneNonOrganicModules(removeElement) {
    const rso = document.querySelector(SEL.PAGE.searchResults);
    if (!rso) {
      return;
    }

    const children = Array.from(rso.children);
    children.forEach(node => {
      if (node.hasAttribute('data-slurpslop-removed')) {
        return;
      }

      const moduleSelectors = SEL.NON_ORGANIC.modules;
      if (moduleSelectors.some(sel => node.querySelector(sel))) {
        if (typeof removeElement === 'function') {
          removeElement(node, 'links-only');
        }
        return;
      }

      if (node.querySelector(SEL.PAA.questionPair)) {
        if (typeof removeElement === 'function') {
          removeElement(node, 'links-only');
        }
        return;
      }

      const resultPattern = SEL.NON_ORGANIC.resultContainers;
      const candidate = node.matches(resultPattern)
        ? node
        : node.closest(SEL.RESULTS.generic) || node;
      if (!isOrganicResult(candidate)) {
        if (typeof removeElement === 'function') {
          removeElement(node, 'links-only');
        }
      }
    });
  }

  function enforceLinksOnlyLayout(removeElement, isDangerousContainer) {
    removeRightRailPanels(removeElement, isDangerousContainer);
    if (
      NS.removePeopleAlsoAskBlocksFully &&
      typeof NS.removePeopleAlsoAskBlocksFully === 'function'
    ) {
      NS.removePeopleAlsoAskBlocksFully(removeElement);
    }
    pruneNonOrganicModules(removeElement);
  }

  // MINIMALIST MODE!!!

  function runMinimalistScan(
    removeElement,
    isDangerousContainer,
    settings = {}
  ) {
    if (!settings.extensionEnabled) {
      Logger?.warn('Minimalist scan aborted: extension not enabled');
      return;
    }

    if (settings.hideAiModeButton && NS.hideAiModeInTopbar) {
      NS.hideAiModeInTopbar(
        settings.extensionEnabled,
        settings.hideAiModeButton
      );
    }

    const mainBody = document.querySelector(SEL.PAGE.mainContainer);
    const headings = Array.from(
      mainBody ? mainBody.querySelectorAll(SEL.RESULTS.allHeadings) : []
    );
    const aiHeading = headings.find(heading =>
      containsAiOverviewHeading(heading.innerText || heading.textContent)
    );

    if (aiHeading) {
      const filterData = getFilterData();
      let aiOverview = null;

      try {
        for (const selector of filterData.aiSelectors) {
          const cand = aiHeading.closest(selector);
          if (cand) {
            aiOverview = cand;
            break;
          }
        }
      } catch {}

      if (!aiOverview) {
        aiOverview =
          aiHeading.closest('g-section-with-header') ||
          aiHeading.closest('div[data-attrid*="ai"]') ||
          aiHeading.closest('div[data-sokoban-feature*="ai"]');
      }

      if (aiOverview && !isDangerousContainer(aiOverview)) {
        if (typeof removeElement === 'function') {
          removeElement(aiOverview, 'ai');
        }
      }
    }

    const headerTabs = document.querySelector(SEL.PAGE.headerTabs);
    if (headerTabs) {
      headerTabs.style.paddingBottom = '12px';
    }

    const mainElement = document.querySelector(SEL.PAGE.mainArea);
    if (mainElement) {
      mainElement.style.marginTop = '24px';
    }

    if (
      NS.removePeopleAlsoAskEntries &&
      typeof NS.removePeopleAlsoAskEntries === 'function'
    ) {
      NS.removePeopleAlsoAskEntries(removeElement, settings.customWhitelist);
    }
  }

  // COMPREHENSIVE MODE!!

  function scanForContent(
    removeElement,
    isDangerousContainer,
    settings = {},
    stats = {}
  ) {
    if (!settings.extensionEnabled) {
      Logger?.warn('Scan aborted: extension not enabled');
      return;
    }

    try {
      if (stats.scanCount !== undefined) {
        stats.scanCount++;
      }

      Logger?.debug('Scanning for content', {
        scanCount: stats.scanCount,
        minimalistMode: settings.minimalistMode,
        removeAiOverview: settings.removeAiOverview,
        removeLowQualitySites: settings.removeLowQualitySites,
        removeAds: settings.removeAds,
        linksOnlyMode: settings.linksOnlyMode
      });

      // Always run minimalist pass first
      runMinimalistScan(removeElement, isDangerousContainer, settings);
      if (settings.minimalistMode) {
        return;
      }

      if (settings.removeAiOverview) {
        Logger?.debug('Running AI overview removal');
        if (NS.removeAiBlocksBySelector) {
          NS.removeAiBlocksBySelector(removeElement);
        }
        if (NS.removeAiBlocksByHeadings) {
          NS.removeAiBlocksByHeadings(removeElement, isDangerousContainer);
        }
        if (NS.removeAiResultsByContent) {
          NS.removeAiResultsByContent(removeElement);
        }
        if (NS.removePeopleAlsoAskEntries) {
          NS.removePeopleAlsoAskEntries(
            removeElement,
            settings.customWhitelist
          );
        }
      }

      if (settings.linksOnlyMode) {
        Logger?.debug('Enforcing links-only layout');
        enforceLinksOnlyLayout(removeElement, isDangerousContainer);
      }

      if (settings.removeLowQualitySites && NS.removeLowQualityResults) {
        Logger?.debug('Removing low quality results');
        NS.removeLowQualityResults(removeElement, settings.customWhitelist);
      }

      if (settings.removeAds && NS.removeAdvertisements) {
        Logger?.debug('Removing advertisements');
        NS.removeAdvertisements(removeElement);
      }
    } catch (error) {
      Logger?.error('Error scanning for content', error);
    }
  }

  // Export to namespace
  Object.assign(NS, {
    runMinimalistScan,
    scanForContent,
    enforceLinksOnlyLayout,
    removeRightRailPanels,
    isOrganicResult,
    pruneNonOrganicModules
  });
})();
