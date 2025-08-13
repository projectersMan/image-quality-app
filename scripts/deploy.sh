#!/bin/bash

# 图像质量AI分析应用 - 一键部署脚本

echo "🚀 开始部署图像质量AI分析应用..."

# 检查环境变量
if [ ! -f "setenv.sh" ]; then
echo "❌ 错误: 请先创建 setenv.sh 文件并配置你的API密钥"
    exit 1
fi

# 检查必要的环境变量
if ! grep -q "REPLICATE_API_TOKEN=\"r8_" setenv.sh; then
    echo "⚠️  警告: REPLICATE_API_TOKEN 未配置或格式不正确"
fi

if ! grep -q "VITE_CLERK_PUBLISHABLE_KEY=\"pk_" setenv.sh; then
    echo "⚠️  警告: VITE_CLERK_PUBLISHABLE_KEY 未配置或格式不正确"
fi

# 构建项目
echo "📦 构建项目..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 构建失败，请检查错误信息"
    exit 1
fi

echo "✅ 构建成功"

# 检查Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "❌ 错误: 请先安装Vercel CLI (npm install -g vercel)"
    exit 1
fi

# 部署到Vercel
echo "🌐 部署到Vercel..."
vercel --prod

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 部署成功！"
    echo ""
    echo "📋 部署后检查清单:"
    echo "1. 在Vercel Dashboard中配置生产环境变量"
    echo "2. 测试网站功能是否正常"
    echo "3. 配置Stripe Webhook URL（如果使用支付功能）"
    echo ""
    echo "📖 详细指南请参阅 DEPLOYMENT.md"
else
    echo "❌ 部署失败，请检查错误信息"
    exit 1
fi