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

  function handlePlaceholderSettingChange(_enabled, _settings) {
    // Placeholder logic can be added here if needed
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
    handlePlaceholderSettingChange,
    removeAllPlaceholders
  });
})();
