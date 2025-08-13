/**
 * 共享API处理逻辑
 * 确保本地开发环境与Vercel生产环境的代码完全一致
 */

/**
 * 初始化Replicate客户端
 * @param {string} apiToken - Replicate API Token
 * @returns {Object} Replicate客户端实例
 */
function createReplicateClient(apiToken) {
  if (!apiToken) {
    throw new Error('REPLICATE_API_TOKEN is required');
  }
  const Replicate = require('replicate');
  return new Replicate({ auth: apiToken });
}

/**
 * 验证图像数据
 * @param {string} imageBase64 - Base64编码的图像数据
 * @returns {boolean} 验证结果
 */
function validateImageData(imageBase64) {
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
function validateUpscaleParams(model, scale) {
  // 验证模型类型
  const supportedModels = ['real-esrgan', 'aura-sr-v2'];
  if (!supportedModels.includes(model)) {
    throw new Error(`不支持的模型类型: ${model}。支持的模型: ${supportedModels.join(', ')}`);
  }
  
  // 验证缩放倍数
  const supportedScales = [2, 4, 8];
  if (!supportedScales.includes(scale)) {
    throw new Error(`不支持的缩放倍数: ${scale}。支持的倍数: ${supportedScales.join(', ')}`);
  }
  
  return true;
}

/**
 * 构建模型配置
 * @param {string} model - 模型名称
 * @param {string} imageBase64 - Base64编码的图像数据
 * @param {number} scale - 缩放倍数
 * @param {boolean} face_enhance - 是否启用面部增强
 * @returns {Object} 模型配置对象
 */
function buildModelConfig(model, imageBase64, scale, face_enhance = false) {
  let modelId;
  let modelInput;
  
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
  
  return { modelId, modelInput };
}

/**
 * 执行图像超分处理 - 统一接口
 * @param {string} imageBase64 - Base64编码的图像数据
 * @param {number} scale - 缩放倍数
 * @param {boolean} face_enhance - 是否启用面部增强
 * @param {string} model - 模型名称
 * @param {string} apiToken - API Token
 * @returns {Promise<Object>} 处理结果
 */
async function processUpscale(imageBase64, scale = 2, face_enhance = false, model = 'real-esrgan', apiToken) {
  const startTime = Date.now();

  try {
    // 验证输入参数
    validateImageData(imageBase64);
    validateUpscaleParams(model, scale);

    // 创建Replicate客户端
    const replicate = createReplicateClient(apiToken);

    // 构建模型配置
    const { modelId, modelInput } = buildModelConfig(model, imageBase64, scale, face_enhance);

    // 调用Replicate API
    console.log(`🚀 开始处理图像超分，模型: ${model}, 缩放倍数: ${scale}x`);
    const output = await replicate.run(modelId, { input: modelInput });

    if (!output || (Array.isArray(output) && output.length === 0)) {
      throw new Error('超分处理失败：模型返回空结果');
    }

    // 处理输出结果
    const upscaledImageUrl = Array.isArray(output) ? output[0] : output;

    const processingTime = Date.now() - startTime;
    console.log(`✅ 图像超分处理完成，耗时: ${processingTime}ms`);

    return {
      success: true,
      upscaled_image: upscaledImageUrl,
      scale: scale,
      face_enhance: face_enhance,
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
 * 基础图像信息分析
 * @param {string} imageBase64 - Base64编码的图像数据
 * @returns {Object} 图像基础信息
 */
function analyzeImageBasic(imageBase64) {
  // 解析Base64数据
  const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  
  // 获取图像格式
  let format = 'unknown';
  if (imageBase64.includes('data:image/jpeg')) format = 'jpeg';
  else if (imageBase64.includes('data:image/png')) format = 'png';
  else if (imageBase64.includes('data:image/webp')) format = 'webp';
  
  // 估算分辨率（基于文件大小的粗略估算）
  const size = buffer.length;
  let estimatedResolution;
  
  if (format === 'jpeg') {
    // JPEG压缩比约为1:10-1:20
    estimatedResolution = size * 15;
  } else if (format === 'png') {
    // PNG压缩比约为1:3-1:5
    estimatedResolution = size * 4;
  } else {
    // 默认估算
    estimatedResolution = size * 8;
  }
  
  return {
    format,
    size,
    resolution: estimatedResolution
  };
}

/**
 * 计算基础质量评分
 * @param {Object} imageInfo - 图像信息
 * @returns {number} 质量评分 (1-10)
 */
function calculateBasicScore(imageInfo) {
  let score = 5.0; // 基础分数
  
  // 基于分辨率调整分数
  if (imageInfo.resolution >= 2000000) score += 2.0; // 高分辨率
  else if (imageInfo.resolution >= 1000000) score += 1.0; // 中等分辨率
  else if (imageInfo.resolution < 300000) score -= 1.0; // 低分辨率
  
  // 基于文件大小调整分数
  if (imageInfo.size > 1000000) score += 0.5; // 大文件通常质量更好
  else if (imageInfo.size < 50000) score -= 0.5; // 小文件可能过度压缩
  
  // 基于格式调整分数
  if (imageInfo.format === 'png') score += 0.3; // PNG通常质量更好
  else if (imageInfo.format === 'webp') score += 0.2; // WebP平衡质量和大小
  
  // 确保分数在1-10范围内
  return Math.max(1.0, Math.min(10.0, Math.round(score * 10) / 10));
}

/**
 * 执行图像质量分析 - 统一接口
 * @param {string} imageBase64 - Base64编码的图像数据
 * @param {string} apiToken - API Token (暂时未使用)
 * @returns {Promise<Object>} 分析结果
 */
async function processAnalyze(imageBase64, apiToken) {
  const startTime = Date.now();

  try {
    // 验证输入参数
    validateImageData(imageBase64);

    console.log('🔍 开始图像质量分析（基础模式）');

    // 暂时使用基础的图像分析，避免复杂模型的兼容性问题
    // 基于图像大小和格式进行简单评估
    const imageInfo = analyzeImageBasic(imageBase64);

    // 生成基于图像属性的评分
    let score = calculateBasicScore(imageInfo);

    const processingTime = Date.now() - startTime;
    console.log(`✅ 图像质量分析完成，评分: ${score}/10.0，耗时: ${processingTime}ms`);

    return {
      success: true,
      score: score,
      analysis: {
        format: imageInfo.format,
        size: imageInfo.size,
        quality_factors: {
          resolution: imageInfo.resolution >= 1000000 ? 'high' : imageInfo.resolution >= 500000 ? 'medium' : 'low',
          file_size: imageInfo.size > 500000 ? 'large' : imageInfo.size > 100000 ? 'medium' : 'small'
        }
      },
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
 * @param {Error} error - 错误对象
 * @param {Object} context - 上下文信息
 * @returns {Object} 格式化的错误响应
 */
function formatErrorResponse(error, context = {}) {
  return {
    success: false,
    error: error.message || '未知错误',
    context,
    timestamp: new Date().toISOString()
  };
}

/**
 * 格式化成功响应
 * @param {any} data - 响应数据
 * @param {string} message - 响应消息
 * @returns {Object} 格式化的成功响应
 */
function formatSuccessResponse(data, message = '操作成功') {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  };
}

// CommonJS导出
module.exports = {
  createReplicateClient,
  validateImageData,
  validateUpscaleParams,
  buildModelConfig,
  processUpscale,
  processAnalyze,
  formatErrorResponse,
  formatSuccessResponse
};