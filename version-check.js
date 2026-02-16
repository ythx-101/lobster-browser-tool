/**
 * 版本检查模块 - 启动时检查 GitHub 是否有新版本
 * 缓存结果（每天最多检查一次），失败静默
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

function checkForUpdate(repo) {
  try {
    // 读本地版本
    const pkg = require(path.join(__dirname, 'package.json'));
    const localVersion = pkg.version;
    if (!localVersion) return;

    // 检查缓存
    const cacheDir = path.join(os.homedir(), '.cache', 'openclaw-updates');
    fs.mkdirSync(cacheDir, { recursive: true });
    const cacheFile = path.join(cacheDir, `${repo.replace('/', '_')}.json`);

    const now = Date.now() / 1000;
    if (fs.existsSync(cacheFile)) {
      try {
        const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        if (now - (cache.checked_at || 0) < 86400) {
          if (cache.remote_version && cache.remote_version !== localVersion) {
            printUpdateNotice(localVersion, cache.remote_version, repo);
          }
          return;
        }
      } catch (e) {}
    }

    // 查 GitHub API（异步，不阻塞）
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${repo}/releases/latest`,
      headers: { 'User-Agent': 'lobster-browser-tool', 'Accept': 'application/vnd.github.v3+json' },
      timeout: 5000
    };

    const req = https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const remoteVersion = (json.tag_name || '').replace(/^v/, '');

          fs.writeFileSync(cacheFile, JSON.stringify({ checked_at: now, remote_version: remoteVersion }));

          if (remoteVersion && remoteVersion !== localVersion) {
            printUpdateNotice(localVersion, remoteVersion, repo);
          }
        } catch (e) {}
      });
    });

    req.on('error', () => {});
    req.on('timeout', () => req.destroy());

  } catch (e) {}
}

function printUpdateNotice(local, remote, repo) {
  const Y = '\x1b[33m', G = '\x1b[32m', B = '\x1b[1m', R = '\x1b[0m';
  console.log(`\n${Y}${B}⚠ 新版本可用!${R}`);
  console.log(`  当前: v${local}  →  最新: ${G}v${remote}${R}`);
  console.log(`  运行 ${B}git pull${R} 更新`);
  console.log(`  详情: https://github.com/${repo}/releases\n`);
}

module.exports = { checkForUpdate };
