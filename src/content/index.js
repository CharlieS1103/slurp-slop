// Entry point for SLURPSLOP content script bundle
// Modules are loaded in order to ensure dependencies are available

// Core infrastructure
import './core/namespace.js';
import './core/config.js';
import './core/data.js';
import './core/selectors.js';
import './engine/utils.js';
import './core/constants.js';
import './core/settings.js';
import './ui/placeholders.js';
import './ui/layout.js';

// Feature modules 
import './features/index.js';

// Mode setup
import './modes/index.js';

// Initialization (must be last)
import './engine/init.js';
