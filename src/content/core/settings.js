// SLURPSLOP Settings Schema and Rules
// Single source of truth for defaults and enforcement (content side)
(() => {
  const NS = (window.SlurpSlop = window.SlurpSlop || {});
  NS.settings = NS.settings || {};

  const DEFAULTS = {
    removeAiOverview: true,
    removeLowQualitySites: true,
    removeAds: true,
    academicMode: false,
    minimalistMode: false,
    linksOnlyMode: false,
    hideAiModeButton: true,
    showReplacementPlaceholders: false,
    disableTermsEnabled: false,
    customWhitelist: []
  };

  function enforceSettingsRules(settings, oldSettings = {}) {
    const result = { ...DEFAULTS, ...settings };

    // mutually exclusive
    if (result.minimalistMode && result.linksOnlyMode) {
      if (result.minimalistMode && !oldSettings.minimalistMode) {
        result.linksOnlyMode = false;
      } else if (result.linksOnlyMode && !oldSettings.linksOnlyMode) {
        result.minimalistMode = false;
      } else {
        // default preference: prefer minimalist if both true without history
        result.linksOnlyMode = false;
      }
    }

    // Minimalist constraints
    if (result.minimalistMode) {
      result.removeAiOverview = true;
      result.removeLowQualitySites = false;
      result.removeAds = false;
      result.showReplacementPlaceholders = false;
    }

    // Links-only constraints
    if (result.linksOnlyMode) {
      result.showReplacementPlaceholders = false;
    }

    return result;
  }

  Object.assign(NS.settings, {
    DEFAULTS,
    enforceSettingsRules
  });
})();
