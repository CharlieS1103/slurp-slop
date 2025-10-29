// SLURPSLOP constants
// Centralized colors, z-indexes, durations for all UI
(() => {
  const NS = (window.SlurpSlop = window.SlurpSlop || {});
  NS.constants = NS.constants || {};

  // Theme palettes
  const THEMES = {
    // Light - neutral, bright
    light: {
      primary: '#2563eb',        // Cold military blue
      primaryDark: '#1e40af',    // Deep tactical blue
      secondary: '#e5e7eb',      // Sterile gray
      secondaryDark: '#d1d5db',  // Darker sterile
      accent: '#10b981',         // System green
      accentDark: '#059669',     // Deep system green
      success: '#10b981',        // Operational green
      successAlt: '#34d399',     // Bright operational
      danger: '#ef4444',         // Alert red
      warning: '#f59e0b',        // Caution amber
      info: '#3b82f6',           // Information blue
      teal: '#14b8a6',           // Status cyan
      mode: 'light'
    },
    // Red - bold dark theme
    red: {
      primary: '#dc2626',        // Blood red
      primaryDark: '#991b1b',    // Deep crimson
      secondary: '#1e1e1e',      // Void black
      secondaryDark: '#0a0a0a',  // Deeper void
      accent: '#f59e0b',         // Warning amber
      accentDark: '#d97706',     // Deeper amber
      success: '#059669',        // Toxic green
      successAlt: '#10b981',     // Brighter toxic
      danger: '#dc2626',         // Critical red
      warning: '#f59e0b',        // Alert amber
      info: '#3b82f6',           // Cold blue
      teal: '#14b8a6',           // Cyan artifact
      mode: 'dark'
    },
    // Blue - cool, calm
    blue: {
      primary: '#06b6d4',        // Frozen cyan
      primaryDark: '#0891b2',    // Deep ice
      secondary: '#0c4a6e',      // Frozen void
      secondaryDark: '#082f49',  // Deeper freeze
      accent: '#67e8f9',         // Ice crystal
      accentDark: '#22d3ee',     // Bright ice
      success: '#10b981',        // Frost green
      successAlt: '#34d399',     // Pale frost
      danger: '#0ea5e9',         // Ice danger
      warning: '#38bdf8',        // Cold warning
      info: '#0284c7',           // Frozen data
      teal: '#06b6d4',           // Arctic teal
      mode: 'dark'
    },
    // Purple - dark purple accent
    purple: {
      primary: '#9333ea',        // Purple
      primaryDark: '#6b21a8',    // Deep purple
      secondary: '#161616',      // Dark surface
      secondaryDark: '#0e0e0e',  // Darker
      accent: '#f59e0b',         // Amber
      accentDark: '#d97706',     // Deep amber
      success: '#10b981',        // Green
      successAlt: '#34d399',     // Light green
      danger: '#db2777',         // Magenta danger
      warning: '#f59e0b',        // Amber
      info: '#60a5fa',           // Soft blue
      teal: '#14b8a6',           // Teal
      mode: 'dark'
    }
  };

  // Default to red theme (current)
  const PALETTE = THEMES.red;

  // Content script UI colors
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
