/**
 * 版本检查模块 - 启动时检查 GitHub 是否有新版本
 * 输出到 stderr，仅在交互终端显示，异步不阻塞
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

function checkForUpdate(repo) {
  try {
    // 非交互环境不显示
    if (!process.stderr.isTTY) return;

    const pkg = require(path.join(__dirname, 'package.json'));
    const localVersion = pkg.version;
    if (!localVersion) return;

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
  process.stderr.write(`\n${Y}${B}⚠ 新版本可用!${R}\n`);
  process.stderr.write(`  当前: v${local}  →  最新: ${G}v${remote}${R}\n`);
  process.stderr.write(`  运行 ${B}git pull${R} 更新\n`);
  process.stderr.write(`  详情: https://github.com/${repo}/releases\n\n`);
}

module.exports = { checkForUpdate };
