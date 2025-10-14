# Remove Google AI Overview - Chrome Extension

A lightweight Chrome extension that automatically removes AI Overview sections from Google Search results, allowing you to see only traditional search results.

## Features

- ✅ **Automatic Detection**: Intelligently identifies and removes AI Overview content
- ✅ **Real-time Monitoring**: Uses MutationObserver to catch dynamically loaded content  
- ✅ **Multiple Triggers**: Detects AI content by text patterns, CSS selectors, and HTML attributes
- ✅ **Global Support**: Works on all major Google domains (google.com, google.co.uk, etc.)
- ✅ **Smooth Animations**: Fade-out effect when removing AI content
- ✅ **Debug Tools**: Built-in debugging helpers for troubleshooting
- ✅ **User Interface**: Popup interface for manual scanning and status checking

## Installation (Developer Mode)

1. Open Chrome (or any Chromium-based browser like Edge)
2. Navigate to `chrome://extensions` (or `edge://extensions` for Edge)
3. Enable **"Developer mode"** (toggle in top-right corner)
4. Click **"Load unpacked"** and select this folder: `chrome-remove-ai-overview`
5. The extension icon should appear in your browser toolbar
6. Visit Google Search - AI Overview sections will be automatically removed!

## How It Works

The extension uses multiple detection methods:

### 1. **CSS Selectors**
Targets specific HTML elements commonly used for AI Overview:
- `[jscontroller="EYwa3d"]` - Main AI Overview controller
- `[data-async-type="folsrch"]` - AI content containers
- `[jsname="dEwkXc"]` - AI Overview wrapper

### 2. **Text Pattern Matching**
Scans for these phrases (case-insensitive):
- "AI Overview"
- "Overview from Google" 
- "Google AI"
- "AI Response"
- "Dive deeper in AI mode"

### 3. **HTML Attributes**
Checks for AI-specific attributes and values in the page HTML

## Usage

### Automatic Operation
- The extension runs automatically on all Google search pages
- No user interaction required - AI Overview content is removed as it loads

### Manual Controls
Click the extension icon in your toolbar to access:
- **Scan Current Page**: Force a manual scan for AI content
- **Show Debug Info**: View detection statistics in console
- **Report Issue**: Link to report problems (when configured)

### Debug Console
Open browser DevTools and use these commands:
```javascript
// Manual scan
window.debugAiRemover.scan()

// Disconnect monitoring  
window.debugAiRemover.disconnect()

// Reconnect monitoring
window.debugAiRemover.reconnect()
```

## Supported Google Domains

- google.com
- google.co.uk  
- google.ca
- google.de
- google.fr
- google.it
- google.es
- google.com.au
- google.co.in
- google.co.jp

## Troubleshooting

### AI Overview Still Appears?
1. Click the extension icon and try **"Scan Current Page"**
2. Open DevTools Console and run `window.debugAiRemover.scan()`
3. Refresh the page
4. Check if the extension is enabled in `chrome://extensions`

### Extension Not Working?
1. Verify you're on a Google search results page (not just google.com homepage)
2. Check that the extension is enabled and has permissions
3. Look for error messages in DevTools Console
4. Try disabling and re-enabling the extension

### Performance Issues?
The extension is designed to be lightweight:
- Only runs on Google domains
- Uses efficient DOM scanning techniques
- Minimal memory footprint
- No background processes

## Technical Details

- **Manifest Version**: 3 (latest Chrome extension format)
- **Permissions**: `scripting`, `activeTab` (minimal permissions required)
- **Content Script Timing**: Runs at `document_start` for early detection
- **Browser Support**: Chrome, Edge, and other Chromium-based browsers

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
