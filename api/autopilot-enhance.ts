/**
 * Autopilot自动增强API
 * 
 * 📖 功能说明: 根据智能分析结果自动执行图像增强流程
 * 🤖 处理流程: 
 *   1. 按优先级依次执行增强步骤
 *   2. 影调增强 → 细节增强 → 超分辨率
 *   3. 返回每个步骤的结果和最终图像
 * 🎯 输出结果: 完整的处理流程和最终增强图像
 * 
 * 环境变量:
 * - REPLICATE_API_TOKEN: Replicate API密钥
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Replicate from 'replicate';
import { createDebugMiddleware } from '../debug/api-debug.mjs';
import { processAutopilotEnhance } from '../shared/api-handlers.mjs';

// 初始化Replicate客户端
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const debug = createDebugMiddleware('autopilot-enhance');
  
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

    const { imageBase64, recommendations } = parsedBody;
    
    debug.apiDebugger.log('info', '开始Autopilot自动增强流程');
    
    // 检查API Token
    if (!process.env.REPLICATE_API_TOKEN) {
      return debug.errorResponse(res, 'REPLICATE_API_TOKEN未配置', 500);
    }
    
    // 验证输入参数
    if (!imageBase64) {
      return debug.errorResponse(res, '缺少图像数据', 400);
    }
    
    if (!recommendations || !recommendations.priority) {
      return debug.errorResponse(res, '缺少增强建议配置', 400);
    }
    
    // 使用共享的processAutopilotEnhance函数
    const result = await processAutopilotEnhance(imageBase64, recommendations, process.env.REPLICATE_API_TOKEN);
    
    // 使用调试工具记录响应
    debug.logResponse(res, result);
    
    // 返回处理结果
    return debug.safeJSON(res, result, 200);

  } catch (error) {
    // 使用调试工具记录错误
    debug.logError(error, { requestBody: req.body });
    
    // 统一的错误处理
    const statusCode = error.statusCode || 500;
    const errorMessage = error.message || 'Autopilot增强服务暂时不可用，请稍后再试';
    
    return debug.errorResponse(res, errorMessage, statusCode, error instanceof Error ? error.message : '未知错误');
  }
}
