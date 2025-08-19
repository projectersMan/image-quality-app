/**
 * Autopilot智能分析API
 * 
 * 📖 功能说明: 自动分析图像质量问题，为每个增强维度生成评分和推荐
 * 🤖 分析维度: 
 *   - 影调质量评分（亮度、对比度、色彩平衡）
 *   - 细节清晰度评分（锐度、噪点、纹理）
 *   - 分辨率适配评分
 * 🎯 输出结果: 评分 + 自动推荐的增强模式和参数
 * 
 * 环境变量:
 * - REPLICATE_API_TOKEN: Replicate API密钥
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Replicate from 'replicate';
import { createDebugMiddleware } from '../debug/api-debug.mjs';
import { processAnalyze } from '../shared/api-handlers.mjs';

// 初始化Replicate客户端
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

/**
 * 智能分析图像质量并生成增强建议
 */
async function analyzeImageQuality(imageBase64: string) {
  // 使用现有的分析功能获取基础质量信息
  const basicAnalysis = await processAnalyze(imageBase64, process.env.REPLICATE_API_TOKEN!);
  
  // 基于分析结果计算各维度评分
  const scores = calculateQualityScores(basicAnalysis);
  
  // 生成增强建议
  const recommendations = generateEnhancementRecommendations(scores);
  
  return {
    scores,
    recommendations,
    basicAnalysis
  };
}

/**
 * 计算质量评分（0-100分）
 */
function calculateQualityScores(analysis: any) {
  // 影调质量评分
  const toneScore = calculateToneScore(analysis);
  
  // 细节清晰度评分
  const detailScore = calculateDetailScore(analysis);
  
  // 分辨率适配评分
  const resolutionScore = calculateResolutionScore(analysis);
  
  return {
    tone: Math.round(toneScore),
    detail: Math.round(detailScore),
    resolution: Math.round(resolutionScore),
    overall: Math.round((toneScore + detailScore + resolutionScore) / 3)
  };
}

/**
 * 计算影调质量评分
 */
function calculateToneScore(analysis: any): number {
  let score = 70; // 基础分数
  
  // 根据分析结果调整分数
  if (analysis.quality_issues) {
    if (analysis.quality_issues.includes('underexposed')) score -= 20;
    if (analysis.quality_issues.includes('overexposed')) score -= 20;
    if (analysis.quality_issues.includes('low_contrast')) score -= 15;
    if (analysis.quality_issues.includes('color_cast')) score -= 15;
  }
  
  // 确保分数在0-100范围内
  return Math.max(0, Math.min(100, score));
}

/**
 * 计算细节清晰度评分
 */
function calculateDetailScore(analysis: any): number {
  let score = 75; // 基础分数
  
  if (analysis.quality_issues) {
    if (analysis.quality_issues.includes('blurry')) score -= 25;
    if (analysis.quality_issues.includes('noisy')) score -= 20;
    if (analysis.quality_issues.includes('compression_artifacts')) score -= 15;
    if (analysis.quality_issues.includes('soft_details')) score -= 10;
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * 计算分辨率适配评分
 */
function calculateResolutionScore(analysis: any): number {
  let score = 80; // 基础分数
  
  // 根据图像尺寸判断
  if (analysis.image_info) {
    const { width, height } = analysis.image_info;
    const totalPixels = width * height;
    
    if (totalPixels < 500000) score -= 30; // 小于0.5MP
    else if (totalPixels < 1000000) score -= 20; // 小于1MP
    else if (totalPixels < 2000000) score -= 10; // 小于2MP
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * 生成增强建议
 */
function generateEnhancementRecommendations(scores: any) {
  const recommendations = {
    tone: null as any,
    detail: null as any,
    upscale: null as any,
    priority: [] as string[]
  };
  
  // 影调增强建议
  if (scores.tone < 80) {
    recommendations.tone = {
      enabled: true,
      type: scores.tone < 50 ? 'night' : 'general',
      intensity: scores.tone < 40 ? 2.0 : scores.tone < 60 ? 1.5 : 1.0
    };
    recommendations.priority.push('tone');
  }
  
  // 细节增强建议
  if (scores.detail < 80) {
    recommendations.detail = {
      enabled: true,
      type: scores.detail < 50 ? 'general' : 'general',
      strength: scores.detail < 40 ? 3 : scores.detail < 60 ? 2 : 1
    };
    recommendations.priority.push('detail');
  }
  
  // 超分辨率建议
  if (scores.resolution < 70) {
    recommendations.upscale = {
      enabled: true,
      scale: scores.resolution < 40 ? 4 : scores.resolution < 60 ? 2 : 2,
      model: 'real-esrgan'
    };
    recommendations.priority.push('upscale');
  }
  
  return recommendations;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const debug = createDebugMiddleware('autopilot-analyze');
  
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

    const { imageBase64 } = parsedBody;
    
    debug.apiDebugger.log('info', '开始Autopilot智能分析');
    
    // 检查API Token
    if (!process.env.REPLICATE_API_TOKEN) {
      return debug.errorResponse(res, 'REPLICATE_API_TOKEN未配置', 500);
    }
    
    // 执行智能分析
    const result = await analyzeImageQuality(imageBase64);
    
    const response = {
      success: true,
      scores: result.scores,
      recommendations: result.recommendations,
      message: 'Autopilot智能分析完成',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    };
    
    // 使用调试工具记录响应
    debug.logResponse(res, response);
    
    // 返回处理结果
    return debug.safeJSON(res, response, 200);

  } catch (error) {
    // 使用调试工具记录错误
    debug.logError(error, { requestBody: req.body });
    
    // 统一的错误处理
    const statusCode = error.statusCode || 500;
    const errorMessage = error.message || 'Autopilot分析服务暂时不可用，请稍后再试';
    
    return debug.errorResponse(res, errorMessage, statusCode, error instanceof Error ? error.message : '未知错误');
  }
}
