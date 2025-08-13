/**
 * 图像质量分析API
 *
 * 📖 Replicate文档: https://replicate.com/docs
 * 🤖 使用模型: LLAVA-13B 图像理解模型
 *
 * 环境变量:
 * - REPLICATE_API_TOKEN: Replicate API密钥
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Replicate from 'replicate';
import { createDebugMiddleware } from '../debug/api-debug.mjs';
const { processAnalyze } = require('../shared/api-handlers.cjs');

// 初始化Replicate客户端
// 文档: https://replicate.com/docs/reference/node
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const debug = createDebugMiddleware('analyze');
  
  // 环境检查
  debug.apiDebugger.checkEnvironment();
  
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return debug.errorResponse(res, '只支持POST请求', 405);
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

    // 检查Replicate API token
    if (!process.env.REPLICATE_API_TOKEN) {
      return debug.errorResponse(res, '服务器配置错误：缺少REPLICATE_API_TOKEN', 500);
    }

    const { imageUrl, imageBase64 } = parsedBody;
    const imageData = imageBase64 || imageUrl;

    if (!imageData) {
      return debug.errorResponse(res, '请提供图片URL或base64数据', 400);
    }

    debug.apiDebugger.log('info', '开始AI图像质量分析...');

    // 使用共享的processAnalyze函数
    const analysisResult = await processAnalyze(replicate, imageData);

    debug.apiDebugger.log('info', `分析完成，评分: ${analysisResult.score}`);

    const result = {
      success: true,
      score: analysisResult.score,
      analysis: analysisResult.analysis,
      message: analysisResult.message || '分析完成',
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
    const errorMessage = error.message || '图像分析服务暂时不可用，请稍后再试';
    
    return debug.errorResponse(res, errorMessage, statusCode, error instanceof Error ? error.message : '未知错误');
  }
}