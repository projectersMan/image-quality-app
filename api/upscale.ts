/**
 * 图像超分辨率API
 * 
 * 📖 Replicate文档: https://replicate.com/docs
 * 🤖 使用模型: Real-ESRGAN 图像超分辨率模型
 * 🔗 模型页面: https://replicate.com/nightmareai/real-esrgan
 * 
 * 环境变量:
 * - REPLICATE_API_TOKEN: Replicate API密钥
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Replicate from 'replicate';
import { createDebugMiddleware } from '../debug/api-debug.mjs';
const { processUpscale } = require('../shared/api-handlers.cjs');

// 初始化Replicate客户端
// 文档: https://replicate.com/docs/reference/node
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const debug = createDebugMiddleware('upscale');
  
  // 环境检查
  debug.apiDebugger.checkEnvironment();
  
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return debug.errorResponse(res, '仅支持POST请求', 405);
  }

  // 记录请求
  debug.logRequest(req);

  try {
    // 解析请求体
    let parsedBody;
    try {
      parsedBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (parseError) {
      debug.logError(parseError, { rawBody: req.body });
      return debug.errorResponse(res, 'JSON解析错误：请求体格式不正确', 400);
    }

    const { imageBase64, scale = 2, face_enhance = false, model = 'real-esrgan' } = parsedBody;
    
    debug.apiDebugger.log('info', `开始图像超分处理，使用模型: ${model}`);
    
    // 使用共享的processUpscale函数
    const upscaledImageUrl = await processUpscale(replicate, imageBase64, model, scale, face_enhance);
    
    const result = {
      success: true,
      upscaled_image: upscaledImageUrl,
      scale: scale,
      face_enhance: face_enhance,
      model: model,
      message: '图像超分处理完成',
      timestamp: new Date().toISOString()
    };
    
    // 使用调试工具记录响应
    debug.logResponse(res, result);
    
    // 返回处理结果
    return debug.safeJSON(res, result, 200);

  } catch (error) {
    // 使用调试工具记录错误
    debug.logError(error, { requestBody: req.body });
    
    // 统一的错误处理
    const statusCode = error.statusCode || 500;
    const errorMessage = error.message || '图像超分服务暂时不可用，请稍后再试';
    
    return debug.errorResponse(res, errorMessage, statusCode, error instanceof Error ? error.message : '未知错误');
  }
}
