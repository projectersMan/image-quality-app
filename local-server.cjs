/**
 * 本地API服务器
 * 用于在开发环境中模拟Vercel API函数
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Replicate = require('replicate');

// 引入共享的API处理逻辑 - 使用ES模块版本以保持与Vercel一致
const { processUpscale, processAnalyze, processToneEnhance, processDetailEnhance, processAutopilotEnhance } = require('./shared/api-handlers.cjs');

// Autopilot辅助函数
function calculateQualityScores(analysis) {
  // 影调质量评分
  const toneScore = calculateToneScore(analysis);

  // 细节清晰度评分
  const detailScore = calculateDetailScore(analysis);

  // 分辨率适配评分
  const resolutionScore = calculateResolutionScore(analysis);

  return {
    tone: Math.round(toneScore),
    detail: Math.round(detailScore),
    resolution: Math.round(resolutionScore),
    overall: Math.round((toneScore + detailScore + resolutionScore) / 3)
  };
}

function calculateToneScore(analysis) {
  let score = 70; // 基础分数

  if (analysis.quality_issues) {
    if (analysis.quality_issues.includes('underexposed')) score -= 20;
    if (analysis.quality_issues.includes('overexposed')) score -= 20;
    if (analysis.quality_issues.includes('low_contrast')) score -= 15;
    if (analysis.quality_issues.includes('color_cast')) score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}

function calculateDetailScore(analysis) {
  let score = 75; // 基础分数

  if (analysis.quality_issues) {
    if (analysis.quality_issues.includes('blurry')) score -= 25;
    if (analysis.quality_issues.includes('noisy')) score -= 20;
    if (analysis.quality_issues.includes('compression_artifacts')) score -= 15;
    if (analysis.quality_issues.includes('soft_details')) score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

function calculateResolutionScore(analysis) {
  let score = 80; // 基础分数

  if (analysis.image_info) {
    const { width, height } = analysis.image_info;
    const totalPixels = width * height;

    if (totalPixels < 500000) score -= 30; // 小于0.5MP
    else if (totalPixels < 1000000) score -= 20; // 小于1MP
    else if (totalPixels < 2000000) score -= 10; // 小于2MP
  }

  return Math.max(0, Math.min(100, score));
}

function generateEnhancementRecommendations(scores) {
  const recommendations = {
    tone: null,
    detail: null,
    upscale: null,
    priority: []
  };

  // 影调增强建议
  if (scores.tone < 80) {
    recommendations.tone = {
      enabled: true,
      type: scores.tone < 50 ? 'night' : 'general',
      intensity: scores.tone < 40 ? 2.0 : scores.tone < 60 ? 1.5 : 1.0
    };
    recommendations.priority.push('tone');
  }

  // 细节增强建议
  if (scores.detail < 80) {
    recommendations.detail = {
      enabled: true,
      type: scores.detail < 50 ? 'general' : 'general',
      strength: scores.detail < 40 ? 3 : scores.detail < 60 ? 2 : 1
    };
    recommendations.priority.push('detail');
  }

  // 超分辨率建议
  if (scores.resolution < 70) {
    recommendations.upscale = {
      enabled: true,
      scale: scores.resolution < 40 ? 4 : scores.resolution < 60 ? 2 : 2,
      model: 'real-esrgan'
    };
    recommendations.priority.push('upscale');
  }

  return recommendations;
}

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

// 环境变量通过 setenv.sh 脚本设置，在启动前已加载到 process.env 中

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

// 注意：图像验证和Replicate调用逻辑已移至 shared/api-handlers.js
// 这里保留注释以说明代码重构

// 创建超分处理函数（使用共享逻辑）
function createUpscaleHandler() {
  return async (req, res) => {
    const startTime = Date.now();
    logger.logRequest('/api/upscale', req);
    
    try {
      // 解析请求体参数
      const { imageBase64, scale = 2, face_enhance = false, model = 'real-esrgan' } = req.body;
      
      // 使用共享的processUpscale函数 - 统一参数顺序与Vercel保持一致
      const result = await processUpscale(imageBase64, scale, face_enhance, model, process.env.REPLICATE_API_TOKEN);
      
      // 添加本地服务器特有的信息
      const processingTime = Date.now() - startTime;
      const response = {
        ...result,
        processing_time_ms: processingTime,
        environment: 'local-development'
      };
      
      logger.logResponse('/api/upscale', 200, response);
      res.status(200).json(response);

    } catch (error) {
      logger.logError('/api/upscale', error, { startTime });
      
      // 统一的错误响应格式
      const errorResponse = {
        success: false,
        error: error.name || '服务器内部错误',
        message: error.message,
        timestamp: new Date().toISOString(),
        environment: 'local-development'
      };
      
      const statusCode = error.statusCode || 500;
      logger.logResponse('/api/upscale', statusCode, errorResponse);
      res.status(statusCode).json(errorResponse);
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

// AI分析接口（使用共享逻辑）
app.post('/api/analyze', async (req, res) => {
  const startTime = Date.now();
  logger.logRequest('/api/analyze', req);
  
  try {
    // 解析请求体参数
    const { imageUrl, imageBase64 } = req.body;
    const imageData = imageBase64 || imageUrl;
    
    if (!imageData) {
      return res.status(400).json({ 
        success: false,
        error: '请提供图片URL或base64数据',
        timestamp: new Date().toISOString()
      });
    }
    
    // 使用共享的processAnalyze函数 - 统一参数顺序与Vercel保持一致
    const result = await processAnalyze(imageData, process.env.REPLICATE_API_TOKEN);
    
    // 添加本地服务器特有的信息
    const processingTime = Date.now() - startTime;
    const response = {
      ...result,
      processing_time_ms: processingTime,
      environment: 'local-development'
    };
    
    logger.logResponse('/api/analyze', 200, response);
    res.status(200).json(response);

  } catch (error) {
    logger.logError('/api/analyze', error, { startTime });
    
    // 统一的错误响应格式
    const errorResponse = {
      success: false,
      error: error.name || '图像分析服务暂时不可用',
      message: error.message,
      timestamp: new Date().toISOString(),
      environment: 'local-development'
    };
    
    const statusCode = error.statusCode || 500;
    logger.logResponse('/api/analyze', statusCode, errorResponse);
    res.status(statusCode).json(errorResponse);
  }
});

// 影调增强接口
app.post('/api/tone-enhance', async (req, res) => {
  const startTime = Date.now();
  logger.logRequest('/api/tone-enhance', req);

  try {
    // 解析请求体参数
    const { imageBase64, enhanceType = 'auto', intensity = 1.0 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        error: '请提供base64编码的图像数据',
        timestamp: new Date().toISOString()
      });
    }

    // 使用共享的processToneEnhance函数
    const result = await processToneEnhance(imageBase64, enhanceType, intensity, process.env.REPLICATE_API_TOKEN);

    const processingTime = Date.now() - startTime;
    logger.logResponse('/api/tone-enhance', result, processingTime);

    res.json(result);
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.logError('/api/tone-enhance', error, processingTime);

    res.status(500).json({
      success: false,
      error: error.message || '影调增强处理失败',
      timestamp: new Date().toISOString()
    });
  }
});

// 细节增强接口
app.post('/api/detail-enhance', async (req, res) => {
  const startTime = Date.now();
  logger.logRequest('/api/detail-enhance', req);

  try {
    // 解析请求体参数
    const { imageBase64, enhanceType = 'denoise', strength = 15 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        error: '请提供base64编码的图像数据',
        timestamp: new Date().toISOString()
      });
    }

    // 使用共享的processDetailEnhance函数
    const result = await processDetailEnhance(imageBase64, enhanceType, strength, process.env.REPLICATE_API_TOKEN);

    const processingTime = Date.now() - startTime;
    logger.logResponse('/api/detail-enhance', result, processingTime);

    res.json(result);
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.logError('/api/detail-enhance', error, processingTime);

    res.status(500).json({
      success: false,
      error: error.message || '细节增强处理失败',
      timestamp: new Date().toISOString()
    });
  }
});

// Autopilot智能分析接口
app.post('/api/autopilot-analyze', async (req, res) => {
  const startTime = Date.now();
  logger.logRequest('/api/autopilot-analyze', req);

  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        error: '请提供base64编码的图像数据',
        timestamp: new Date().toISOString()
      });
    }

    // 使用现有的分析功能获取基础质量信息
    const basicAnalysis = await processAnalyze(imageBase64, process.env.REPLICATE_API_TOKEN);

    // 计算质量评分
    const scores = calculateQualityScores(basicAnalysis);

    // 生成增强建议
    const recommendations = generateEnhancementRecommendations(scores);

    const result = {
      success: true,
      scores,
      recommendations,
      message: 'Autopilot智能分析完成',
      timestamp: new Date().toISOString(),
      environment: 'local-development'
    };

    const processingTime = Date.now() - startTime;
    logger.logResponse('/api/autopilot-analyze', result, processingTime);

    res.json(result);
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.logError('/api/autopilot-analyze', error, processingTime);

    res.status(500).json({
      success: false,
      error: error.message || 'Autopilot分析失败',
      timestamp: new Date().toISOString()
    });
  }
});

// Autopilot自动增强接口
app.post('/api/autopilot-enhance', async (req, res) => {
  const startTime = Date.now();
  logger.logRequest('/api/autopilot-enhance', req);

  try {
    const { imageBase64, recommendations } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        error: '请提供base64编码的图像数据',
        timestamp: new Date().toISOString()
      });
    }

    if (!recommendations || !recommendations.priority) {
      return res.status(400).json({
        success: false,
        error: '缺少增强建议配置',
        timestamp: new Date().toISOString()
      });
    }

    // 使用共享的processAutopilotEnhance函数
    const result = await processAutopilotEnhance(imageBase64, recommendations, process.env.REPLICATE_API_TOKEN);

    const processingTime = Date.now() - startTime;
    logger.logResponse('/api/autopilot-enhance', result, processingTime);

    res.json(result);
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.logError('/api/autopilot-enhance', error, processingTime);

    res.status(500).json({
      success: false,
      error: error.message || 'Autopilot增强失败',
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
      'POST /api/analyze - AI图像质量分析',
      'POST /api/tone-enhance - AI影调增强',
      'POST /api/detail-enhance - AI细节增强',
      'POST /api/autopilot-analyze - Autopilot智能分析',
      'POST /api/autopilot-enhance - Autopilot自动增强',
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
  console.log(`   POST http://localhost:${PORT}/api/tone-enhance`);
  console.log(`   POST http://localhost:${PORT}/api/detail-enhance`);
  console.log(`   POST http://localhost:${PORT}/api/autopilot-analyze`);
  console.log(`   POST http://localhost:${PORT}/api/autopilot-enhance`);
  console.log(`   GET  http://localhost:${PORT}/api/health`);
  console.log(`\n💡 提示: 请确保设置了REPLICATE_API_TOKEN环境变量`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭服务器...');
  process.exit(0);
});

module.exports = app;