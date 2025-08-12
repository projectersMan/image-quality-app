/**
 * API调试工具
 * 用于本地仿真和Vercel环境的一致性调试
 */

import fs from 'fs';
import path from 'path';

// 调试配置
const DEBUG_CONFIG = {
  logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'error',
  enableRequestLogging: true,
  enableResponseLogging: true,
  enableErrorStack: process.env.NODE_ENV === 'development'
};

// 日志记录器
class APIDebugger {
  constructor() {
    this.logDir = path.join(process.cwd(), 'debug', 'logs');
    this.ensureLogDir();
  }

  ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      environment: process.env.NODE_ENV || 'unknown',
      platform: process.env.VERCEL ? 'vercel' : 'local'
    };

    // 控制台输出
    if (this.shouldLog(level)) {
      console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
      if (data) {
        console.log('Data:', JSON.stringify(data, null, 2));
      }
    }

    // 文件日志（仅本地环境）
    if (!process.env.VERCEL) {
      const logFile = path.join(this.logDir, `api-${new Date().toISOString().split('T')[0]}.log`);
      fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    }
  }

  shouldLog(level) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const configLevel = levels[DEBUG_CONFIG.logLevel] || 1;
    return levels[level] >= configLevel;
  }

  // 请求调试
  logRequest(req, endpoint) {
    if (!DEBUG_CONFIG.enableRequestLogging) return;
    
    this.log('debug', `API Request: ${endpoint}`, {
      method: req.method,
      headers: this.sanitizeHeaders(req.headers),
      body: this.sanitizeBody(req.body),
      query: req.query,
      url: req.url
    });
  }

  // 响应调试
  logResponse(res, data, endpoint) {
    if (!DEBUG_CONFIG.enableResponseLogging) return;
    
    this.log('debug', `API Response: ${endpoint}`, {
      statusCode: res.statusCode,
      headers: res.getHeaders(),
      dataType: typeof data,
      dataLength: JSON.stringify(data).length,
      isValidJSON: this.isValidJSON(data)
    });
  }

  // 错误调试
  logError(error, context = {}) {
    this.log('error', 'API Error', {
      message: error.message,
      stack: DEBUG_CONFIG.enableErrorStack ? error.stack : undefined,
      context,
      errorType: error.constructor.name
    });
  }

  // JSON验证
  isValidJSON(data) {
    try {
      JSON.stringify(data);
      return true;
    } catch (e) {
      return false;
    }
  }

  // 清理敏感信息
  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    delete sanitized.authorization;
    delete sanitized.cookie;
    return sanitized;
  }

  sanitizeBody(body) {
    if (!body) return body;
    const sanitized = { ...body };
    // 截断base64图片数据
    if (sanitized.imageBase64) {
      sanitized.imageBase64 = sanitized.imageBase64.substring(0, 100) + '...[truncated]';
    }
    return sanitized;
  }

  // 环境检查
  checkEnvironment() {
    const env = {
      nodeVersion: process.version,
      platform: process.platform,
      isVercel: !!process.env.VERCEL,
      hasReplicateToken: !!process.env.REPLICATE_API_TOKEN,
      environment: process.env.NODE_ENV
    };
    
    this.log('info', 'Environment Check', env);
    return env;
  }
}

// 响应包装器 - 确保JSON格式正确
class ResponseWrapper {
  static safeJSON(res, data, statusCode = 200) {
    try {
      // 确保数据可以序列化
      const serialized = JSON.stringify(data);
      JSON.parse(serialized); // 验证可以解析
      
      res.status(statusCode).json(data);
    } catch (error) {
      console.error('JSON序列化错误:', error);
      res.status(500).json({
        error: 'Internal server error - JSON serialization failed',
        timestamp: new Date().toISOString()
      });
    }
  }

  static errorResponse(res, message, statusCode = 500, details = null) {
    const errorData = {
      error: message,
      timestamp: new Date().toISOString(),
      statusCode
    };
    
    if (details && process.env.NODE_ENV === 'development') {
      errorData.details = details;
    }
    
    this.safeJSON(res, errorData, statusCode);
  }
}

// 中间件工厂
function createDebugMiddleware(endpoint) {
  const apiDebugger = new APIDebugger();
  
  return {
    apiDebugger,
    logRequest: (req) => apiDebugger.logRequest(req, endpoint),
    logResponse: (res, data) => apiDebugger.logResponse(res, data, endpoint),
    logError: (error, context) => apiDebugger.logError(error, context),
    safeJSON: (res, data, statusCode) => ResponseWrapper.safeJSON(res, data, statusCode),
    errorResponse: (res, message, statusCode, details) => ResponseWrapper.errorResponse(res, message, statusCode, details)
  };
}

export {
  APIDebugger,
  ResponseWrapper,
  createDebugMiddleware,
  DEBUG_CONFIG
};