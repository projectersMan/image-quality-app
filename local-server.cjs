/**
 * 本地API服务器
 * 用于在开发环境中模拟Vercel API函数
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Replicate = require('replicate');

// 简单的日志记录器
class LocalLogger {
  constructor() {
    this.logDir = path.join(__dirname, 'logs');
    this.ensureLogDir();
  }

  ensureLogDir() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (error) {
      console.warn('无法创建日志目录:', error.message);
    }
  }

  log(level, endpoint, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      endpoint,
      message,
      data,
      environment: 'local-development'
    };

    // 控制台输出
    console.log(`[${timestamp}] ${level.toUpperCase()} ${endpoint}: ${message}`);
    if (data) {
      console.log('Data:', JSON.stringify(data, null, 2));
    }

    // 文件日志
    try {
      const logFile = path.join(this.logDir, `api-${new Date().toISOString().split('T')[0]}.log`);
      fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.warn('写入日志文件失败:', error.message);
    }
  }

  logRequest(endpoint, req) {
    this.log('info', endpoint, 'Request received', {
      method: req.method,
      headers: this.sanitizeHeaders(req.headers),
      bodySize: req.body ? JSON.stringify(req.body).length : 0,
      userAgent: req.headers['user-agent']
    });
  }

  logResponse(endpoint, statusCode, data) {
    this.log('info', endpoint, 'Response sent', {
      statusCode,
      dataSize: JSON.stringify(data).length,
      success: statusCode < 400
    });
  }

  logError(endpoint, error, context = {}) {
    this.log('error', endpoint, 'Error occurred', {
      message: error.message,
      stack: error.stack,
      context
    });
  }

  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    // 移除敏感信息
    delete sanitized.authorization;
    delete sanitized.cookie;
    return sanitized;
  }
}

const logger = new LocalLogger();

// 加载环境变量
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value && !key.startsWith('#')) {
      process.env[key.trim()] = value.trim();
    }
  });
}

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

// 初始化Replicate客户端
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// 简单的图像尺寸验证（基于base64数据大小的启发式方法）
function validateImageForModel(imageBase64, model) {
  if (model === 'aura-sr-v2') {
    // 对于aura-sr-v2模型，检查base64数据大小
    // 一个1x1像素的PNG大小约为100字节的base64
    // 只拒绝明显太小的图像（如1x1像素）
    const base64Data = imageBase64.split(',')[1] || imageBase64;
    const sizeInBytes = (base64Data.length * 3) / 4; // 估算原始字节大小
    
    if (sizeInBytes < 150) { // 小于150字节可能是1x1像素的图像
      throw new Error('Aura SR v2 模型要求图像尺寸至少为 64x64 像素。请使用更大的图像。');
    }
  }
  return true;
}

// Replicate API调用函数
async function callReplicateUpscale(imageBase64, scale, model, face_enhance) {
  // 验证图像是否适合指定模型
  try {
    validateImageForModel(imageBase64, model);
  } catch (error) {
    throw error;
  }
  
  let modelId;
  let modelInput;
  
  if (model === 'aura-sr-v2') {
    modelId = "zsxkib/aura-sr-v2:5c137257cce8d5ce16e8a334b70e9e025106b5580affed0bc7d48940b594e74c";
    modelInput = {
      image: imageBase64,
      upscale_factor: scale,
    };
  } else {
    modelId = "nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa";
    modelInput = {
      image: imageBase64,
      scale: scale,
      face_enhance: face_enhance,
    };
  }
  
  const output = await replicate.run(modelId, { input: modelInput });
  return typeof output === 'string' ? output : (Array.isArray(output) ? output[0] : String(output));
}

// 创建超分处理函数
function createUpscaleHandler() {
  return async (req, res) => {
    const startTime = Date.now();
    logger.logRequest('/api/upscale', req);
    
    try {
      // 验证请求体
      if (!req.body) {
        const errorResponse = {
          success: false,
          error: '请求体为空',
          message: '请提供有效的JSON数据'
        };
        logger.logResponse('/api/upscale', 400, errorResponse);
        return res.status(400).json(errorResponse);
      }

      const { imageBase64, model = 'real-esrgan', scale = 2, face_enhance = false } = req.body;

      // 验证必需参数
      if (!imageBase64) {
        const errorResponse = {
          success: false,
          error: '缺少图像数据',
          message: '请提供base64编码的图像数据'
        };
        logger.logResponse('/api/upscale', 400, errorResponse);
        return res.status(400).json(errorResponse);
      }

      // 验证模型参数
      if (!['real-esrgan', 'aura-sr-v2'].includes(model)) {
        const errorResponse = {
          success: false,
          error: '不支持的模型类型',
          message: '仅支持 real-esrgan 和 aura-sr-v2 模型'
        };
        logger.logResponse('/api/upscale', 400, errorResponse);
        return res.status(400).json(errorResponse);
      }

      // 验证缩放参数
      if (![2, 4, 8].includes(scale)) {
        const errorResponse = {
          success: false,
          error: '不支持的缩放倍数',
          message: '仅支持2x、4x、8x缩放'
        };
        logger.logResponse('/api/upscale', 400, errorResponse);
        return res.status(400).json(errorResponse);
      }

      // 检查Replicate API Token
      if (!process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_TOKEN === 'r8_your_actual_token_here') {
        const errorResponse = {
          success: false,
          error: 'Replicate API Token未配置',
          message: '请在.env.local文件中配置真实的REPLICATE_API_TOKEN',
          suggestion: '获取Token地址: https://replicate.com/account/api-tokens'
        };
        logger.logResponse('/api/upscale', 500, errorResponse);
        return res.status(500).json(errorResponse);
      }

      // 模拟成功响应（实际环境中会调用Replicate API）
      logger.log('info', '/api/upscale', 'Processing upscale request', {
        model,
        scale,
        face_enhance,
        imageSize: imageBase64.length
      });
      
      // 调用真实的Replicate API进行超分处理
      const upscaledImageUrl = await callReplicateUpscale(imageBase64, scale, model, face_enhance);
      
      const processingTime = Date.now() - startTime;
      const successResponse = {
        success: true,
        message: '图像超分处理完成',
        upscaled_image: upscaledImageUrl,
        scale: scale,
        face_enhance: face_enhance,
        model: model,
        timestamp: new Date().toISOString(),
        processing_time_ms: processingTime
      };
      
      logger.logResponse('/api/upscale', 200, successResponse);
      
      res.status(200).json(successResponse);

    } catch (error) {
      logger.logError('/api/upscale', error, { startTime });
      const errorResponse = {
        success: false,
        error: '服务器内部错误',
        message: error.message,
        timestamp: new Date().toISOString()
      };
      logger.logResponse('/api/upscale', 500, errorResponse);
      res.status(500).json(errorResponse);
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

// AI分析接口
app.post('/api/analyze', async (req, res) => {
  const startTime = Date.now();
  logger.logRequest('/api/analyze', req);
  
  try {
    const { imageUrl, imageBase64 } = req.body;

    if (!imageUrl && !imageBase64) {
      const errorResponse = {
        error: '请提供图片URL或base64数据',
        timestamp: new Date().toISOString()
      };
      logger.logResponse('/api/analyze', 400, errorResponse);
      return res.status(400).json(errorResponse);
    }

    // 检查Replicate API token
    if (!process.env.REPLICATE_API_TOKEN) {
      const errorResponse = {
        error: 'Replicate API Token未配置',
        message: '请在.env.local文件中配置真实的REPLICATE_API_TOKEN',
        suggestion: '获取Token地址: https://replicate.com/account/api-tokens',
        timestamp: new Date().toISOString()
      };
      logger.logResponse('/api/analyze', 500, errorResponse);
      return res.status(500).json(errorResponse);
    }

    logger.log('info', '/api/analyze', 'Processing analyze request', {
      hasImageUrl: !!imageUrl,
      hasImageBase64: !!imageBase64,
      imageSize: imageBase64 ? imageBase64.length : 0
    });

    // 模拟AI分析结果（实际环境中会调用Replicate API）
    const mockScore = Math.random() * 4 + 6; // 6-10之间的随机分数
    const processingTime = Date.now() - startTime;
    
    const successResponse = {
      score: Math.round(mockScore * 10) / 10, // 保留一位小数
      message: '分析完成（模拟）',
      timestamp: new Date().toISOString(),
      processing_time_ms: processingTime,
      note: '这是本地开发服务器的模拟响应'
    };
    
    logger.logResponse('/api/analyze', 200, successResponse);
    res.status(200).json(successResponse);

  } catch (error) {
    logger.logError('/api/analyze', error, { startTime });
    const errorResponse = {
      error: '图像分析服务暂时不可用，请稍后再试',
      details: error.message,
      timestamp: new Date().toISOString()
    };
    logger.logResponse('/api/analyze', 500, errorResponse);
    res.status(500).json(errorResponse);
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
      'POST /api/analyze - AI图像质量分析',
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
  console.log(`   POST http://localhost:${PORT}/api/analyze`);
  console.log(`   GET  http://localhost:${PORT}/api/health`);
  console.log(`\n💡 提示: 请确保设置了REPLICATE_API_TOKEN环境变量`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭服务器...');
  process.exit(0);
});

module.exports = app;