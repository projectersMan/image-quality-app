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
    // 验证请求体
    if (!req.body) {
      return debug.errorResponse(res, '请求体不能为空', 400);
    }

    let parsedBody;
    try {
      // 确保请求体是正确解析的JSON
      parsedBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (parseError) {
      debug.logError(parseError, { rawBody: req.body });
      return debug.errorResponse(res, 'JSON解析错误：请求体格式不正确', 400);
    }

    const { imageBase64, scale = 2, face_enhance = false, model = 'real-esrgan' } = parsedBody;

    if (!imageBase64) {
      return debug.errorResponse(res, '请提供图像数据', 400);
    }

    // 验证图像数据格式
    if (!imageBase64.startsWith('data:image/')) {
      return debug.errorResponse(res, '图像数据格式不正确，需要base64格式', 400);
    }

    // 验证Replicate API Token
    if (!process.env.REPLICATE_API_TOKEN) {
      return debug.errorResponse(res, 'Replicate API Token未配置', 500);
    }

    // 验证模型参数
    if (!['real-esrgan', 'aura-sr-v2'].includes(model)) {
      return debug.errorResponse(res, '不支持的模型类型', 400);
    }

    // 验证缩放参数
    if (![2, 4, 8].includes(scale)) {
      return debug.errorResponse(res, '不支持的缩放倍数，仅支持2x、4x、8x', 400);
    }

    debug.apiDebugger.log('info', `开始图像超分处理，使用模型: ${model}`);

    let output;
    let modelId;
    let modelInput;
    
    try {
      if (model === 'aura-sr-v2') {
        // 使用Aura SR v2模型
        modelId = "zsxkib/aura-sr-v2:5c137257cce8d5ce16e8a334b70e9e025106b5580affed0bc7d48940b594e74c";
        modelInput = {
          image: imageBase64,
          upscale_factor: scale, // Aura SR使用upscale_factor参数
        };
      } else {
        // 使用Real-ESRGAN模型（默认）
        modelId = "nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa";
        modelInput = {
          image: imageBase64,
          scale: scale, // 放大倍数: 2, 4, 8
          face_enhance: face_enhance, // 是否启用面部增强
        };
      }

      debug.apiDebugger.log('debug', 'Replicate API调用配置');
      
      // 调用Replicate API
      output = await replicate.run(modelId, { input: modelInput });
      
      debug.apiDebugger.log('info', '超分处理完成');
      
    } catch (replicateError) {
      debug.logError(replicateError, { model, scale, modelId, modelInput });
      throw replicateError;
    }

    // 确保输出是字符串格式（解决JSON解析错误）
    const upscaledImageUrl = typeof output === 'string' ? output : (Array.isArray(output) ? output[0] : String(output));
    
    // 验证输出URL
    if (!upscaledImageUrl || upscaledImageUrl === 'null' || upscaledImageUrl === 'undefined') {
      return debug.errorResponse(res, '模型返回的图像URL无效', 500);
    }

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
    
    // 根据错误类型返回不同的错误信息
    if (error instanceof Error) {
      if (error.message.includes('Invalid input')) {
        return debug.errorResponse(res, '输入参数无效，请检查图像格式和参数设置', 400, error.message);
      }
      
      if (error.message.includes('rate limit')) {
        return debug.errorResponse(res, 'API调用频率超限，请稍后重试', 429, error.message);
      }
      
      if (error.message.includes('authentication') || error.message.includes('401')) {
        return debug.errorResponse(res, 'Replicate API认证失败，请检查API Token', 401, error.message);
      }
      
      if (error.message.includes('402')) {
        return debug.errorResponse(res, 'Replicate账户余额不足', 402, error.message);
      }
      
      if (error.message.includes('429')) {
        return debug.errorResponse(res, '请求过于频繁，请稍后再试', 429, error.message);
      }
      
      if (error.message.includes('timeout')) {
        return debug.errorResponse(res, '处理超时，请稍后再试', 408, error.message);
      }
    }
    
    return debug.errorResponse(res, '图像超分服务暂时不可用，请稍后再试', 500, error instanceof Error ? error.message : '未知错误');
  }
}
