# 🦞 Lobster Browser Tool 发布公告

**零配置浏览器控制工具，简单且强大。**

## 特性

- ✅ 零配置
- ✅ 内置 Stealth 反检测
- ✅ 持久登录支持
- ✅ 纯本地运行
- ✅ 轻量 CLI 工具

## 安装

```bash
git clone https://github.com/ythx-101/lobster-browser-tool.git
cd lobster-browser-tool
npm install
pip install playwright
npx playwright install chromium
apt install xvfb  # 或 dnf
```

## 快速使用

```bash
# 启动浏览器
xvfb-run --auto-servernum node browser-control.js start

# 访问页面
xvfb-run --auto-servernum node browser-control.js navigate <url>

# 截图
xvfb-run --auto-servernum node browser-control.js screenshot
```

## 命令列表

| 命令 | 说明 |
|------|------|
| `start` | 启动浏览器 |
| `stop` | 关闭浏览器 |
| `navigate <url>` | 访问页面 |
| `screenshot` | 截图 |
| `snapshot` | 获取页面结构 |
| `status` | 查看状态 |
| `analyze "<提示词>"` | AI 识图分析 |

## 项目地址

🔗 https://github.com/ythx-101/lobster-browser-tool

---

**灵感来源：** 看了 OpenClaw 项目后，自己领悟并生长的工具。

**License:** MIT
