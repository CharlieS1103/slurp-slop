// SlopSlurp DOM Selectors
// Centralized selector definitions for Google Search DOM elements
(() => {
  const NS = (window.SlopSlurp = window.SlopSlurp || {});
  NS.selectors = NS.selectors || {};

  // Core page structure
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
    'div[data-attrid]' // fallback
  ];

  // Ad-related
  const ADS = {
    indicators: '.g, [data-text-ad], [data-sokoban-feature]',
    fallbackContainers: [
      '.g',
      '[data-ved]',
      '[role="complementary"]',
      'div[jscontroller]'
    ]
  };

  // Links-only mode: non-organic content to remove
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
    NON_ORGANIC
  });
})();
