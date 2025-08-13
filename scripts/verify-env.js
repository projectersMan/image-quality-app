#!/usr/bin/env node
/**
 * 环境变量验证脚本
 * 确保本地开发环境与Vercel生产环境的配置一致
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 必需的环境变量配置
const REQUIRED_ENV_VARS = {
  // Replicate AI (必需)
  'REPLICATE_API_TOKEN': {
    required: true,
    pattern: /^r8_[a-zA-Z0-9]{32}$/,
    description: 'Replicate API Token (格式: r8_xxxxxxxx)',
    example: 'r8_your_actual_token_here'
  },
  
  // Clerk 用户认证 (必需)
  'VITE_CLERK_PUBLISHABLE_KEY': {
    required: true,
    pattern: /^pk_(test_|live_)[a-zA-Z0-9]+$/,
    description: 'Clerk Publishable Key (前端使用)',
    example: 'pk_test_your_actual_key_here'
  },
  'CLERK_SECRET_KEY': {
    required: true,
    pattern: /^sk_(test_|live_)[a-zA-Z0-9]+$/,
    description: 'Clerk Secret Key (后端使用)',
    example: 'sk_test_your_actual_key_here'
  },
  
  // Stripe 支付 (可选)
  'VITE_STRIPE_PUBLISHABLE_KEY': {
    required: false,
    pattern: /^pk_(test_|live_)[a-zA-Z0-9]+$/,
    description: 'Stripe Publishable Key (前端使用)',
    example: 'pk_test_your_actual_key_here'
  },
  'STRIPE_SECRET_KEY': {
    required: false,
    pattern: /^sk_(test_|live_)[a-zA-Z0-9]+$/,
    description: 'Stripe Secret Key (后端使用)',
    example: 'sk_test_your_actual_key_here'
  },
  'STRIPE_WEBHOOK_SECRET': {
    required: false,
    pattern: /^whsec_[a-zA-Z0-9]+$/,
    description: 'Stripe Webhook Secret',
    example: 'whsec_your_actual_secret_here'
  },
  'VITE_STRIPE_PRICE_ID': {
    required: false,
    pattern: /^price_[a-zA-Z0-9]+$/,
    description: 'Stripe Price ID',
    example: 'price_your_actual_price_here'
  },
  
  // 环境配置
  'NODE_ENV': {
    required: false,
    pattern: /^(development|production|test)$/,
    description: 'Node.js 环境',
    example: 'development'
  }
};

/**
 * 读取环境变量文件
 * @param {string} filePath - 文件路径
 * @returns {Object} 环境变量对象
 */
function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  
  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  return env;
}

/**
 * 验证单个环境变量
 * @param {string} key - 变量名
 * @param {string} value - 变量值
 * @param {Object} config - 变量配置
 * @returns {Object} 验证结果
 */
function validateEnvVar(key, value, config) {
  const result = {
    key,
    valid: true,
    errors: [],
    warnings: []
  };
  
  // 检查必需变量
  if (config.required && (!value || value === config.example)) {
    result.valid = false;
    result.errors.push(`必需变量 ${key} 未配置或使用示例值`);
    return result;
  }
  
  // 如果变量存在，检查格式
  if (value && value !== config.example) {
    if (config.pattern && !config.pattern.test(value)) {
      result.valid = false;
      result.errors.push(`${key} 格式不正确。期望格式: ${config.description}`);
    }
  }
  
  // 检查是否使用示例值
  if (value === config.example) {
    result.warnings.push(`${key} 仍在使用示例值，请替换为真实的API密钥`);
  }
  
  return result;
}

/**
 * 验证环境变量配置
 * @param {Object} env - 环境变量对象
 * @param {string} envName - 环境名称
 * @returns {Object} 验证结果
 */
function validateEnvironment(env, envName) {
  console.log(`\n🔍 验证 ${envName} 环境变量...`);
  
  const results = [];
  let hasErrors = false;
  let hasWarnings = false;
  
  Object.entries(REQUIRED_ENV_VARS).forEach(([key, config]) => {
    const value = env[key];
    const result = validateEnvVar(key, value, config);
    results.push(result);
    
    if (!result.valid) {
      hasErrors = true;
      console.log(`❌ ${result.errors.join(', ')}`);
    } else if (result.warnings.length > 0) {
      hasWarnings = true;
      console.log(`⚠️  ${result.warnings.join(', ')}`);
    } else if (value && value !== config.example) {
      console.log(`✅ ${key}: 配置正确`);
    }
  });
  
  return {
    envName,
    results,
    hasErrors,
    hasWarnings,
    summary: {
      total: results.length,
      valid: results.filter(r => r.valid).length,
      errors: results.filter(r => !r.valid).length,
      warnings: results.filter(r => r.warnings.length > 0).length
    }
  };
}

/**
 * 比较两个环境的配置差异
 * @param {Object} localEnv - 本地环境变量
 * @param {Object} exampleEnv - 示例环境变量
 * @returns {Object} 差异报告
 */
function compareEnvironments(localEnv, exampleEnv) {
  console.log('\n🔄 比较环境配置差异...');
  
  const differences = [];
  
  // 检查缺失的变量
  Object.keys(REQUIRED_ENV_VARS).forEach(key => {
    const config = REQUIRED_ENV_VARS[key];
    const localValue = localEnv[key];
    const exampleValue = exampleEnv[key];
    
    if (config.required && !localValue) {
      differences.push({
        type: 'missing',
        key,
        message: `本地环境缺少必需变量: ${key}`
      });
    }
    
    if (localValue && exampleValue && localValue !== exampleValue) {
      differences.push({
        type: 'different',
        key,
        message: `${key} 在两个环境中值不同`
      });
    }
  });
  
  // 检查多余的变量
  Object.keys(localEnv).forEach(key => {
    if (!REQUIRED_ENV_VARS[key] && !key.startsWith('VITE_')) {
      differences.push({
        type: 'extra',
        key,
        message: `本地环境包含未知变量: ${key}`
      });
    }
  });
  
  if (differences.length === 0) {
    console.log('✅ 环境配置一致');
  } else {
    differences.forEach(diff => {
      const icon = diff.type === 'missing' ? '❌' : diff.type === 'extra' ? '⚠️' : 'ℹ️';
      console.log(`${icon} ${diff.message}`);
    });
  }
  
  return differences;
}

/**
 * 生成环境变量配置建议
 * @param {Object} validation - 验证结果
 */
function generateRecommendations(validation) {
  console.log('\n💡 配置建议:');
  
  if (validation.hasErrors) {
    console.log('\n🚨 必须修复的问题:');
    validation.results.forEach(result => {
      if (!result.valid) {
        const config = REQUIRED_ENV_VARS[result.key];
        console.log(`   • ${result.key}: ${config.description}`);
        console.log(`     示例: ${config.example}`);
        console.log(`     获取地址: ${getApiKeyUrl(result.key)}`);
      }
    });
  }
  
  if (validation.hasWarnings) {
    console.log('\n⚠️  建议优化的配置:');
    validation.results.forEach(result => {
      if (result.warnings.length > 0) {
        console.log(`   • ${result.key}: 请替换为真实的API密钥`);
      }
    });
  }
  
  console.log('\n📖 详细配置指南:');
  console.log('   • Replicate: https://replicate.com/account/api-tokens');
  console.log('   • Clerk: https://dashboard.clerk.com/');
  console.log('   • Stripe: https://dashboard.stripe.com/apikeys');
  console.log('   • 完整指南: ./doc/DEPLOYMENT.md');
}

/**
 * 获取API密钥的获取地址
 * @param {string} key - 环境变量名
 * @returns {string} 获取地址
 */
function getApiKeyUrl(key) {
  const urls = {
    'REPLICATE_API_TOKEN': 'https://replicate.com/account/api-tokens',
    'VITE_CLERK_PUBLISHABLE_KEY': 'https://dashboard.clerk.com/',
    'CLERK_SECRET_KEY': 'https://dashboard.clerk.com/',
    'VITE_STRIPE_PUBLISHABLE_KEY': 'https://dashboard.stripe.com/apikeys',
    'STRIPE_SECRET_KEY': 'https://dashboard.stripe.com/apikeys',
    'STRIPE_WEBHOOK_SECRET': 'https://dashboard.stripe.com/webhooks',
    'VITE_STRIPE_PRICE_ID': 'https://dashboard.stripe.com/products'
  };
  return urls[key] || '请查看项目文档';
}

/**
 * 主函数
 */
function main() {
  console.log('🔧 图像质量AI应用 - 环境变量验证工具\n');
  
  // 检查setenv.sh文件是否存在
  const setenvPath = path.join(projectRoot, 'setenv.sh');
  const setenvExamplePath = path.join(projectRoot, 'setenv.sh.example');
  
  if (!fs.existsSync(setenvPath)) {
    console.log('❌ 未找到 setenv.sh 文件');
    if (fs.existsSync(setenvExamplePath)) {
      console.log('💡 请复制 setenv.sh.example 为 setenv.sh 并配置真实的API密钥:');
      console.log('   cp setenv.sh.example setenv.sh');
    } else {
      console.log('💡 请创建 setenv.sh 文件并配置必需的环境变量');
    }
    process.exit(1);
  }
  
  // 直接从process.env读取当前环境变量
  const currentEnv = {};
  Object.keys(REQUIRED_ENV_VARS).forEach(key => {
    if (process.env[key]) {
      currentEnv[key] = process.env[key];
    }
  });
  
  // 验证当前环境变量
  const validation = validateEnvironment(currentEnv, '当前环境变量');
  
  // 生成建议
  if (validation.hasErrors) {
    console.log('\n💡 建议:');
    console.log('1. 确保已运行: source setenv.sh');
    console.log('2. 检查 setenv.sh 中的API密钥是否正确配置');
    console.log('3. 确保所有示例值都已替换为真实的API密钥');
    generateRecommendations(validation);
  }
  
  // 输出总结
  console.log('\n📊 验证总结:');
  console.log(`   • 当前环境: ${validation.summary.valid}/${validation.summary.total} 配置正确`);
  console.log(`   • 错误数量: ${validation.summary.errors}`);
  console.log(`   • 警告数量: ${validation.summary.warnings}`);
  
  // 退出码
  const exitCode = validation.hasErrors ? 1 : 0;
  if (exitCode === 0) {
    console.log('\n✅ 环境变量验证通过！');
  } else {
    console.log('\n❌ 环境变量验证失败，请修复上述问题后重试。');
  }
  
  process.exit(exitCode);
}

// 运行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  validateEnvironment,
  compareEnvironments,
  REQUIRED_ENV_VARS
};