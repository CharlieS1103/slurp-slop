// SLURPSLOP constants
// Centralized colors, z-indexes, durations for all UI
(() => {
  const NS = (window.SlurpSlop = window.SlurpSlop || {});
  NS.constants = NS.constants || {};

  /* IMPORTANT!
  DEFINE THEMES BOTH HERE AND IN ../../css/popup.css
  */
  const THEMES = {
    light: {
      primary: '#20202b',
      primaryDark: '#20202b',
      secondary: '#e9e2bf',
      background: '#f3f1dc',
      textMuted: '#c2a890',
      textPrimary: '#20202b',
      danger: '#d21515',
      textSecondary: '#e9e2bf',
      accent: '#eae5d6',
      success: '#2db43d',
      info: '#f3f1dc',
      whitelist: {
        border: '#c2a890',
        background: '#eae5d6',
        hover: '#f5b3b3'
      }
    },
    dark: {
      primary: '#e9e2bf',
      primaryDark: '#20202b',
      secondary: '#20202b',
      background: '#20202b',
      textMuted: '#c2a890',
      textPrimary: '#e9e2bf',
      danger: '#d21515',
      textSecondary: '#3a3a46',
      accent: '#3a3a46',
      success: '#2db43d',
      info: '#20202b',
      whitelist: {
        border: '#c2a890',
        background: '#3a3a46',
        hover: '#643a3a'
      }
    }
  };

  // Default theme
  //use prefers color scheme query
  // kinda ironic that this is in constants given it's literally a let
  let palette = THEMES.light;
  if (
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    palette = THEMES.dark;
  }
  // Content script UI colors
  // the uv styles are standardly sourced from google, but we define default vals just in case
  // any UI elements which exist outside the popup will get the colors passed in this way.
  const COLORS = {
    bannerGradientFrom: palette.danger,
    bannerGradientTo: palette.primaryDark,
    notifInfoBg: palette.info,
    notifSuccessBg: palette.success,
    placeholderBg: 'var(--uv-styles-color-tertiary, #303134)',
    placeholderBgHover: 'var(--uv-styles-color-secondary, #394457)',
    placeholderBorder: 'var(--uv-styles-color-outline, #3c4043)',
    textMuted: 'var(--uv-styles-color-text-de-emphasis, #9aa0a6)',
    textPrimary: 'var(--uv-styles-color-text-primary, #8ab4f8)'
  };

  /* this stuff is sort of unecessary given how little we use banners/notifications,
  but figured it's nice to have*/
  const Z = {
    banner: 10000,
    notification: 10001
  };

  const DURATIONS = {
    notificationMs: 3000,
    notificationSlideMs: 300,
    placeholderRevealDurationMs: 10000,
    placeholderCountdownIntervalMs: 1000
  };

  // Default settings
  const DEFAULTS = {
    removeAiOverview: true,
    removeLowQualitySites: true,
    removeAds: true,
    minimalistMode: false,
    linksOnlyMode: false,
    aggressiveMode: false,
    hideAiModeButton: true,
    showReplacementPlaceholders: false,
    disableTermsEnabled: false,
    customWhitelist: []
  };

  // AI Model Rulesets
  const RULESETS = {
    gemini: {
      title: 'Gemini',
      key: 'ruleset_gemini',
      enabled: 1
    },
    chatgpt: {
      title: 'ChatGPT',
      key: 'ruleset_chatgpt',
      enabled: 1
    },
    claude: {
      title: 'Claude',
      key: 'ruleset_claude',
      enabled: 1
    },
    grok: {
      title: 'Grok',
      key: 'ruleset_grok',
      enabled: 1
    },
    deepseek: {
      title: 'DeepSeek',
      key: 'ruleset_deepseek',
      enabled: 1
    }
  };

  Object.assign(NS.constants, {
    THEMES,
    palette,
    COLORS,
    Z,
    DURATIONS,
    DEFAULTS,
    RULESETS
  });
})();
