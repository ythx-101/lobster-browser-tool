#!/usr/bin/env node
/**
 * Browser Control Tool for Clawdbot
 * 零配置浏览器控制，无需 Chrome 扩展
 * 
 * 用法:
 *   node tools/browser-control.js start          - 启动浏览器
 *   node tools/browser-control.js stop           - 关闭浏览器
 *   node tools/browser-control.js navigate <url> - 导航到 URL
 *   node tools/browser-control.js screenshot     - 截图
 *   node tools/browser-control.js analyze "<提示词>" - AI 识图分析
 *   node tools/browser-control.js snapshot       - 获取页面快照
 *   node tools/browser-control.js status         - 查看状态
 */

const { chromium } = require('playwright');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// 配置
const CONFIG = {
  browserPath: process.env.CHROMIUM_PATH || '/usr/bin/chromium-browser',
  headless: false,
  dataDir: path.join('/tmp', `clawdbot-browser-${Date.now()}`),
  port: 18791,
  stealth: true,
};

// 🔐 Stealth 补丁脚本
const STEALTH_SCRIPT = `
// Playwright Stealth 补丁 - 手动实现
(() => {
  // 隐藏 webdriver
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
  
  // 伪装插件
  Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  
  // 伪装语言
  Object.defineProperty(navigator, 'language', { get: () => 'en-US' });
  
  // 伪装平台
  Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
  
  // 伪装硬件并发
  Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
  
  // 伪装设备内存
  Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
  
  // 移除 automation 标记
  window.cdc_ = undefined;
  
  // 修改 Chrome 属性
  Object.defineProperty(navigator, 'chrome', { get: () => ({ runtime: {} }) });
  
  console.log('✅ Stealth 补丁已应用');
})();
`;

// 状态文件
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
      console.error('状态保存失败:', e.message);
    }
  }

  async start() {
    if (this.browser) {
      return { success: true, message: '浏览器已在运行' };
    }

    try {
      console.log('启动浏览器...');
      console.log(`🔐 Stealth: ${CONFIG.stealth ? '启用' : '禁用'}`);
      console.log(`🎯 模式: ${CONFIG.headless ? 'headless' : 'headed'}`);
      
      // 启动浏览器（使用 userDataDir 参数而非命令行参数）
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
      
      // 🔐 应用 stealth 补丁
      if (CONFIG.stealth) {
        console.log('🔐 应用 stealth 补丁...');
        await this.page.addInitScript(STEALTH_SCRIPT);
      }

      this.saveState('running');
      console.log('✅ 浏览器已启动');
      console.log('✅ Stealth 补丁已应用');
      
      return { 
        success: true, 
        message: '浏览器已启动',
        dataDir: CONFIG.dataDir,
        browserPath: CONFIG.browserPath,
        stealth: CONFIG.stealth
      };
    } catch (e) {
      console.error('❌ 启动失败:', e.message);
      return { success: false, error: e.message };
    }
  }

  async stop() {
    if (!this.browser) {
      return { success: true, message: '浏览器未运行' };
    }

    try {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.saveState('stopped');
      console.log('✅ 浏览器已关闭');
      return { success: true, message: '浏览器已关闭' };
    } catch (e) {
      console.error('关闭失败:', e.message);
      return { success: false, error: e.message };
    }
  }

  async navigate(url) {
    if (!this.page) {
      return { success: false, error: '浏览器未启动' };
    }

    try {
      await this.page.goto(url, { waitUntil: 'networkidle' });
      console.log(`✅ 已导航到: ${url}`);
      
      return {
        success: true,
        url,
        title: await this.page.title(),
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async screenshot(outputPath = '/tmp/screenshot.png') {
    if (!this.page) {
      return { success: false, error: '浏览器未启动' };
    }

    try {
      await this.page.screenshot({ path: outputPath, fullPage: true });
      console.log(`✅ 截图已保存: ${outputPath}`);
      return { success: true, path: outputPath };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async snapshot() {
    if (!this.page) {
      return { success: false, error: '浏览器未启动' };
    }

    try {
      // 获取 AI 可读的快照
      const content = await this.page.content();
      const title = await this.page.title();
      const url = this.page.url();
      
      // 提取主要文本内容
      const bodyText = await this.page.evaluate(() => {
        return document.body.innerText.substring(0, 5000);
      });

      // 提取链接
      const links = await this.page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
          .slice(0, 20)
          .map(a => ({ text: a.innerText.substring(0, 100), href: a.href }));
      });

      console.log('✅ 快照已生成');
      return {
        success: true,
        url,
        title,
        content: bodyText,
        links,
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async status() {
    const running = !!this.browser;
    return {
      success: true,
      running,
      browserPath: CONFIG.browserPath,
      dataDir: CONFIG.dataDir,
      config: CONFIG,
    };
  }

  async analyze(prompt = "分析这个页面") {
    if (!this.page) {
      return { success: false, error: '浏览器未启动' };
    }

    try {
      // 1. 截图
      const screenshotPath = '/tmp/screenshot-analysis.png';
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`📸 截图已保存: ${screenshotPath}`);

      // 2. 调用 Gemini Vision
      console.log(`🤖 AI 分析中...`);
      const geminiVisionPath = process.env.GEMINI_VISION_PATH || path.join(__dirname, 'gemini-vision.py');
      const cmd = `python3 "${geminiVisionPath}" "${screenshotPath}" "${prompt.replace(/"/g, '\\"')}"`;
      const result = execSync(cmd, { encoding: 'utf8', timeout: 60000 });
      
      console.log('✅ 分析完成');
      return {
        success: true,
        prompt,
        analysis: result.trim(),
        screenshot: screenshotPath
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async evaluate(script) {
    if (!this.page) {
      return { success: false, error: '浏览器未启动' };
    }

    try {
      const result = await this.page.evaluate(script);
      return { success: true, result };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

// CLI 入口
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';
  const arg1 = args[1];

  const browser = new BrowserControl();

  switch (command) {
    case 'start':
      console.log('=== 启动浏览器 ===');
      const startResult = await browser.start();
      console.log(JSON.stringify(startResult, null, 2));
      break;

    case 'stop':
      console.log('=== 关闭浏览器 ===');
      const stopResult = await browser.stop();
      console.log(JSON.stringify(stopResult, null, 2));
      break;

    case 'navigate':
      if (!arg1) {
        console.error('用法: node browser-control.js navigate <url>');
        process.exit(1);
      }
      console.log(`=== 导航到 ${arg1} ===`);
      const navResult = await browser.navigate(arg1);
      console.log(JSON.stringify(navResult, null, 2));
      break;

    case 'screenshot':
      console.log('=== 截图 ===');
      const screenResult = await browser.screenshot(arg1 || '/tmp/screenshot.png');
      console.log(JSON.stringify(screenResult, null, 2));
      break;

    case 'analyze':
      const analyzePrompt = arg1 || '分析这个页面的内容';
      console.log(`=== AI 识图分析 ===`);
      console.log(`提示词: ${analyzePrompt}`);
      const analyzeResult = await browser.analyze(analyzePrompt);
      console.log(JSON.stringify(analyzeResult, null, 2));
      break;

    case 'snapshot':
      console.log('=== 页面快照 ===');
      const snapResult = await browser.snapshot();
      console.log(JSON.stringify(snapResult, null, 2));
      break;

    case 'status':
      console.log('=== 浏览器状态 ===');
      const statusResult = await browser.status();
      console.log(JSON.stringify(statusResult, null, 2));
      break;

    case 'eval':
      if (!arg1) {
        console.error('用法: node browser-control.js eval <script>');
        process.exit(1);
      }
      console.log(`=== 执行脚本 ===`);
      const evalResult = await browser.evaluate(arg1);
      console.log(JSON.stringify(evalResult, null, 2));
      break;

    default:
      console.log('浏览器控制工具 - 零配置版本');
      console.log('');
      console.log('用法:');
      console.log('  node tools/browser-control.js start                   - 启动浏览器');
      console.log('  node tools/browser-control.js stop                    - 关闭浏览器');
      console.log('  node tools/browser-control.js navigate <url>          - 导航到 URL');
      console.log('  node tools/browser-control.js screenshot              - 截图');
      console.log('  node tools/browser-control.js analyze "<提示词>"      - AI 识图分析');
      console.log('  node tools/browser-control.js snapshot                - 页面快照');
      console.log('  node tools/browser-control.js status                  - 查看状态');
      console.log('  node tools/browser-control.js eval <script>           - 执行 JS');
      console.log('');
      console.log('AI 识图示例:');
      console.log('  node tools/browser-control.js analyze "总结页面内容"');
      console.log('  node tools/browser-control.js analyze "提取所有价格信息"');
      console.log('  node tools/browser-control.js analyze "这个图表说明了什么"');
      console.log('');
      console.log('环境变量:');
      console.log('  CHROMIUM_PATH  - 浏览器路径 (默认: /usr/bin/chromium-browser)');
      break;
  }

  // 确保浏览器关闭
  if (browser.browser) {
    await browser.stop();
  }
}

main().catch(e => {
  console.error('错误:', e.message);
  process.exit(1);
});
