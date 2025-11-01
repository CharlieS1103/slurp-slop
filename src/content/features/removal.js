// Aggressive AI overview neutralization. Converts the historic standalone
// script into a toggleable feature that can be switched on/off like other
// modes.
(() => {
  const NS = (window.SlurpSlop = window.SlurpSlop || {});
  const logger = NS.utils?.Logger;

  const state = {
    active: false,
    observers: [],
    domContentHandler: null,
    originalFetch: null,
    originalXhrOpen: null,
    fetchWrapped: false,
    xhrWrapped: false
  };

  const removedElements = new WeakSet();

  const removeWithStats = element => {
    if (!element || removedElements.has(element)) {
      return;
    }

    if (element.hasAttribute?.('data-slurpslop-removed')) {
      removedElements.add(element);
      return;
    }

    removedElements.add(element);

    if (typeof NS.removeElement === 'function') {
      NS.removeElement(element, 'ai');
      return;
    }

    if (element.remove) {
      element.remove();
    } else {
      try {
        element.style.display = 'none';
      } catch {}
    }

    if (typeof NS.updateStats === 'function') {
      NS.updateStats('aiElementsRemoved', 1);
    }
  };
  
  const containsAIGemini = value =>
    typeof value === 'string' &&
    (value.includes('ai_overview') || value.includes('gemini'));

  const neutralizeAI = () => {
    if (!state.active) {
      return;
    }

    document
      .querySelectorAll('[data-async-context*="ai_overview"]')
      .forEach(element => {
        const attr = element.getAttribute('data-async-context') || '';
        if (attr.includes('ai_overview:true')) {
          element.setAttribute(
            'data-async-context',
            attr.replace('ai_overview:true', '')
          );
        }
      });
  };

  const removeGeminiInstantly = () => {
    if (!state.active) {
      return;
    }

    document
      .querySelectorAll(
        '[data-async-context*="ai_overview"], [data-async-context*="gemini"]'
      )
      .forEach(removeWithStats);
  };

  const wrapFetch = () => {
    if (state.fetchWrapped || typeof window.fetch !== 'function') {
      return;
    }

    state.originalFetch = window.fetch;
    window.fetch = async function wrappedFetch(...args) {
      const target = args[0];
      const url =
        typeof target === 'string'
          ? target
          : target && typeof target === 'object' && 'url' in target
            ? target.url
            : '';

      if (containsAIGemini(url)) {
        logger?.info('Gemini fetch attempt blocked', { url });
      }

      return state.originalFetch.apply(this, args);
    };
    state.fetchWrapped = true;
  };

  const unwrapFetch = () => {
    if (!state.fetchWrapped || !state.originalFetch) {
      return;
    }

    window.fetch = state.originalFetch;
    state.fetchWrapped = false;
    state.originalFetch = null;
  };

  const wrapXhr = () => {
    if (state.xhrWrapped) {
      return;
    }

    // eslint-disable-next-line no-undef
    state.originalXhrOpen = XMLHttpRequest.prototype.open;
    // eslint-disable-next-line no-undef
    XMLHttpRequest.prototype.open = function wrappedOpen(...args) {
      const url = args[1] || '';
      if (containsAIGemini(url)) {
        logger?.info('Gemini XHR attempt blocked', { url });
      }
      return state.originalXhrOpen.apply(this, args);
    };
    state.xhrWrapped = true;
  };

  const unwrapXhr = () => {
    if (!state.xhrWrapped || !state.originalXhrOpen) {
      return;
    }

    // eslint-disable-next-line no-undef
    XMLHttpRequest.prototype.open = state.originalXhrOpen;
    state.xhrWrapped = false;
    state.originalXhrOpen = null;
  };

  const disconnectObservers = () => {
    state.observers.forEach(observer => observer.disconnect());
    state.observers = [];
  };

  const attachObservers = () => {
    const docEl = document.documentElement;
    if (!docEl) {
      return;
    }

    const neutralizeObserver = new MutationObserver(neutralizeAI);
    neutralizeObserver.observe(docEl, { childList: true, subtree: true });
    state.observers.push(neutralizeObserver);

    const removalObserver = new MutationObserver(removeGeminiInstantly);
    removalObserver.observe(docEl, { childList: true, subtree: true });
    state.observers.push(removalObserver);
  };

  const addDomContentListener = () => {
    const handler = () => removeGeminiInstantly();
    document.addEventListener('DOMContentLoaded', handler);
    state.domContentHandler = handler;
  };

  const removeDomContentListener = () => {
    if (state.domContentHandler) {
      document.removeEventListener('DOMContentLoaded', state.domContentHandler);
      state.domContentHandler = null;
    }
  };

  const enableAggressiveRemoval = () => {
    // if already enabled exit
    if (state.active) {
      return;
    }

    state.active = true;
    wrapFetch();
    wrapXhr();
    attachObservers();
    addDomContentListener();
    neutralizeAI();
    removeGeminiInstantly();
    logger?.info('Aggressive AI removal enabled');
  };

  const disableAggressiveRemoval = () => {
    // if already disabled exit
    if (!state.active) {
      return;
    }

    state.active = false;
    disconnectObservers();
    removeDomContentListener();
    unwrapFetch();
    unwrapXhr();
    logger?.info('Aggressive AI removal disabled');
  };

  const setAggressiveRemovalEnabled = enabled => {
    if (enabled) {
      enableAggressiveRemoval();
    } else {
      disableAggressiveRemoval();
    }
  };

  Object.assign(NS, {
    enableAggressiveRemoval,
    disableAggressiveRemoval,
    setAggressiveRemovalEnabled
  });
})();
