// Import RULESETS from constants
const getRulesets = () => {
  return window.SlurpSlop.constants.RULESETS;
};

function updateRulesets(shouldEnable) {
  const RULESETS = getRulesets();
  const enableRulesetIds = shouldEnable
    ? Object.values(RULESETS).map(r => r.key)
    : [];
  const disableRulesetIds = shouldEnable
    ? []
    : Object.values(RULESETS).map(r => r.key);

  chrome.declarativeNetRequest.updateEnabledRulesets(
    {
      enableRulesetIds,
      disableRulesetIds
    },
    () => {
      if (chrome.runtime.lastError) {
        console.warn(
          'Failed to update rulesets state',
          chrome.runtime.lastError
        );
      } else {
        console.log(
          `Rulesets ${shouldEnable ? 'enabled' : 'disabled'} via background`,
          { shouldEnable, enableRulesetIds, disableRulesetIds }
        );
      }
    }
  );
}

function applyRulesetsFromSettings() {
  chrome.storage.local.get(
    ['cleanSearchEnabled', 'filterSettings'],
    ({ cleanSearchEnabled = true, filterSettings = {} }) => {
      const aggressiveMode = !!filterSettings.aggressiveMode;
      const extensionEnabled = cleanSearchEnabled !== false;
      updateRulesets(extensionEnabled && aggressiveMode);
    }
  );
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('SlurpSlop background active');
  applyRulesetsFromSettings();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('SlurpSlop background startup');
  applyRulesetsFromSettings();
});

if (chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') {
      return;
    }

    if (
      Object.prototype.hasOwnProperty.call(changes, 'filterSettings') ||
      Object.prototype.hasOwnProperty.call(changes, 'cleanSearchEnabled')
    ) {
      applyRulesetsFromSettings();
    }
  });
}
