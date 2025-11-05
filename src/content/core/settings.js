// SLURPSLOP Settings Schema and Rules
// Single source of truth for defaults and enforcement (content side)
(() => {
  const NS = (window.SlurpSlop = window.SlurpSlop || {});
  NS.settings = NS.settings || {};
  const DEFAULTS = NS.constants.DEFAULTS;

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

    if (result.aggressiveMode && result.minimalistMode) {
      if (result.aggressiveMode && !oldSettings.aggressiveMode) {
        result.minimalistMode = false;
      } else if (result.minimalistMode && !oldSettings.minimalistMode) {
        result.aggressiveMode = false;
      } else {
        result.minimalistMode = false;
      }
    }

    // Minimalist constraints
    if (result.minimalistMode) {
      result.removeAiOverview = true;
      result.removeLowQualitySites = false;
      result.removeAds = false;
      result.showReplacementPlaceholders = false;
    }

    if (result.aggressiveMode) {
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
