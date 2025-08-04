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

// 初始化Replicate客户端
// 文档: https://replicate.com/docs/reference/node
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅支持POST请求' });
  }

  try {
    const { imageBase64, scale = 2, face_enhance = false } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: '请提供图像数据' });
    }

    // 验证Replicate API Token
    if (!process.env.REPLICATE_API_TOKEN) {
      return res.status(500).json({ error: 'Replicate API Token未配置' });
    }

    console.log('开始图像超分处理...');

    // 调用Real-ESRGAN模型进行超分
    // 模型文档: https://replicate.com/nightmareai/real-esrgan
    const output = await replicate.run(
      "nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa",
      {
        input: {
          image: imageBase64,
          scale: scale, // 放大倍数: 2, 4, 8
          face_enhance: face_enhance, // 是否启用面部增强
        }
      }
    );

    console.log('超分处理完成');

    // 返回处理结果
    res.status(200).json({
      success: true,
      upscaled_image: output,
      scale: scale,
      face_enhance: face_enhance,
      message: '图像超分处理完成',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('超分处理错误:', error);
    
    // 处理不同类型的错误
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        return res.status(401).json({ error: 'Replicate API认证失败，请检查API Token' });
      }
      
      if (error.message.includes('402')) {
        return res.status(402).json({ error: 'Replicate账户余额不足' });
      }
      
      if (error.message.includes('429')) {
        return res.status(429).json({ error: '请求过于频繁，请稍后再试' });
      }
      
      if (error.message.includes('timeout')) {
        return res.status(408).json({ error: '处理超时，请稍后再试' });
      }
    }
    
    res.status(500).json({ 
      error: '图像超分服务暂时不可用，请稍后再试',
      details: process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined
    });
  }
}
