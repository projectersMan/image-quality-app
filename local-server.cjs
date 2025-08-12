/**
 * 本地API服务器
 * 用于在开发环境中模拟Vercel API函数
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// 检查是否安装了必要的依赖
try {
  require('express');
  require('cors');
} catch (error) {
  console.error('❌ 缺少必要依赖，请运行: npm install express cors');
  process.exit(1);
}

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());

// JSON解析中间件，带错误处理
app.use(express.json({ 
  limit: '50mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// JSON解析错误处理
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    console.error('JSON解析错误:', error.message);
    return res.status(400).json({
      success: false,
      error: 'JSON格式错误',
      message: '请求体包含无效的JSON格式',
      details: error.message
    });
  }
  next();
});

// 日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// 模拟Vercel环境变量
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.VERCEL = false;

// 创建模拟的upscale处理函数
function createUpscaleHandler() {
  return (req, res) => {
    try {
      // 验证请求体
      if (!req.body) {
        return res.status(400).json({
          success: false,
          error: '请求体为空',
          message: '请提供有效的JSON数据'
        });
      }

      const { image, model = 'real-esrgan', scale = 2, face_enhance = false } = req.body;

      // 验证必需参数
      if (!image) {
        return res.status(400).json({
          success: false,
          error: '缺少图像数据',
          message: '请提供base64编码的图像数据'
        });
      }

      // 验证模型参数
      if (!['real-esrgan', 'aura-sr-v2'].includes(model)) {
        return res.status(400).json({
          success: false,
          error: '不支持的模型类型',
          message: '仅支持 real-esrgan 和 aura-sr-v2 模型'
        });
      }

      // 验证缩放参数
      if (![2, 4, 8].includes(scale)) {
        return res.status(400).json({
          success: false,
          error: '不支持的缩放倍数',
          message: '仅支持2x、4x、8x缩放'
        });
      }

      // 检查Replicate API Token
      if (!process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_TOKEN === 'r8_your_actual_token_here') {
        return res.status(500).json({
          success: false,
          error: 'Replicate API Token未配置',
          message: '请在.env.local文件中配置真实的REPLICATE_API_TOKEN',
          suggestion: '获取Token地址: https://replicate.com/account/api-tokens'
        });
      }

      // 模拟成功响应（实际环境中会调用Replicate API）
      res.status(200).json({
        success: true,
        message: '图像超分处理完成（模拟）',
        upscaled_image: 'https://example.com/upscaled-image.jpg',
        scale: scale,
        face_enhance: face_enhance,
        model: model,
        timestamp: new Date().toISOString(),
        note: '这是本地开发服务器的模拟响应'
      });

    } catch (error) {
      console.error('处理请求时出错:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
        message: error.message
      });
    }
  };
}

const upscaleHandler = createUpscaleHandler();

// API路由
app.post('/api/upscale', async (req, res) => {
  try {
    // 创建模拟的Vercel请求/响应对象
    const mockReq = {
      ...req,
      method: req.method,
      body: req.body,
      headers: req.headers,
      url: req.url
    };
    
    const mockRes = {
      ...res,
      setHeader: (name, value) => res.setHeader(name, value),
      status: (code) => {
        res.statusCode = code;
        return {
          json: (data) => res.json(data),
          end: () => res.end()
        };
      },
      json: (data) => res.json(data)
    };
    
    await upscaleHandler(mockReq, mockRes);
  } catch (error) {
    console.error('API处理错误:', error);
    res.status(500).json({
      error: '服务器内部错误',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: 'local-development',
    nodeVersion: process.version
  });
});

// 根路径
app.get('/', (req, res) => {
  res.json({
    message: '本地API服务器运行中',
    endpoints: [
      'POST /api/upscale - 图像超分处理',
      'GET /api/health - 健康检查'
    ],
    timestamp: new Date().toISOString()
  });
});

// 错误处理
app.use((error, req, res, next) => {
  console.error('服务器错误:', error);
  res.status(500).json({
    error: '服务器内部错误',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    error: '接口不存在',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 本地API服务器启动成功`);
  console.log(`📍 地址: http://localhost:${PORT}`);
  console.log(`🔧 环境: ${process.env.NODE_ENV}`);
  console.log(`📋 可用接口:`);
  console.log(`   POST http://localhost:${PORT}/api/upscale`);
  console.log(`   GET  http://localhost:${PORT}/api/health`);
  console.log(`\n💡 提示: 请确保设置了REPLICATE_API_TOKEN环境变量`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭服务器...');
  process.exit(0);
});

module.exports = app;