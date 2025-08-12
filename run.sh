#!/bin/bash

# 图像质量AI分析应用启动脚本
echo "🚀 启动图像质量AI分析应用..."

# 检查Node.js环境
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

# 检查npm依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖包..."
    npm install
fi

# 启动开发服务器
echo "🌐 启动开发服务器..."
npm run dev