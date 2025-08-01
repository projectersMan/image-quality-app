import type { VercelRequest, VercelResponse } from '@vercel/node';
import Replicate from 'replicate';

// 初始化Replicate客户端
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

    if (!imageUrl && !imageBase64) {
      return res.status(400).json({ error: '请提供图片URL或base64数据' });
    }

    console.log('开始AI分析...');

    // 调用Replicate AI进行图像质量分析
    // 使用LLAVA模型进行图像质量评估
    const prediction = await replicate.predictions.create({
      version: "yorickvp/llava-13b:b5f6212d032508382d61ff00469ddda3e32fd8a0e75dc39d8a4191bb742157fb",
      input: {
        image: imageBase64 || imageUrl,
        prompt: "Please analyze this image quality and rate it from 1 to 10 based on factors like sharpness, clarity, lighting, composition, and overall visual appeal. Only respond with a single number between 1 and 10, with one decimal place if needed. For example: 7.5",
        max_tokens: 10
      },
    });

    console.log('等待AI分析结果...');
    
    // 等待预测完成
    const result = await replicate.wait(prediction);
    
    console.log('AI分析原始结果:', result.output);

    // 解析结果，提取数字评分
    let score = 5.0; // 默认评分
    
    if (result.output) {
      const outputText = Array.isArray(result.output) ? result.output.join('') : result.output;
      const scoreMatch = outputText.match(/\d+\.?\d*/); 
      
      if (scoreMatch) {
        const extractedScore = parseFloat(scoreMatch[0]);
        // 确保评分在1-10范围内
        if (extractedScore >= 1 && extractedScore <= 10) {
          score = extractedScore;
        }
      }
    }

    console.log('最终评分:', score);

    // 返回结果
    res.status(200).json({
      score: score,
      message: '分析完成',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI分析错误:', error);
    
    // 根据错误类型返回不同的错误信息
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return res.status(429).json({ error: '请求过于频繁，请稍后再试' });
      }
      if (error.message.includes('authentication')) {
        return res.status(401).json({ error: '服务认证失败' });
      }
    }
    
    res.status(500).json({ 
      error: '图像分析服务暂时不可用，请稍后再试',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
}