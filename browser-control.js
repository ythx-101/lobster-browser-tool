#!/usr/bin/env node
/**
 * Lobster Browser Tool - Zero-config Browser Control
 * A simple yet powerful CLI browser automation tool.
 * 
 * Usage:
 *   lobster-browser-tool start              - Start browser
 *   lobster-browser-tool stop               - Close browser
 *   lobster-browser-tool navigate <url>     - Navigate to URL
 *   lobster-browser-tool screenshot         - Take screenshot
 *   lobster-browser-tool analyze "<prompt>" - AI vision analysis
 *   lobster-browser-tool snapshot           - Get page snapshot
 *   lobster-browser-tool status             - View status
 *   lobster-browser-tool wait <selector>    - Wait for element visible
 *   lobster-browser-tool click <selector>   - Click element
 *   lobster-browser-tool type <selector> <text> - Type text
 */

const { chromium } = require('playwright');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Configuration
const CONFIG = {
  browserPath: process.env.CHROMIUM_PATH || '/usr/bin/chromium-browser',
  headless: process.env.HEADLESS !== 'false',  // Default to headless mode
  dataDir: path.join('/tmp', `lobster-browser-${Date.now()}`),
  port: 18791,
  stealth: true,
};

// Gemini API Key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Stealth patch script
const STEALTH_SCRIPT = `
// Playwright Stealth Patch - Manual Implementation
(() => {
  // Hide webdriver
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
  
  // Fake plugins
  Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  
  // Fake language
  Object.defineProperty(navigator, 'language', { get: () => 'en-US' });
  
  // Fake platform
  Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
  
  // Fake hardware concurrency
  Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
  
  // Fake device memory
  Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
  
  // Remove automation markers
  window.cdc_ = undefined;
  
  // Modify Chrome properties
  Object.defineProperty(navigator, 'chrome', { get: () => ({ runtime: {} }) });
  
  console.log('Stealth patch applied');
})();
`;

// State file
const STATE_FILE = path.join(CONFIG.dataDir, 'state.json');

class BrowserControl {
  constructor() {
    this.browser = null;
    this.page = null;
    this.loadState();
  }

  loadState() {
    try {
      if (fs.existsSync(STATE_FILE)) {
        const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        this.browserPath = state.browserPath || CONFIG.browserPath;
        this.dataDir = state.dataDir || CONFIG.dataDir;
      }
    } catch (e) {}
  }

  saveState(status = 'idle') {
    try {
      fs.mkdirSync(CONFIG.dataDir, { recursive: true });
      const state = {
        browserPath: this.browserPath || CONFIG.browserPath,
        dataDir: CONFIG.dataDir,
        status,
        lastActive: new Date().toISOString(),
      };
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    } catch (e) {
      console.error('Failed to save state:', e.message);
    }
  }

  // Check if browser executable exists
  async checkBrowser() {
    try {
      fs.accessSync(CONFIG.browserPath, fs.constants.X_OK);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Install browser if not found
  async installAndStart() {
    console.log('Browser not found or not executable.');
    console.log('Attempting to install Playwright Chromium...');
    
    try {
      execSync('npx playwright install chromium', { 
        stdio: 'inherit',
        timeout: 120000 
      });
      console.log('Browser installed successfully.');
      return true;
    } catch (e) {
      console.error('Failed to install browser:', e.message);
      return false;
    }
  }

  async start() {
    if (this.browser) {
      return { success: true, message: 'Browser already running' };
    }

    try {
      // Check if browser executable exists
      const browserExists = await this.checkBrowser();
      if (!browserExists) {
        const installed = await this.installAndStart();
        if (!installed) {
          return { 
            success: false, 
            error: 'Browser not found and automatic installation failed. Please run: npx playwright install chromium' 
          };
        }
      }

      console.log('Starting browser...');
      console.log(`Stealth: ${CONFIG.stealth ? 'enabled' : 'disabled'}`);
      console.log(`Mode: ${CONFIG.headless ? 'headless' : 'headed'}`);
      
      // Launch browser with userDataDir
      this.browser = await chromium.launchPersistentContext(CONFIG.dataDir, {
        headless: CONFIG.headless,
        executablePath: CONFIG.browserPath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
          '--window-size=1920,1080',
        ],
      });

      this.page = await this.browser.newPage();
      
      // Apply stealth patch
      if (CONFIG.stealth) {
        console.log('Applying stealth patch...');
        await this.page.addInitScript(STEALTH_SCRIPT);
      }

      this.saveState('running');
      console.log('Browser started successfully');
      console.log('Stealth patch applied');
      
      return { 
        success: true, 
        message: 'Browser started',
        dataDir: CONFIG.dataDir,
        browserPath: CONFIG.browserPath,
        stealth: CONFIG.stealth
      };
    } catch (e) {
      console.error('Failed to start browser:', e.message);
      return { success: false, error: e.message };
    }
  }

  async stop() {
    if (!this.browser) {
      return { success: true, message: 'Browser not running' };
    }

    try {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.saveState('stopped');
      console.log('Browser closed');
      return { success: true, message: 'Browser closed' };
    } catch (e) {
      console.error('Failed to close browser:', e.message);
      return { success: false, error: e.message };
    }
  }

  async navigate(url) {
    if (!this.page) {
      return { success: false, error: 'Browser not started. Run: lobster-browser-tool start' };
    }

    try {
      await this.page.goto(url, { waitUntil: 'networkidle' });
      console.log(`Navigated to: ${url}`);
      
      return {
        success: true,
        url,
        title: await this.page.title(),
      };
    } catch (e) {
      console.error(`Navigation failed: ${e.message}`);
      return { success: false, error: e.message };
    }
  }

  async screenshot(outputPath = '/tmp/screenshot.png') {
    if (!this.page) {
      return { success: false, error: 'Browser not started. Run: lobster-browser-tool start' };
    }

    try {
      // Ensure output directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      await this.page.screenshot({ path: outputPath, fullPage: true });
      const stats = fs.statSync(outputPath);
      console.log(`Screenshot saved: ${outputPath} (${stats.size} bytes)`);
      
      return { 
        success: true, 
        path: outputPath,
        size: stats.size
      };
    } catch (e) {
      console.error(`Screenshot failed: ${e.message}`);
      return { 
        success: false, 
        error: e.message,
        hint: 'Check if browser is running and page is loaded. Try navigating to a page first.'
      };
    }
  }

  async snapshot() {
    if (!this.page) {
      return { success: false, error: 'Browser not started. Run: lobster-browser-tool start' };
    }

    try {
      // Get AI-readable snapshot
      const content = await this.page.content();
      const title = await this.page.title();
      const url = this.page.url();
      
      // Extract main text content
      const bodyText = await this.page.evaluate(() => {
        return document.body.innerText.substring(0, 5000);
      });

      // Extract links
      const links = await this.page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
          .slice(0, 20)
          .map(a => ({ text: a.innerText.substring(0, 100), href: a.href }));
      });

      // Extract interactive elements
      const interactiveElements = await this.page.evaluate(() => {
        const elements = [];
        // Buttons
        document.querySelectorAll('button').forEach(el => {
          if (el.offsetParent !== null) {  // Only visible elements
            elements.push({ type: 'button', text: el.innerText.substring(0, 50), selector: getSelector(el) });
          }
        });
        // Inputs
        document.querySelectorAll('input').forEach(el => {
          if (el.offsetParent !== null) {
            elements.push({ type: 'input', placeholder: el.placeholder || '', selector: getSelector(el) });
          }
        });
        return elements.slice(0, 10);
      });

      function getSelector(el) {
        if (el.id) return `#${el.id}`;
        if (el.className && typeof el.className === 'string') {
          return `${el.tagName.toLowerCase()}.${el.className.split(' ')[0]}`;
        }
        return el.tagName.toLowerCase();
      }

      console.log('Snapshot generated');
      return {
        success: true,
        url,
        title,
        content: bodyText,
        links,
        interactiveElements,
      };
    } catch (e) {
      console.error(`Snapshot failed: ${e.message}`);
      return { success: false, error: e.message };
    }
  }

  async status() {
    const running = !!this.browser;
    let url = null;
    let title = null;
    
    if (this.page) {
      try {
        url = this.page.url();
        title = await this.page.title();
      } catch (e) {}
    }

    return {
      success: true,
      running,
      url,
      title,
      browserPath: CONFIG.browserPath,
      dataDir: CONFIG.dataDir,
      config: CONFIG,
    };
  }

  async analyze(prompt = "Analyze this page") {
    if (!this.page) {
      return { success: false, error: 'Browser not started. Run: lobster-browser-tool start' };
    }

    try {
      // 1. Take screenshot
      const screenshotPath = '/tmp/screenshot-analysis.png';
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Screenshot saved: ${screenshotPath}`);

      // 2. Check for Gemini API key
      if (!GEMINI_API_KEY) {
        console.log('Gemini API key not configured. Using basic analysis.');
        return {
          success: true,
          prompt,
          analysis: `Screenshot available at: ${screenshotPath}\n\nTo enable AI analysis, set GEMINI_API_KEY environment variable.`,
          screenshot: screenshotPath,
          note: 'GEMINI_API_KEY not set - basic mode'
        };
      }

      // 3. Call Gemini Vision (JavaScript version)
      console.log('AI analyzing...');
      
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      // Read image as base64
      const imageBuffer = fs.readFileSync(screenshotPath);
      const base64Image = imageBuffer.toString('base64');

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Image,
            mimeType: 'image/png',
          },
        },
      ]);

      const analysis = result.response.text();
      console.log('Analysis complete');
      
      return {
        success: true,
        prompt,
        analysis: analysis.trim(),
        screenshot: screenshotPath
      };
    } catch (e) {
      console.error(`Analysis failed: ${e.message}`);
      return { success: false, error: e.message };
    }
  }

  async evaluate(script) {
    if (!this.page) {
      return { success: false, error: 'Browser not started. Run: lobster-browser-tool start' };
    }

    try {
      const result = await this.page.evaluate(script);
      return { success: true, result };
    } catch (e) {
      console.error(`Evaluation failed: ${e.message}`);
      return { success: false, error: e.message };
    }
  }

  // NEW: Wait for element to be visible
  async waitForVisible(selector, timeoutMs = 10000) {
    if (!this.page) {
      return { success: false, error: 'Browser not started. Run: lobster-browser-tool start' };
    }

    try {
      await this.page.waitForSelector(selector, { 
        state: 'visible', 
        timeout: timeoutMs 
      });
      console.log(`Element visible: ${selector}`);
      return { success: true, selector, message: 'Element is visible' };
    } catch (e) {
      console.error(`Wait for visible failed: ${e.message}`);
      return { 
        success: false, 
        error: e.message,
        hint: `Element ${selector} not found or not visible within ${timeoutMs}ms. Use snapshot to check page structure.`
      };
    }
  }

  // NEW: Click element (requires waitForVisible first)
  async click(selector) {
    if (!this.page) {
      return { success: false, error: 'Browser not started. Run: lobster-browser-tool start' };
    }

    try {
      await this.page.click(selector);
      console.log(`Clicked: ${selector}`);
      return { success: true, selector, message: 'Element clicked' };
    } catch (e) {
      console.error(`Click failed: ${e.message}`);
      return { 
        success: false, 
        error: e.message,
        hint: `Make sure to call waitForVisible("${selector}") first before clicking.`
      };
    }
  }

  // NEW: Type text (requires waitForVisible first)
  async type(selector, text) {
    if (!this.page) {
      return { success: false, error: 'Browser not started. Run: lobster-browser-tool start' };
    }

    try {
      await this.page.fill(selector, text);
      console.log(`Typed into: ${selector}`);
      return { success: true, selector, text, message: 'Text entered' };
    } catch (e) {
      console.error(`Type failed: ${e.message}`);
      return { 
        success: false, 
        error: e.message,
        hint: `Make sure to call waitForVisible("${selector}") first before typing.`
      };
    }
  }
}

// CLI Entry Point
async function main() {
  // 版本检查
  try { require("./version-check").checkForUpdate("ythx-101/lobster-browser-tool"); } catch(e) {}

  const args = process.argv.slice(2);
  const command = args[0] || 'status';
  const arg1 = args[1];
  const arg2 = args[2];

  const browser = new BrowserControl();

  switch (command) {
    case 'start':
      console.log('=== Start Browser ===');
      const startResult = await browser.start();
      console.log(JSON.stringify(startResult, null, 2));
      break;

    case 'stop':
      console.log('=== Close Browser ===');
      const stopResult = await browser.stop();
      console.log(JSON.stringify(stopResult, null, 2));
      break;

    case 'navigate':
      if (!arg1) {
        console.error('Usage: lobster-browser-tool navigate <url>');
        process.exit(1);
      }
      console.log(`=== Navigate to ${arg1} ===`);
      const navResult = await browser.navigate(arg1);
      console.log(JSON.stringify(navResult, null, 2));
      break;

    case 'screenshot':
      console.log('=== Take Screenshot ===');
      const screenResult = await browser.screenshot(arg1 || '/tmp/screenshot.png');
      console.log(JSON.stringify(screenResult, null, 2));
      break;

    case 'analyze':
      const analyzePrompt = arg1 || 'Analyze this page';
      console.log('=== AI Vision Analysis ===');
      console.log(`Prompt: ${analyzePrompt}`);
      const analyzeResult = await browser.analyze(analyzePrompt);
      console.log(JSON.stringify(analyzeResult, null, 2));
      break;

    case 'snapshot':
      console.log('=== Page Snapshot ===');
      const snapResult = await browser.snapshot();
      console.log(JSON.stringify(snapResult, null, 2));
      break;

    case 'status':
      console.log('=== Browser Status ===');
      const statusResult = await browser.status();
      console.log(JSON.stringify(statusResult, null, 2));
      break;

    case 'eval':
      if (!arg1) {
        console.error('Usage: lobster-browser-tool eval <script>');
        process.exit(1);
      }
      console.log('=== Execute Script ===');
      const evalResult = await browser.evaluate(arg1);
      console.log(JSON.stringify(evalResult, null, 2));
      break;

    // NEW: wait command
    case 'wait':
      if (!arg1) {
        console.error('Usage: lobster-browser-tool wait <selector> [timeoutMs]');
        process.exit(1);
      }
      console.log(`=== Wait for element visible: ${arg1} ===`);
      const waitResult = await browser.waitForVisible(arg1, parseInt(arg2) || 10000);
      console.log(JSON.stringify(waitResult, null, 2));
      break;

    // NEW: click command
    case 'click':
      if (!arg1) {
        console.error('Usage: lobster-browser-tool click <selector>');
        process.exit(1);
      }
      console.log(`=== Click element: ${arg1} ===`);
      const clickResult = await browser.click(arg1);
      console.log(JSON.stringify(clickResult, null, 2));
      break;

    // NEW: type command
    case 'type':
      if (!arg1 || !arg2) {
        console.error('Usage: lobster-browser-tool type <selector> <text>');
        process.exit(1);
      }
      console.log(`=== Type text into: ${arg1} ===`);
      const typeResult = await browser.type(arg1, arg2);
      console.log(JSON.stringify(typeResult, null, 2));
      break;

    case 'setup':
      console.log('=== Install Browser ===');
      try {
        execSync('npx playwright install chromium', { stdio: 'inherit' });
        console.log('Browser installed successfully');
      } catch (e) {
        console.error('Installation failed:', e.message);
        process.exit(1);
      }
      break;

    default:
      console.log('Lobster Browser Tool - Zero-config CLI Browser');
      console.log('');
      console.log('Usage:');
      console.log('  lobster-browser-tool start                   - Start browser');
      console.log('  lobster-browser-tool stop                    - Close browser');
      console.log('  lobster-browser-tool navigate <url>          - Navigate to URL');
      console.log('  lobster-browser-tool screenshot              - Take screenshot');
      console.log('  lobster-browser-tool analyze "<prompt>"      - AI vision analysis');
      console.log('  lobster-browser-tool snapshot                - Get page structure');
      console.log('  lobster-browser-tool status                  - View status');
      console.log('  lobster-browser-tool eval <script>           - Execute JS');
      console.log('  lobster-browser-tool wait <selector>         - Wait for element visible');
      console.log('  lobster-browser-tool click <selector>        - Click element');
      console.log('  lobster-browser-tool type <selector> <text>  - Type text');
      console.log('  lobster-browser-tool setup                   - Install browser');
      console.log('');
      console.log('Examples:');
      console.log('  lobster-browser-tool start');
      console.log('  lobster-browser-tool navigate https://google.com');
      console.log('  lobster-browser-tool wait "#search-button"');
      console.log('  lobster-browser-tool click "#search-button"');
      console.log('  lobster-browser-tool screenshot');
      console.log('  lobster-browser-tool analyze "What is on this page?"');
      console.log('  lobster-browser-tool status');
      console.log('');
      console.log('Environment Variables:');
      console.log('  CHROMIUM_PATH  - Browser path (default: /usr/bin/chromium-browser)');
      console.log('  GEMINI_API_KEY - Google Gemini API key for AI analysis');
      console.log('  HEADLESS       - Run in headless mode (default: true)');
      console.log('');
      console.log('If executable not found, run: npm run setup');
      break;
  }

  // Ensure browser is closed (cleanup)
  if (browser.browser) {
    console.log('\n[Cleanup] Closing browser...');
    await browser.stop();
  }
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
