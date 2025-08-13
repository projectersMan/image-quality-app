/**
 * 影调增强API
 * 
 * 📖 功能说明: 自动分析图像影调可以提升的空间，从对比度、亮度、饱和度等维度进行自动化增强
 * 🤖 使用模型: 
 *   - fofr/color-matcher: 颜色匹配和白平衡修复
 *   - jingyunliang/swinir: 图像修复使用Swin Transformer
 * 🔗 模型页面: 
 *   - https://replicate.com/fofr/color-matcher
 *   - https://replicate.com/jingyunliang/swinir
 * 
 * 环境变量:
 * - REPLICATE_API_TOKEN: Replicate API密钥
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Replicate from 'replicate';
import { createDebugMiddleware } from '../debug/api-debug.mjs';
import { processToneEnhance } from '../shared/api-handlers.mjs';

// 初始化Replicate客户端
// 文档: https://replicate.com/docs/reference/node
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const debug = createDebugMiddleware('tone-enhance');
  
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
      enhanceType = 'auto', 
      intensity = 1.0 
    } = parsedBody;
    
    debug.apiDebugger.log('info', `开始影调增强处理，类型: ${enhanceType}, 强度: ${intensity}`);
    
    // 检查API Token
    if (!process.env.REPLICATE_API_TOKEN) {
      return debug.errorResponse(res, 'REPLICATE_API_TOKEN未配置', 500);
    }
    
    // 使用共享的processToneEnhance函数
    const result = await processToneEnhance(imageBase64, enhanceType, intensity, process.env.REPLICATE_API_TOKEN);
    
    // 使用调试工具记录响应
    debug.logResponse(res, result);
    
    // 返回处理结果
    return debug.safeJSON(res, result, 200);

  } catch (error) {
    // 使用调试工具记录错误
    debug.logError(error, { requestBody: req.body });
    
    // 统一的错误处理
    const statusCode = error.statusCode || 500;
    const errorMessage = error.message || '影调增强服务暂时不可用，请稍后再试';
    
    return debug.errorResponse(res, errorMessage, statusCode, error instanceof Error ? error.message : '未知错误');
  }
}
