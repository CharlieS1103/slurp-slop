// AI Model Rulesets configuration
// TODO: PIVOT TO USE THE ONES DEFINED IN CONSTANTS.JS
const RULESETS = {
  gemini: { title: 'Gemini', key: 'ruleset_gemini', enabled: 1 },
  chatgpt: { title: 'ChatGPT', key: 'ruleset_chatgpt', enabled: 1 },
  claude: { title: 'Claude', key: 'ruleset_claude', enabled: 1 },
  grok: { title: 'Grok', key: 'ruleset_grok', enabled: 1 },
  deepseek: { title: 'DeepSeek', key: 'ruleset_deepseek', enabled: 1 }
};

function updateRulesets(shouldEnable) {
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
