// Entry point for SlopSlurp content script bundle
// Modules are loaded in order to ensure dependencies are available

// Core infrastructure
import './core/namespace.js';
import './core/config.js';
import './core/data.js';
import './core/selectors.js';
import './core/utils.js';
import './core/layout.js';

// Feature modules
import './features/paa.js';
import './features/ai.js';
import './features/ads.js';
import './features/quality.js';

// Mode orchestration
import './modes/index.js';

// Initialization (must be last)
import './core/init.js';
