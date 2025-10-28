// SlopSlurp Layout manager and such
// I(cole) can take all the todo's in here
// Handles notifications, banners, and placeholder management
(() => {
  const NS = (window.SlopSlurp = window.SlopSlurp || {});
  const SEL = NS.selectors || {};

  function showAutoDisableBanner(onReEnable) {
    const existingBanner = document.getElementById(
      'clean-search-auto-disable-banner'
    );
    if (existingBanner) {
      existingBanner.remove();
    }

    const banner = document.createElement('div');
    banner.id = 'clean-search-auto-disable-banner';
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #ff8c00 0%, #ff6600 100%);
      color: white;
      padding: 12px 20px;
      text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      transition: all 0.3s ease;
    `;
    // todo: this banner is weak
    banner.innerHTML = `
      SlopSlurp temporarily disabled: Click to re-enable
      <small style="display: block; margin-top: 4px; opacity: 0.9; font-size: 12px;">
         Auto-disabled because your search contained a 'disabling' term, check settings to toggle.
      </small>
    `;

    banner.addEventListener('click', () => {
      banner.remove();
      if (typeof onReEnable === 'function') {
        onReEnable();
      }
    });

    document.body.appendChild(banner);
  }
  // todo: standardize colors across ALL of our files, we'll need a colors.js file it'll be fine though
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#10b981' : '#3b82f6'};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      z-index: 10001;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;

    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);

    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  function createRemovalPlaceholder(element, type, settings) {
    if (!settings.showReplacementPlaceholders) {
      return;
    }

    // Skip placeholders for knowledge panel tab overview, it stretches all the way down the screen
    // messes with the whole layout
    if (element.matches && element.matches('.kp-wp-tab-overview')) {
      return;
    }

    // Skip placeholders for entire PAA sections when fully removed, otherwise it just sits there
    if (type === 'paa-section') {
      return;
    }

    // Skip placeholders for links-only mode removals it'd just get too messy
    if (type === 'links-only') {
      return;
    }

    // Don't create duplicates, if a placeholder container already follows this element just stop
    const next = element.nextElementSibling;
    if (next && next.matches && next.matches('[data-slopslurp-container]')) {
      return;
    }

    // Skip if any children already have placeholders (prevents parent placeholder when children do)
    const childContainers = element.querySelectorAll(
      '[data-slopslurp-container]'
    );
    if (childContainers.length > 0) {
      return;
    }

    // Skip if any ancestor already has a placeholder container (prevents nesting)
    let ancestor = element.parentElement;
    while (ancestor) {
      if (
        ancestor.nextElementSibling?.matches?.('[data-slopslurp-container]')
      ) {
        // Found ancestor with placeholder - merge into it by removing the ancestor's placeholder
        // and creating one for this child element instead (which is more specific/useful)
        const ancestorPlaceholder = ancestor.nextElementSibling;
        if (
          ancestorPlaceholder &&
          ancestorPlaceholder.matches('[data-slopslurp-container]')
        ) {
          ancestorPlaceholder.remove();
        }
        break;
      }
      ancestor = ancestor.parentElement;
    }

    // Create a placeholder container as a sibling after the hidden element.
    // This preserves the original DOM position (important for Google layout rules).
    const container = document.createElement('div');
    container.setAttribute('data-slopslurp-container', 'true');
    container.style.cssText = `
      display: block;
      margin: 8px 0;
      position: relative;
      max-width: 100%;
    `;

    // Clean up any inner wrappers from legacy code to avoid nesting
    try {
      const innerWrappers = element.querySelectorAll(
        '[data-slopslurp-wrapper]'
      );
      innerWrappers.forEach(w => {
        const innerEl = w.querySelector('[data-slopslurp-wrapped]');
        if (innerEl && w.parentNode) {
          innerEl.style.display = 'none';
          innerEl.setAttribute('data-removed', 'true');
          w.parentNode.replaceChild(innerEl, w);
        } else {
          w.remove();
        }
      });
    } catch {}

    const placeholder = document.createElement('div');
    // TODO: util funcs for attributes are probably necessary, it's hard to remember which is which
    placeholder.setAttribute('data-slopslurp-placeholder', 'true');
    placeholder.setAttribute('data-for-element', type);
    // TODO: colors for all of the below.
    placeholder.style.cssText = `
      padding: 8px 12px;
      background: var(--uv-styles-color-tertiary, #303134);
      border: 1px solid var(--uv-styles-color-outline, #3c4043);
      border-radius: 8px;
      font-family: 'Google Sans', Roboto, Arial, sans-serif;
      font-size: 13px;
      color: var(--uv-styles-color-text-de-emphasis, #9aa0a6);
      opacity: 0;
      animation: slopslurpFadeIn 0.2s ease forwards;
      cursor: pointer;
      transition: background-color 0.15s ease;
      user-select: none;
      display: inline-block;
      max-width: 100%;
      flex: 0 0 auto;
    `;

    placeholder.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
        <span style="color: var(--uv-styles-color-text-de-emphasis, #9aa0a6);">Content removed</span>
        <span style="font-size: 12px; color: var(--uv-styles-color-text-primary, #8ab4f8);">Click to reveal</span>
      </div>
    `;

    // Add animations if not already present
    if (!document.querySelector('style[data-slopslurp-animations]')) {
      const style = document.createElement('style');
      style.setAttribute('data-slopslurp-animations', 'true');
      style.textContent = `
        @keyframes slopslurpFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }

    // Hover effect
    placeholder.addEventListener('mouseenter', () => {
      placeholder.style.backgroundColor =
        'var(--uv-styles-color-secondary, #394457)';
    });
    placeholder.addEventListener('mouseleave', () => {
      if (!placeholder._revealed) {
        placeholder.style.backgroundColor =
          'var(--uv-styles-color-tertiary, #303134)';
      }
    });

    // Removed accordion hooks: placeholders now toggle content independently.

    // Click to reveal functionality
    placeholder.addEventListener('click', () => {
      setTimeout(() => {
        if (placeholder._revealed) {
          // TODO: should probs get this logic modular so don't have to repeat it
          // Hide the element again
          element.style.display = 'none';
          element.setAttribute('data-removed', 'true');

          // Restore original placeholder
          placeholder.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
            <span style="color: var(--uv-styles-color-text-de-emphasis, #9aa0a6);">Content removed</span>
            <span style="font-size: 12px; color: var(--uv-styles-color-text-primary, #8ab4f8);">Click to reveal</span>
          </div>
        `;
          placeholder.style.backgroundColor =
            'var(--uv-styles-color-tertiary, #303134)';
          placeholder._revealed = false;
        }
      }, 10000);

      if (!placeholder._revealed) {
        // Show the element
        element.style.display =
          element.getAttribute('data-clean-search-original-display') || 'block';
        element.removeAttribute('data-removed');

        // Update placeholder
        placeholder.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
            <span style="color: var(--uv-styles-color-text-de-emphasis, #9aa0a6);">Content revealed</span>
            <span style="font-size: 12px; color: var(--uv-styles-color-text-primary, #8ab4f8);">Click to hide</span>
          </div>
        `;
        placeholder.style.backgroundColor =
          'var(--uv-styles-color-secondary, #394457)';
        placeholder._revealed = true;
      } else {
        // Hide the element again
        element.style.display = 'none';
        element.setAttribute('data-removed', 'true');

        // Restore original placeholder
        placeholder.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
            <span style="color: var(--uv-styles-color-text-de-emphasis, #9aa0a6);">Content removed</span>
            <span style="font-size: 12px; color: var(--uv-styles-color-text-primary, #8ab4f8);">Click to reveal</span>
          </div>
        `;
        placeholder.style.backgroundColor =
          'var(--uv-styles-color-tertiary, #303134)';
        placeholder._revealed = false;
      }
    });

    // Insert placeholder container after the removed element, if you don't do this DOM will just blow up
    if (element.parentNode) {
      const parent = element.parentNode;
      parent.insertBefore(container, element.nextSibling);
      container.appendChild(placeholder);

      // Update stats
      if (NS.updateStats) {
        NS.updateStats('placeholdersCreated', 1);
      }
    }
  }

  function handlePlaceholderSettingChange(enabled, _settings) {
    if (!enabled) {
      removeAllPlaceholders();
    }
  }

  function removeAllPlaceholders() {
    const containers = document.querySelectorAll('[data-slopslurp-container]');
    containers.forEach(c => c.remove());
  }

  // Export to namespace
  Object.assign(NS, {
    showAutoDisableBanner,
    showNotification,
    createRemovalPlaceholder,
    handlePlaceholderSettingChange,
    removeAllPlaceholders
  });
})();
