// SLURPSLOP DOM Selectors
// try to keep this file neat and organized, it's super easy to let it get out of hand (trust me)
(() => {
  const NS = (window.SlurpSlop = window.SlurpSlop || {});
  NS.selectors = NS.selectors || {};

  // Core page structure,
  const PAGE = {
    mainContainer: 'div#rcnt',
    searchResults: '#rso',
    mainArea: '[role="main"], #search',
    rightRail: '#rhs, [role="complementary"]',
    headerTabs: 'div#hdtb-sc > div',
    topbarListItem: 'div[role="listitem"]'
  };

  // Search result containers
  const RESULTS = {
    generic: '.g',
    searchResult: '.g, [data-sokoban-feature]',
    organicLink: 'a[href^="http"]',
    heading: 'h3',
    allHeadings: 'h1, h2, h3'
  };

  // AI-related elements
  const AI = {
    containers: [
      'div.YzCcne[data-mcpr]',
      'div[data-attrid^="SrpGenSum"]',
      'div[jscontroller="EYwa3d"]',
      'div[jscontroller="qwbW4b"]',
      'div[jscontroller="i8S0p"]',
      'g-section-with-header',
      '[data-attrid*="ai"]',
      '[data-sokoban-feature*="ai"]',
      '[data-hveid]',
      'div[jscontroller]',
      '.g, .yf, [data-ved]',
      'div.cUnQKe'
    ],
    topbarButton: 'a' // within topbarListItem, filtered by text
  };

  // People Also Ask
  const PAA = {
    questionPair: 'div.related-question-pair',
    containers: ['.wQiwMc', '.g', '[data-ved]', '[data-hveid]'],
    section: '.A6K0A',
    sectionController: '.cUnQKe[jsname="bq0EGf"]',
    attributionNodes: '[data-attrid]',
    feedbackUrl: '[data-fburl]'
  };

  // Snippet/description selectors
  const SNIPPETS = [
    '.VwiC3b',
    '.yDYNvb',
    '.WKr5lb',
    '.kno-rdesc',
    '.MUxGbd',
    '.LGOjhe',
    '.hgKElc',
    '[data-content-feature]',
    '[data-sncf]',
    'div[data-attrid]'
  ];

  // Ad stuff
  const ADS = {
    indicators: ' [data-text-ad], [data-sokoban-feature]',
    fallbackContainers: ['[data-ved]', '[role="complementary"]']
  };

  // Protected containers we should never remove (for safety)
  const PROTECTED = {
    ids: ['rcnt', 'search', 'appbar', 'rso', 'res', 'center_col', 'cnt'],
    roles: ['main'],
    matchSelectors: ['#rso, #res, #center_col, #cnt, .mnr-c, .GLcBOb']
  };

  // Links-only mode selectors, luckily google links are kept organic in DOM so it's easy as hell
  const NON_ORGANIC = {
    modules: [
      'g-scrolling-carousel',
      'g-section-with-header',
      '[data-hveid] g-card',
      '[aria-label*="Videos" i]',
      '[aria-label*="Images" i]'
    ],
    resultContainers: '.g, [data-ved], [data-hveid]'
  };

  // Export to namespace
  Object.assign(NS.selectors, {
    PAGE,
    RESULTS,
    AI,
    PAA,
    SNIPPETS,
    ADS,
    PROTECTED,
    NON_ORGANIC
  });
})();
