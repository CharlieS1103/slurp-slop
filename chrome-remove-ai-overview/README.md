# SlopSlurp Chrome Extension# Remove Google AI Overview - Chrome Extension



Professional search results by slurping up AI Overview slop, low-quality sites, and advertisements from Google Search.A lightweight Chrome extension that automatically removes AI Overview sections from Google Search results, allowing you to see only traditional search results.



## Features## Features



- 🤖 **AI Overview Removal**: Removes Google's AI-generated summaries- ✅ **Automatic Detection**: Intelligently identifies and removes AI Overview content

- 📚 **Low-Quality Site Filtering**: Blocks SparkNotes, LitCharts, and other homework sites- ✅ **Real-time Monitoring**: Uses MutationObserver to catch dynamically loaded content  

- 📢 **Ad Blocking**: Removes sponsored results and shopping ads- ✅ **Multiple Triggers**: Detects AI content by text patterns, CSS selectors, and HTML attributes

- 🎓 **Academic Mode**: Enhances searches for scholarly research- ✅ **Global Support**: Works on all major Google domains (google.com, google.co.uk, etc.)

- ⚡ **Minimalist Mode**: Lightweight AI Overview removal only- ✅ **Smooth Animations**: Fade-out effect when removing AI content

- 🛡️ **Smart Auto-Disable**: Automatically disables when searching for filtered content- ✅ **Debug Tools**: Built-in debugging helpers for troubleshooting

- 📊 **Performance Stats**: Track what's been filtered per page- ✅ **User Interface**: Popup interface for manual scanning and status checking

- 🎨 **Site Whitelist**: Protect specific sites from filtering

## Installation (Developer Mode)

## Development

1. Open Chrome (or any Chromium-based browser like Edge)

### Prerequisites2. Navigate to `chrome://extensions` (or `edge://extensions` for Edge)

3. Enable **"Developer mode"** (toggle in top-right corner)

- Node.js 18+ and npm 9+4. Click **"Load unpacked"** and select this folder: `chrome-remove-ai-overview`

- Chrome browser for testing5. The extension icon should appear in your browser toolbar

6. Visit Google Search - AI Overview sections will be automatically removed!

### Setup

## How It Works

```bash

# Install dependenciesThe extension uses multiple detection methods:

npm install

### 1. **CSS Selectors**

# Start development mode with file watchingTargets specific HTML elements commonly used for AI Overview:

npm run dev- `[jscontroller="EYwa3d"]` - Main AI Overview controller

- `[data-async-type="folsrch"]` - AI content containers

# Build for production- `[jsname="dEwkXc"]` - AI Overview wrapper

npm run build

### 2. **Text Pattern Matching**

# Lint and format codeScans for these phrases (case-insensitive):

npm run lint- "AI Overview"

npm run format- "Overview from Google" 

- "Google AI"

# Package for distribution- "AI Response"

npm run package- "Dive deeper in AI mode"

```

### 3. **HTML Attributes**

### Available CommandsChecks for AI-specific attributes and values in the page HTML



| Command | Description |## Usage

|---------|-------------|

| `npm run build` | Production build with minification |### Automatic Operation

| `npm run build:dev` | Development build (no minification) |- The extension runs automatically on all Google search pages

| `npm run dev` | Development mode with file watching |- No user interaction required - AI Overview content is removed as it loads

| `npm run lint` | Check code for issues |

| `npm run lint:fix` | Auto-fix linting issues |### Manual Controls

| `npm run format` | Format code with Prettier |Click the extension icon in your toolbar to access:

| `npm run package` | Create distribution ZIP file |- **Scan Current Page**: Force a manual scan for AI content

| `npm run validate` | Run full validation (lint + build) |- **Show Debug Info**: View detection statistics in console

| `npm run size` | Check bundle sizes |- **Report Issue**: Link to report problems (when configured)

| `npm run clean` | Clean build directory |

### Debug Console

### Project StructureOpen browser DevTools and use these commands:

```javascript

```// Manual scan

slopslurp/window.debugAiRemover.scan()

├── manifest.json          # Extension manifest

├── popup.html             # Popup interface// Disconnect monitoring  

├── content-script.js      # Main filtering logicwindow.debugAiRemover.disconnect()

├── css/

│   └── popup.css          # Popup styles// Reconnect monitoring

├── js/window.debugAiRemover.reconnect()

│   ├── popup.js           # Popup functionality```

│   └── utils.js           # Shared utilities

├── icons/                 # Extension icons## Supported Google Domains

└── dist/                  # Built extension (generated)

```- google.com

- google.co.uk  

### Development Workflow- google.ca

- google.de

1. **Make Changes**: Edit source files in `js/`, `css/`, or root directory- google.fr

2. **Auto-Build**: Files are automatically rebuilt when changed (if using `npm run dev`)- google.it

3. **Test**: Load the `dist/` folder as an unpacked extension in Chrome- google.es

4. **Validate**: Run `npm run validate` before committing- google.com.au

5. **Package**: Use `npm run package` to create distribution ZIP- google.co.in

- google.co.jp

### Loading in Chrome

## Troubleshooting

1. Open `chrome://extensions/`

2. Enable "Developer mode"### AI Overview Still Appears?

3. Click "Load unpacked"1. Click the extension icon and try **"Scan Current Page"**

4. Select the `dist/` folder2. Open DevTools Console and run `window.debugAiRemover.scan()`

3. Refresh the page

### Build Output4. Check if the extension is enabled in `chrome://extensions`



- **Development**: `dist/` folder with unminified files### Extension Not Working?

- **Production**: `dist/` folder with minified files1. Verify you're on a Google search results page (not just google.com homepage)

- **Package**: `slopslurp-v2.1.0.zip` ready for Chrome Web Store2. Check that the extension is enabled and has permissions

3. Look for error messages in DevTools Console

## Installation4. Try disabling and re-enabling the extension



Download the latest release from the [Chrome Web Store](https://chrome.google.com/webstore) or load the extension manually from the releases page.### Performance Issues?

The extension is designed to be lightweight:

## Contributing- Only runs on Google domains

- Uses efficient DOM scanning techniques

1. Fork the repository- Minimal memory footprint

2. Create a feature branch- No background processes

3. Make your changes

4. Run `npm run validate`## Technical Details

5. Submit a pull request

- **Manifest Version**: 3 (latest Chrome extension format)

## License- **Permissions**: `scripting`, `activeTab` (minimal permissions required)

- **Content Script Timing**: Runs at `document_start` for early detection

MIT License - see LICENSE file for details.- **Browser Support**: Chrome, Edge, and other Chromium-based browsers

## Privacy & Security

- ✅ **No data collection**: Extension doesn't track or store any user data
- ✅ **No external requests**: Works entirely offline, no network calls
- ✅ **Minimal permissions**: Only requests necessary permissions
- ✅ **Local processing**: All content analysis happens locally in your browser

## Contributing

Found a bug or want to improve the extension?

1. Fork the repository
2. Make your changes  
3. Test thoroughly on various Google search queries
4. Submit a pull request

## Version History

### v1.0.1 (Current)
- Enhanced AI detection with multiple methods
- Added popup interface with manual controls
- Improved support for international Google domains
- Better error handling and debugging tools
- Smoother fade-out animations

### v1.0.0
- Initial release with basic AI Overview detection

## License

This project is provided as-is for educational and personal use. Use at your own risk. No warranty provided.

---

**Note**: This extension uses heuristic methods to detect AI Overview content. Google may change their HTML structure or labeling, which could require updates to the detection logic. The extension will be updated as needed to maintain compatibility.
