// SlopSlurp Layout & UI module
// Handles notifications, banners, and placeholder management
(() => {
  const NS = (window.SlopSlurp = window.SlopSlurp || {});

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

    banner.innerHTML = `
      ⚠️ SlopSlurp temporarily disabled - Click to re-enable
      <small style="display: block; margin-top: 4px; opacity: 0.9; font-size: 12px;">
        Auto-disabled because your search might be looking for filtered content
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

    // Don't create duplicate placeholders
    const existingPlaceholder = element.parentNode?.querySelector(
      `[data-slopslurp-placeholder][data-for-element="${element.getAttribute('data-clean-search-type')}"]`
    );
    if (existingPlaceholder) {
      return;
    }

    const placeholder = document.createElement('div');
    placeholder.setAttribute('data-slopslurp-placeholder', 'true');
    placeholder.setAttribute('data-for-element', type);
    placeholder.style.cssText = `
      padding: 8px 12px;
      margin: 8px 0;
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
      placeholder.style.backgroundColor = 'var(--uv-styles-color-secondary, #394457)';
    });
    placeholder.addEventListener('mouseleave', () => {
      if (!placeholder._revealed) {
        placeholder.style.backgroundColor = 'var(--uv-styles-color-tertiary, #303134)';
      }
    });

    // Click to reveal functionality
    placeholder.addEventListener('click', () => {
      if (!placeholder._revealed) {
        // Show the element
        element.style.display = element.getAttribute('data-clean-search-original-display') || 'block';
        element.removeAttribute('data-removed');
        
        // Update placeholder
        placeholder.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
            <span style="color: var(--uv-styles-color-text-de-emphasis, #9aa0a6);">Content revealed</span>
            <span style="font-size: 12px; color: var(--uv-styles-color-text-primary, #8ab4f8);">Click to hide</span>
          </div>
        `;
        placeholder.style.backgroundColor = 'var(--uv-styles-color-secondary, #394457)';
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
        placeholder.style.backgroundColor = 'var(--uv-styles-color-tertiary, #303134)';
        placeholder._revealed = false;
      }
    });

    // Insert placeholder after the removed element
    if (element.parentNode) {
      element.parentNode.insertBefore(placeholder, element.nextSibling);
      
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
    const placeholders = document.querySelectorAll(
      '[data-slopslurp-placeholder]'
    );
    placeholders.forEach(p => p.remove());
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
