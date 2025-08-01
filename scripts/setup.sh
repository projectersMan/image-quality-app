#!/bin/bash

# 图像质量AI分析应用 - 一键设置脚本

echo "🚀 开始设置图像质量AI分析应用..."

# 检查Node.js版本
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 请先安装Node.js (https://nodejs.org)"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"

# 安装依赖
echo "📦 安装项目依赖..."
if command -v pnpm &> /dev/null; then
    pnpm install
elif command -v yarn &> /dev/null; then
    yarn install
else
    npm install
fi

# 检查环境变量文件
if [ ! -f ".env.local" ]; then
    echo "📝 创建环境变量文件..."
    cp .env.example .env.local
    echo "⚠️  请编辑 .env.local 文件并填入你的API密钥"
else
    echo "✅ 环境变量文件已存在"
fi

# 安装Vercel CLI
echo "🔧 检查Vercel CLI..."
if ! command -v vercel &> /dev/null; then
    echo "📥 安装Vercel CLI..."
    npm install -g vercel
else
    echo "✅ Vercel CLI 已安装"
fi

echo ""
echo "🎉 设置完成！"
echo ""
echo "📋 接下来的步骤:"
echo "1. 编辑 .env.local 文件，填入你的API密钥"
echo "2. 运行 'npm run dev' 启动开发服务器"
echo "3. 测试功能正常后，运行 'vercel --prod' 部署到生产环境"
echo ""
echo "📖 详细部署指南请参阅 DEPLOYMENT.md"
echo ""