// SLURPSLOP UI Layout manager
(() => {
  const NS = (window.SlurpSlop = window.SlurpSlop || {});
  const { COLORS, Z, DURATIONS } = NS.constants;

  function showAutoDisableBanner(onReEnable) {
    const gradFrom = COLORS.bannerGradientFrom;
    const gradTo = COLORS.bannerGradientTo;
    const zBanner = Z.banner;
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
      background: linear-gradient(135deg, ${gradFrom} 0%, ${gradTo} 100%);
      color: white;
      padding: 12px 20px;
      text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: ${zBanner};
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      transition: all 0.3s ease;
    `;
    // todo: this banner is weak
    banner.innerHTML = `
      SlurpSlop temporarily disabled: Click to re-enable
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
  function showNotification(message, type = 'info') {
    const bg = type === 'success' ? COLORS.notifSuccessBg : COLORS.notifInfoBg;
    const zNotif = Z.notification;
    const slideMs = DURATIONS.notificationSlideMs;
    const notifMs = DURATIONS.notificationMs;
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${bg};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      z-index: ${zNotif};
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
      }, slideMs);
    }, notifMs);
  }

  // Export to namespace
  Object.assign(NS, {
    showAutoDisableBanner,
    showNotification
  });
})();
