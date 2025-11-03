const RULESET_ID = 'ruleset_1';

function updateRuleset(shouldEnable) {
  const enableRulesetIds = shouldEnable ? [RULESET_ID] : [];
  const disableRulesetIds = shouldEnable ? [] : [RULESET_ID];

  chrome.declarativeNetRequest.updateEnabledRulesets(
    {
      enableRulesetIds,
      disableRulesetIds
    },
    () => {
      if (chrome.runtime.lastError) {
        console.warn(
          'Failed to update ruleset state',
          chrome.runtime.lastError
        );
      } else {
        console.log(
          `Ruleset ${shouldEnable ? 'enabled' : 'disabled'} via background`,
          { shouldEnable }
        );
      }
    }
  );
}

function applyRulesetFromSettings() {
  chrome.storage.local.get(
    ['cleanSearchEnabled', 'filterSettings'],
    ({ cleanSearchEnabled = true, filterSettings = {} }) => {
      const aggressiveMode = !!filterSettings.aggressiveMode;
      const extensionEnabled = cleanSearchEnabled !== false;
      updateRuleset(extensionEnabled && aggressiveMode);
    }
  );
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('SlurpSlop background active');
  applyRulesetFromSettings();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('SlurpSlop background startup');
  applyRulesetFromSettings();
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
      applyRulesetFromSettings();
    }
  });
}
