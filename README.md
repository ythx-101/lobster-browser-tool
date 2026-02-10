# 🦞 Lobster Browser Tool

Zero-config browser control tool. Simple yet powerful.

## Features

- ✅ Zero configuration
- ✅ Built-in Stealth anti-detection
- ✅ Persistent login support
- ✅ Runs completely local
- ✅ Lightweight CLI tool
- ✅ AI Vision Analysis (Gemini)

## Installation

```bash
npm install -g lobster-browser-tool
```

### Setup

After installation, run the setup script to install Playwright Chromium:

```bash
# Auto install (recommended)
npm install -g lobster-browser-tool

# Or run setup manually
npx lobster-browser-tool setup
# or
npm run setup
# or
./install.sh
```

> **Note**: The `postinstall` script automatically calls `npx playwright install chromium` to ensure browser binaries are available.

> If executable not found, run: `npm run setup`

## Usage

```bash
lobster-browser-tool <command>
```

### Commands

| Command | Description |
|---------|-------------|
| `start` | Start browser |
| `stop` | Close browser |
| `navigate <url>` | Navigate to URL |
| `screenshot` | Take screenshot |
| `snapshot` | Get page structure |
| `status` | View status |
| `analyze "<prompt>"` | AI vision analysis |
| `setup` | Install browser |

## Examples

```bash
# Start browser
lobster-browser-tool start

# Navigate to Google
lobster-browser-tool navigate https://google.com

# Take screenshot
lobster-browser-tool screenshot

# AI analyze page
lobster-browser-tool analyze "What is this page about?"
lobster-browser-tool analyze "Extract all prices"
lobster-browser-tool analyze "What does this chart show?"
```

## Environment Variables

```bash
CHROMIUM_PATH  - Browser path (default: /usr/bin/chromium-browser)
GEMINI_API_KEY - Google Gemini API key for AI vision analysis
```

## Dependencies

Playwright is installed automatically. To install manually:

```bash
npx playwright install chromium
```

## Architecture

```
browser-control.js
├── Playwright Chromium
├── Stealth Patch (built-in)
├── Command Parser
└── State Management
```

## License

MIT
