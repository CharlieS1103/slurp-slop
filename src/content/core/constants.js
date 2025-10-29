// SLURPSLOP constants
// Centralized colors, z-indexes, durations for all UI
(() => {
  const NS = (window.SlurpSlop = window.SlurpSlop || {});
  NS.constants = NS.constants || {};

  /*
  DEFINE THEMES BOTH HERE AND IN POPUP>CSS
  */
  const THEMES = {
    default: {
      primary: '#007bff',
      primaryDark: '#3e1c1c',
      textMuted: '#c38080',
      textPrimary: '#f5f5f5',
      danger: '#e61b1b',
      textSecondary: '#2e2525',
      accent: '#430101',
      success: '#2db43d',
      info: '#f5f5f5'
    }
  };

  // Default theme
  const PALETTE = THEMES.default;

  // Content script UI colors
  // the uv styles are standardly sourced from google, but we define default vals just in case
  // any UI elements which exist outside the popup will get the colors passed in this way.
  const COLORS = {
    bannerGradientFrom: PALETTE.danger,
    bannerGradientTo: PALETTE.primaryDark,
    notifInfoBg: PALETTE.info,
    notifSuccessBg: PALETTE.success,
    placeholderBg: 'var(--uv-styles-color-tertiary, #303134)',
    placeholderBgHover: 'var(--uv-styles-color-secondary, #394457)',
    placeholderBorder: 'var(--uv-styles-color-outline, #3c4043)',
    textMuted: 'var(--uv-styles-color-text-de-emphasis, #9aa0a6)',
    textPrimary: 'var(--uv-styles-color-text-primary, #8ab4f8)'
  };

  const Z = {
    banner: 10000,
    notification: 10001
  };

  const DURATIONS = {
    notificationMs: 3000,
    notificationSlideMs: 300
  };

  Object.assign(NS.constants, { THEMES, PALETTE, COLORS, Z, DURATIONS });
})();
