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
const { processAnalyze } = require('../shared/api-handlers.cjs');

// 初始化Replicate客户端
// 文档: https://replicate.com/docs/reference/node
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持POST请求' });
  }

  try {
    // 检查Replicate API token
    if (!process.env.REPLICATE_API_TOKEN) {
      return res.status(500).json({ error: '服务器配置错误：缺少REPLICATE_API_TOKEN' });
    }

    const { imageUrl, imageBase64 } = req.body;
    const imageData = imageBase64 || imageUrl;

    if (!imageData) {
      return res.status(400).json({ error: '请提供图片URL或base64数据' });
    }

    console.log('开始AI分析...');

    // 使用共享的processAnalyze函数
    const analysisResult = await processAnalyze(replicate, imageData);

    console.log('最终评分:', analysisResult.score);

    // 返回结果
    res.status(200).json({
      score: analysisResult.score,
      message: '分析完成',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI分析错误:', error);
    
    // 统一的错误处理
    const statusCode = error.statusCode || 500;
    const errorMessage = error.message || '图像分析服务暂时不可用，请稍后再试';
    
    res.status(statusCode).json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined
    });
  }
}