/**
 * 细节增强API
 * 
 * 📖 功能说明: 自动分析图像细节可以提升的空间，通过SOTA方法来提升图像的细节
 * 🤖 使用模型: jingyunliang/swinir - 图像修复使用Swin Transformer
 * 🔗 模型页面: https://replicate.com/jingyunliang/swinir
 * 
 * 支持的增强类型:
 * - denoise: 图像去噪（彩色图像去噪）
 * - sharpen: 图像锐化（通过超分辨率实现）
 * - artifact_reduction: JPEG压缩伪影减少
 * - super_resolution: 超分辨率增强
 * 
 * 环境变量:
 * - REPLICATE_API_TOKEN: Replicate API密钥
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Replicate from 'replicate';
import { createDebugMiddleware } from '../debug/api-debug.mjs';
import { processDetailEnhance } from '../shared/api-handlers.mjs';

// 初始化Replicate客户端
// 文档: https://replicate.com/docs/reference/node
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const debug = createDebugMiddleware('detail-enhance');
  
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

    const { 
      imageBase64, 
      enhanceType = 'denoise', 
      strength = 15 
    } = parsedBody;
    
    debug.apiDebugger.log('info', `开始细节增强处理，类型: ${enhanceType}, 强度: ${strength}`);
    
    // 检查API Token
    if (!process.env.REPLICATE_API_TOKEN) {
      return debug.errorResponse(res, 'REPLICATE_API_TOKEN未配置', 500);
    }
    
    // 使用共享的processDetailEnhance函数
    const result = await processDetailEnhance(imageBase64, enhanceType, strength, process.env.REPLICATE_API_TOKEN);
    
    // 使用调试工具记录响应
    debug.logResponse(res, result);
    
    // 返回处理结果
    return debug.safeJSON(res, result, 200);

  } catch (error) {
    // 使用调试工具记录错误
    debug.logError(error, { requestBody: req.body });
    
    // 统一的错误处理
    const statusCode = error.statusCode || 500;
    const errorMessage = error.message || '细节增强服务暂时不可用，请稍后再试';
    
    return debug.errorResponse(res, errorMessage, statusCode, error instanceof Error ? error.message : '未知错误');
  }
}
