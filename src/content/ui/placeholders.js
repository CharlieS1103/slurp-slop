// SLURPSLOP UI Placeholder utilities
(() => {
  const NS = (window.SlurpSlop = window.SlurpSlop || {});
  const { COLORS } = NS.constants;

  const ATTR = {
    container: 'data-slurpslop-container',
    placeholder: 'data-slurpslop-placeholder',
    wrapped: 'data-slurpslop-wrapped',
    wrapper: 'data-slurpslop-wrapper',
    originalDisplay: 'data-slurpslop-original-display',
    removed: 'data-slurpslop-removed',
    type: 'data-slurpslop-type'
  };

  function handlePlaceholderSettingChange(enabled) {
    if (!enabled) {
      removeAllPlaceholders();
    }
  }

  function removeAllPlaceholders() {
    const containers = document.querySelectorAll(`[${ATTR.container}]`);
    containers.forEach(c => c.remove());
  }

  function shouldCreatePlaceholder(element, type, settings) {
    if (!settings || !settings.showReplacementPlaceholders) {
      return false;
    }
    if (element && element.matches && element.matches('.kp-wp-tab-overview')) {
      return false;
    }
    if (type === 'paa-section' || type === 'links-only') {
      return false;
    }

    const next = element.nextElementSibling;
    if (next && next.matches && next.matches(`[${ATTR.container}]`)) {
      return false;
    }

    const childContainers = element.querySelectorAll(`[${ATTR.container}]`);
    if (childContainers.length > 0) {
      return false;
    }

    // Avoid stacking if an ancestor already has a placeholder
    let ancestor = element.parentElement;
    while (ancestor) {
      if (
        ancestor.nextElementSibling &&
        ancestor.nextElementSibling.matches &&
        ancestor.nextElementSibling.matches(`[${ATTR.container}]`)
      ) {
        const ancestorPlaceholder = ancestor.nextElementSibling;
        if (ancestorPlaceholder && ancestorPlaceholder.remove) {
          ancestorPlaceholder.remove();
        }
        break;
      }
      ancestor = ancestor.parentElement;
    }

    return true;
  }

  function createRemovalPlaceholder(element, type, settings) {
    if (!shouldCreatePlaceholder(element, type, settings)) {
      return;
    }

    const container = document.createElement('div');
    container.setAttribute(ATTR.container, 'true');
    container.style.cssText = `
      display: block;
      margin: 8px 0;
      position: relative;
      max-width: 100%;
    `;

    try {
      const innerWrappers = element.querySelectorAll(`[${ATTR.wrapper}]`);
      innerWrappers.forEach(w => {
        const innerEl = w.querySelector(`[${ATTR.wrapped}]`);
        if (innerEl && w.parentNode) {
          innerEl.style.display = 'none';
          innerEl.setAttribute(ATTR.removed, 'true');
          w.parentNode.replaceChild(innerEl, w);
        } else {
          w.remove();
        }
      });
    } catch {}

    const placeholder = document.createElement('div');
    placeholder.setAttribute(ATTR.placeholder, 'true');
    placeholder.setAttribute('data-for-element', type);
    placeholder.style.cssText = `
      padding: 8px 12px;
      background: ${COLORS.placeholderBg};
      border: 1px solid ${COLORS.placeholderBorder};
      border-radius: 8px;
      font-family: 'Google Sans', Roboto, Arial, sans-serif;
      font-size: 13px;
      color: ${COLORS.textMuted};
      opacity: 0;
      animation: slurpslopFadeIn 0.2s ease forwards;
      cursor: pointer;
      transition: background-color 0.15s ease;
      user-select: none;
      display: inline-block;
      max-width: 100%;
      flex: 0 0 auto;
    `;

    placeholder.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
        <span style="color: ${COLORS.textMuted};">Content removed</span>
        <span style="font-size: 12px; color: ${COLORS.textPrimary};">Click to reveal</span>
      </div>
    `;

    // Add animations if not already present
    if (!document.querySelector('style[data-slurpslop-animations]')) {
      const style = document.createElement('style');
      style.setAttribute('data-slurpslop-animations', 'true');
      style.textContent = `
        @keyframes slurpslopFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }

    // Hover effect
    placeholder.addEventListener('mouseenter', () => {
      placeholder.style.backgroundColor = COLORS.placeholderBgHover;
    });
    placeholder.addEventListener('mouseleave', () => {
      if (!placeholder._revealed) {
        placeholder.style.backgroundColor = COLORS.placeholderBg;
      }
    });

    // Click to reveal / hide
    placeholder.addEventListener('click', () => {
      setTimeout(() => {
        if (placeholder._revealed) {
          element.style.display = 'none';
          element.setAttribute(ATTR.removed, 'true');
          placeholder.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
              <span style="color: ${COLORS.textMuted};">Content removed</span>
              <span style="font-size: 12px; color: ${COLORS.textPrimary};">Click to reveal</span>
            </div>
          `;
          placeholder.style.backgroundColor = COLORS.placeholderBg;
          placeholder._revealed = false;
        }
      }, 10000);

      if (!placeholder._revealed) {
        const display = element.getAttribute(ATTR.originalDisplay) || 'block';
        element.style.display = display;
        element.removeAttribute(ATTR.removed);
        placeholder.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
            <span style="color: ${COLORS.textMuted};">Content revealed</span>
            <span style="font-size: 12px; color: ${COLORS.textPrimary};">Click to hide</span>
          </div>
        `;
        placeholder.style.backgroundColor = COLORS.placeholderBgHover;
        placeholder._revealed = true;
      } else {
        element.style.display = 'none';
        element.setAttribute(ATTR.removed, 'true');
        placeholder.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
            <span style="color: ${COLORS.textMuted};">Content removed</span>
            <span style="font-size: 12px; color: ${COLORS.textPrimary};">Click to reveal</span>
          </div>
        `;
        placeholder.style.backgroundColor = COLORS.placeholderBg;
        placeholder._revealed = false;
      }
    });

    if (element && element.parentNode) {
      const parent = element.parentNode;
      parent.insertBefore(container, element.nextSibling);
      container.appendChild(placeholder);
      if (NS.updateStats) {
        NS.updateStats('placeholdersCreated', 1);
      }
    }
  }

  Object.assign(NS, {
    createRemovalPlaceholder,
    handlePlaceholderSettingChange,
    removeAllPlaceholders
  });
})();
