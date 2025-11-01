chrome.runtime.onInstalled.addListener(() => {
  console.log("SlurpSlop background active");
  chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: ["ruleset_1"]
  });
});
