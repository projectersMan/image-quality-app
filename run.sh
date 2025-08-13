#!/bin/bash

# 图像质量AI分析应用启动脚本
echo "🚀 启动图像质量AI分析应用..."

# 加载环境变量配置
if [ -f "setenv.sh" ]; then
    echo "📋 加载环境变量配置..."
    source setenv.sh
    
    # 验证关键环境变量
    if [ -z "$REPLICATE_API_TOKEN" ]; then
        echo "❌ 错误: REPLICATE_API_TOKEN 环境变量未设置"
        exit 1
    fi
    
    echo "✅ 环境变量已加载: REPLICATE_API_TOKEN=${REPLICATE_API_TOKEN:0:10}..."
else
    echo "⚠️  警告: setenv.sh 文件不存在，请创建并配置环境变量"
    exit 1
fi

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

# 检查本地API服务器是否已运行
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  端口3000已被占用，尝试停止现有进程..."
    pkill -f "node local-server.cjs" || true
    sleep 2
fi

# 启动本地API服务器（后台运行）
echo "🔧 启动本地API服务器..."
REPLICATE_API_TOKEN="$REPLICATE_API_TOKEN" \
CLERK_SECRET_KEY="$CLERK_SECRET_KEY" \
STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY" \
STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET" \
node local-server.cjs &

# 等待API服务器启动
echo "⏳ 等待API服务器启动..."
sleep 3

# 检查API服务器是否成功启动
if ! lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "❌ API服务器启动失败"
    exit 1
fi

echo "✅ API服务器已启动在 http://localhost:3000"

# 启动前端开发服务器
echo "🌐 启动前端开发服务器..."
VITE_CLERK_PUBLISHABLE_KEY="$VITE_CLERK_PUBLISHABLE_KEY" \
VITE_STRIPE_PUBLISHABLE_KEY="$VITE_STRIPE_PUBLISHABLE_KEY" \
VITE_STRIPE_PRICE_ID="$VITE_STRIPE_PRICE_ID" \
npm run dev

# 清理函数
cleanup() {
    echo "\n🛑 正在停止服务器..."
    pkill -f "node local-server.cjs" || true
    exit 0
}

# 捕获退出信号
trap cleanup SIGINT SIGTERM