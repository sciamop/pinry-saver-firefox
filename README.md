# Pinry Saver - Firefox Addon

A Firefox browser extension for saving images directly to your Pinry instance with a clean, modern interface.

## Features

- **Right-Click Image Sharing**: Right-click on any image to save it to Pinry
- **Context Menu Integration**: Clean context menu option for images only
- **Settings Management**: Configure your Pinry server URL, API key, and optional default board ID
- **Toast Notifications**: Beautiful HTML overlay notifications for success/error feedback
- **Modern UI**: Clean, responsive interface with Pinry Saver branding and magenta color scheme
- **Fully Rounded Design**: 100% rounded corners on all form elements and buttons

## Installation

1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" in the sidebar
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from this directory

## Setup

1. Click the Pinry Saver icon in your toolbar
2. Configure your settings:
   - **Pinry Server URL**: Your Pinry instance URL (e.g., `https://your-pinry.com`)
   - **API Key**: Your Pinry API token (found in your Pinry settings)
   - **Default Board ID** (optional): Set a default board for saving images

## Usage

### Right-Click Image Sharing
1. Right-click on any image on a webpage
2. Select "Save to Pinry" from the context menu
3. The image will be saved to your Pinry instance
4. You'll see a toast notification confirming the save or showing any errors

### Settings Configuration
1. Click the Pinry Saver icon in your toolbar
2. Enter your Pinry URL and API key
3. Optionally set a default board ID for automatic board assignment
4. Click "Save Settings" to store your configuration

## API Requirements

This addon requires:
- Pinry instance with API v2 enabled
- Valid API token with write permissions
- CORS configured to allow requests from browser extensions

**Pinry Project**: [https://github.com/pinry/pinry](https://github.com/pinry/pinry)

## Technical Details

### Features
- **Image-Only Focus**: Designed specifically for saving images via right-click context menu
- **Toast Notifications**: Custom HTML overlay notifications instead of browser notifications
- **Settings Persistence**: Uses Firefox storage API to save configuration
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Branding**: Uses Pinry Saver branding with magenta color scheme (#FF42FF)

### UI Design
- **Header**: Centered 128x128px Pinry icon over gradient background
- **Form Elements**: 100% rounded corners on all inputs and buttons
- **Hover Effects**: Glow effect on button hover (no text movement)
- **Responsive**: Clean, modern interface that works on all screen sizes

## Development

The addon is built with:
- Manifest V2 (Firefox WebExtensions API)
- Vanilla JavaScript (no external dependencies)
- Modern CSS with responsive design and custom properties

### File Structure
```
├── manifest.json      # Addon configuration
├── popup.html         # Settings-only popup interface
├── popup.css          # Styling with magenta theme and rounded design
├── popup.js           # Settings management functionality
├── background.js      # Background script, context menu, and API calls
├── content.js         # Content script for page interaction
├── pinry-api.js       # Pinry API reference (for development)
├── icons/             # Addon icons (16px, 32px, 48px, 128px)
└── README.md          # This file
```

## License

MIT License - feel free to modify and distribute.

---

**GitHub Repository**: [https://github.com/sciamop/pinry-saver-firefox](https://github.com/sciamop/pinry-saver-firefox)
