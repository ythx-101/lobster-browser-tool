#!/bin/bash
# 自动检测环境并安装 Playwright 浏览器

set -e

echo "🦞 Lobster Browser Tool - 安装脚本"
echo "===================================="

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js，请先安装 Node.js (v16+)"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未找到 npm，请先安装 npm"
    exit 1
fi

echo "✅ npm 版本: $(npm --version)"

# 安装依赖
echo ""
echo "📦 安装 npm 依赖..."
npm install

# 安装 Playwright Chromium
echo ""
echo "🎭 安装 Playwright Chromium 浏览器..."
npx playwright install chromium

echo ""
echo "===================================="
echo "✅ 安装完成!"
echo ""
echo "使用方法:"
echo "  lobster-browser-tool start     # 启动浏览器"
echo "  lobster-browser-tool navigate <url>  # 访问页面"
echo "  lobster-browser-tool status    # 查看状态"
echo ""
