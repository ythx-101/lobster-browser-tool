# 🦞 Lobster Browser Tool

零配置浏览器控制工具，简单且强大。

## 特性

- ✅ 零配置
- ✅ 内置 Stealth 反检测
- ✅ 持久登录支持
- ✅ 纯本地运行
- ✅ 轻量 CLI 工具

## 安装

```bash
npm install -g lobster-browser-tool
```

## 使用

```bash
lobster-browser-tool <命令>
```

### 命令列表

| 命令 | 说明 |
|------|------|
| `start` | 启动浏览器 |
| `stop` | 关闭浏览器 |
| `navigate <url>` | 访问页面 |
| `screenshot` | 截图 |
| `snapshot` | 获取页面结构 |
| `status` | 查看状态 |
| `analyze "<提示词>"` | AI 识图分析 |

## 示例

```bash
# 启动浏览器
lobster-browser-tool start

# 访问 Google
lobster-browser-tool navigate https://google.com

# 截图
lobster-browser-tool screenshot

# AI 分析页面
lobster-browser-tool analyze "这个页面是关于什么的？"
```

## 依赖

首次安装会自动安装 Playwright。如果需要手动安装：

```bash
npx playwright install chromium
```

## 架构

```
browser-control.js
├── Playwright Chromium
├── Stealth 补丁 (内置)
├── 命令解析器
└── 状态管理
```

## 灵感来源

看了 OpenClaw 项目后，自己领悟并生长的工具。

## License

MIT
