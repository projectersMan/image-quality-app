/**
 * 共享API处理逻辑 (ES模块版本)
 * 确保本地开发环境与Vercel生产环境的代码完全一致
 */

import Replicate from 'replicate';

/**
 * 初始化Replicate客户端
 * @param {string} apiToken - Replicate API Token
 * @returns {Object} Replicate客户端实例
 */
export function createReplicateClient(apiToken) {
  if (!apiToken) {
    throw new Error('REPLICATE_API_TOKEN is required');
  }
  return new Replicate({ auth: apiToken });
}

/**
 * 验证图像数据
 * @param {string} imageBase64 - Base64编码的图像数据
 * @returns {boolean} 验证结果
 */
export function validateImageData(imageBase64) {
  if (!imageBase64) {
    throw new Error('缺少图像数据，请提供base64编码的图像数据');
  }
  
  // 检查是否为有效的base64格式
  const base64Regex = /^data:image\/(jpeg|jpg|png|webp);base64,/;
  if (!base64Regex.test(imageBase64)) {
    throw new Error('图像格式不支持，请使用JPG、PNG或WEBP格式');
  }
  
  return true;
}

/**
 * 验证超分参数
 * @param {string} model - 模型名称
 * @param {number} scale - 缩放倍数
 * @returns {boolean} 验证结果
 */
export function validateUpscaleParams(model, scale) {
  // 验证模型类型
  const supportedModels = ['real-esrgan', 'aura-sr-v2'];
  if (!supportedModels.includes(model)) {
    throw new Error(`不支持的模型类型: ${model}。支持的模型: ${supportedModels.join(', ')}`);
  }
  
  // 验证缩放倍数
  const validScales = [2, 4, 8];
  if (!validScales.includes(scale)) {
    throw new Error(`不支持的缩放倍数: ${scale}。支持的倍数: ${validScales.join(', ')}`);
  }
  
  return true;
}

/**
 * 构建模型配置
 * @param {string} imageBase64 - Base64编码的图像数据
 * @param {number} scale - 缩放倍数
 * @param {boolean} faceEnhance - 是否启用面部增强
 * @returns {Object} 模型配置对象
 */
export function buildModelConfig(imageBase64, scale = 2, faceEnhance = true) {
  return {
    image: imageBase64,
    scale: scale,
    face_enhance: faceEnhance
  };
}

/**
 * 处理图像超分请求 - 统一接口
 * @param {string} imageBase64 - Base64编码的图像数据
 * @param {number} scale - 缩放倍数
 * @param {boolean} faceEnhance - 是否启用面部增强
 * @param {string} model - 模型类型
 * @param {string} apiToken - API Token
 * @returns {Promise<Object>} 处理结果
 */
export async function processUpscale(imageBase64, scale = 2, faceEnhance = true, model = 'real-esrgan', apiToken) {
  const startTime = Date.now();

  try {
    // 验证输入参数
    validateImageData(imageBase64);
    validateUpscaleParams(model, scale);

    // 创建Replicate客户端
    const replicate = createReplicateClient(apiToken);

    // 构建模型配置
    const input = buildModelConfig(imageBase64, scale, faceEnhance);

    // 选择模型 - 使用正确的模型ID
    let modelName;
    switch (model) {
      case 'real-esrgan':
        modelName = 'nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa';
        break;
      case 'aura-sr-v2':
        modelName = 'zsxkib/aura-sr-v2:5c137257cce8d5ce16e8a334b70e9e025106b5580affed0bc7d48940b594e74c';
        break;
      default:
        throw new Error(`不支持的模型: ${model}`);
    }

    // 调用Replicate API
    console.log(`🚀 开始处理图像超分，模型: ${model}, 缩放倍数: ${scale}x`);
    const output = await replicate.run(modelName, { input });

    // 处理输出结果
    let upscaledImageUrl;
    if (Array.isArray(output)) {
      upscaledImageUrl = output[0];
    } else if (typeof output === 'string') {
      upscaledImageUrl = output;
    } else {
      throw new Error('模型返回了无效的输出格式');
    }

    if (!upscaledImageUrl) {
      throw new Error('模型返回了空结果');
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ 图像超分处理完成，耗时: ${processingTime}ms`);

    return {
      success: true,
      upscaled_image: upscaledImageUrl,
      scale: scale,
      face_enhance: faceEnhance,
      model: model,
      message: '图像超分处理完成',
      timestamp: new Date().toISOString(),
      processing_time_ms: processingTime,
      environment: process.env.NODE_ENV || 'development'
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ 图像超分处理失败:', error.message);

    // 统一错误处理
    if (error.message?.includes('insufficient_quota')) {
      throw new Error('API配额不足，请检查Replicate账户余额');
    } else if (error.message?.includes('rate_limit')) {
      throw new Error('请求频率过高，请稍后再试');
    } else if (error.message?.includes('authentication')) {
      throw new Error('API认证失败，请检查REPLICATE_API_TOKEN配置');
    } else {
      throw new Error(`图像超分处理失败: ${error.message}`);
    }
  }
}

/**
 * 分析图像基础信息
 * @param {string} imageBase64 - Base64编码的图像数据
 * @returns {Object} 分析结果
 */
function analyzeImageBasic(imageBase64) {
  // 提取图像格式
  const formatMatch = imageBase64.match(/^data:image\/(\w+);base64,/);
  const format = formatMatch ? formatMatch[1] : 'unknown';
  
  // 计算文件大小（近似值）
  const base64Data = imageBase64.split(',')[1] || '';
  const sizeBytes = Math.round((base64Data.length * 3) / 4);
  
  // 基础质量评估
  const qualityFactors = {
    format: format,
    size: sizeBytes,
    quality_factors: {
      resolution: sizeBytes > 100000 ? 'high' : sizeBytes > 50000 ? 'medium' : 'low',
      file_size: sizeBytes > 500000 ? 'large' : sizeBytes > 100000 ? 'medium' : 'small'
    }
  };
  
  return qualityFactors;
}

/**
 * 计算基础质量分数
 * @param {Object} analysis - 图像分析结果
 * @returns {number} 质量分数 (1-5)
 */
function calculateBasicScore(analysis) {
  let score = 3.0; // 基础分数
  
  // 根据分辨率调整分数
  if (analysis.quality_factors.resolution === 'high') {
    score += 1.0;
  } else if (analysis.quality_factors.resolution === 'low') {
    score -= 0.5;
  }
  
  // 根据文件大小调整分数
  if (analysis.quality_factors.file_size === 'large') {
    score += 0.5;
  } else if (analysis.quality_factors.file_size === 'small') {
    score -= 0.3;
  }
  
  // 根据格式调整分数
  if (analysis.format === 'png') {
    score += 0.3;
  } else if (analysis.format === 'webp') {
    score += 0.2;
  } else if (analysis.format === 'jpeg' || analysis.format === 'jpg') {
    score -= 0.2;
  }
  
  // 确保分数在1-5范围内
  return Math.max(1.0, Math.min(5.0, Math.round(score * 10) / 10));
}

/**
 * 处理图像质量分析请求 - 统一接口
 * @param {string} imageBase64 - Base64编码的图像数据
 * @param {string} apiToken - API Token (暂时未使用)
 * @returns {Promise<Object>} 分析结果
 */
export async function processAnalyze(imageBase64, apiToken) {
  const startTime = Date.now();

  try {
    // 验证输入参数
    validateImageData(imageBase64);

    console.log('🔍 开始图像质量分析（基础模式）');

    // 执行基础图像分析
    const analysis = analyzeImageBasic(imageBase64);
    const score = calculateBasicScore(analysis);

    const processingTime = Date.now() - startTime;
    console.log(`✅ 图像质量分析完成，评分: ${score}/5.0，耗时: ${processingTime}ms`);

    return {
      success: true,
      score: score,
      analysis: analysis,
      message: '图像质量分析完成（基础模式）',
      timestamp: new Date().toISOString(),
      processing_time_ms: processingTime,
      environment: process.env.NODE_ENV || 'development'
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ 图像质量分析失败:', error.message);

    // 统一错误处理
    if (error.message?.includes('rate_limit')) {
      throw new Error('请求频率过高，请稍后再试');
    } else if (error.message?.includes('authentication')) {
      throw new Error('API认证失败，请检查REPLICATE_API_TOKEN配置');
    } else {
      throw new Error(`图像质量分析失败: ${error.message}`);
    }
  }
}

/**
 * 格式化错误响应
 * @param {string} message - 错误信息
 * @param {number} statusCode - HTTP状态码
 * @returns {Object} 格式化的错误响应
 */
export function formatErrorResponse(message, statusCode = 500) {
  return {
    error: message,
    timestamp: new Date().toISOString(),
    statusCode: statusCode
  };
}

/**
 * 格式化成功响应
 * @param {Object} data - 响应数据
 * @returns {Object} 格式化的成功响应
 */
export function formatSuccessResponse(data) {
  return {
    ...data,
    timestamp: new Date().toISOString()
  };
}