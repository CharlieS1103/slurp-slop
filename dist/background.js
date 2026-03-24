// AI Model Rulesets configuration
// TODO: PIVOT TO USE THE ONES DEFINED IN CONSTANTS.JS
const RULESETS = {
  gemini: { title: 'Gemini', key: 'ruleset_gemini', enabled: 1 },
  chatgpt: { title: 'ChatGPT', key: 'ruleset_chatgpt', enabled: 1 },
  claude: { title: 'Claude', key: 'ruleset_claude', enabled: 1 },
  grok: { title: 'Grok', key: 'ruleset_grok', enabled: 1 },
  copilot: { title: 'Copilot', key: 'ruleset_copilot', enabled: 1},
  deepseek: { title: 'DeepSeek', key: 'ruleset_deepseek', enabled: 1 }
};

function updateRulesets(enableRulesetIds = [], disableRulesetIds = []) {
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
          'Rulesets updated',
          { enableRulesetIds, disableRulesetIds }
        );
      }
    }
  );
}

// Initialize rulesets on extension startup
chrome.runtime.onInstalled.addListener(() => {
  console.log('SlurpSlop background active');
  // Enable only Gemini by default
  updateRulesets(['ruleset_gemini'], ['ruleset_chatgpt', 'ruleset_claude', 'ruleset_grok', 'ruleset_deepseek']);
});

chrome.runtime.onStartup.addListener(() => {
  console.log('SlurpSlop background startup');
  // Ensure only Gemini is enabled on startup
  updateRulesets(['ruleset_gemini'], ['ruleset_chatgpt', 'ruleset_claude', 'ruleset_grok', 'ruleset_deepseek']);
});

if (chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') {
      return;
    }

    // If extension is toggled off, disable all rulesets
    if (Object.prototype.hasOwnProperty.call(changes, 'cleanSearchEnabled')) {
      const enabled = changes.cleanSearchEnabled.newValue !== false;
      if (!enabled) {
        updateRulesets([], Object.values(RULESETS).map(r => r.key));
      } else {
        // Keep Gemini enabled when extension is re-enabled (user can toggle others)
        updateRulesets(['ruleset_gemini'], []);
      }
    }
  });
}
