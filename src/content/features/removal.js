// Slurp slop AI removal before it even has the chance to generate. glorified cock blocker
(() => {
    const neutralizeAI = () => {
        document.querySelectorAll('[data-async-context*="ai_overview"]').forEach(e => {
            e.setAttribute(
                "data-async-context",
                e.getAttribute("data-async-context").replace("ai_overview:true", "")
            );
        });
    };

    // Run once at script load
    neutralizeAI();

    // Run again whenever DOM mutates (SPA reloads)
    new MutationObserver(neutralizeAI)
        .observe(document.documentElement, { childList: true, subtree: true });

        // Monitoring fetch requests
    // Intercept fetch() calls
    const origFetch = window.fetch;
    window.fetch = async (...args) => {
        if (args[0].includes("ai_overview") || args[0].includes("gemini")) {
            console.log("Gemini fetch attempt:", args[0]);
        }
        return origFetch(...args);
    };

    // Intercept XHRs
    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (...args) {
        if (args[1].includes("ai_overview") || args[1].includes("gemini")) {
            console.log("Gemini XHR attempt:", args[1]);
        }
        return origOpen.apply(this, args);
    };

    const removeGeminiInstantly = () => {
        // Remove AI Overview containers as soon as possible
        document.querySelectorAll('[data-async-context*="ai_overview"], [data-async-context*="gemini"]').forEach(e => e.remove());
    };

    removeGeminiInstantly();

    // Run again during DOM mutations
    new MutationObserver(removeGeminiInstantly).observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    // Also neutralize async loading attributes
    document.addEventListener('DOMContentLoaded', removeGeminiInstantly);
})();
