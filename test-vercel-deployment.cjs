#!/usr/bin/env node

/**
 * Vercel部署验证测试脚本
 * 用于测试部署到Vercel后的API是否正常工作
 */

const https = require('https');
const http = require('http');

// 配置
const VERCEL_URL = process.env.VERCEL_URL || 'https://your-app.vercel.app';
const TEST_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// HTTP请求函数
function makeRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    
    const req = protocol.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(body);
          resolve({ statusCode: res.statusCode, data: jsonData, rawBody: body });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: null, rawBody: body, parseError: e.message });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// 测试健康检查
async function testHealth() {
  log('cyan', '\n🏥 测试健康检查...');
  
  try {
    const response = await makeRequest(`${VERCEL_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    log('blue', `状态码: ${response.statusCode}`);
    
    if (response.parseError) {
      log('red', `❌ JSON解析错误: ${response.parseError}`);
      log('yellow', `原始响应: ${response.rawBody.substring(0, 200)}...`);
      return false;
    }
    
    if (response.statusCode === 200 && response.data.success) {
      log('green', '✅ 健康检查通过');
      return true;
    } else {
      log('red', `❌ 健康检查失败`);
      log('yellow', `响应: ${JSON.stringify(response.data, null, 2)}`);
      return false;
    }
  } catch (error) {
    log('red', `❌ 健康检查请求失败: ${error.message}`);
    return false;
  }
}

// 测试图像分析API
async function testAnalyze() {
  log('cyan', '\n🧪 测试 /api/analyze...');
  
  try {
    const response = await makeRequest(`${VERCEL_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      image: TEST_IMAGE
    });
    
    log('blue', `状态码: ${response.statusCode}`);
    
    if (response.parseError) {
      log('red', `❌ JSON解析错误: ${response.parseError}`);
      log('yellow', `原始响应: ${response.rawBody.substring(0, 500)}...`);
      return false;
    }
    
    if (response.statusCode === 200 && response.data.success) {
      log('green', '✅ 图像分析API正常');
      log('blue', `分析结果: ${JSON.stringify(response.data, null, 2)}`);
      return true;
    } else {
      log('red', `❌ 图像分析API失败`);
      log('yellow', `响应: ${JSON.stringify(response.data, null, 2)}`);
      return false;
    }
  } catch (error) {
    log('red', `❌ 图像分析请求失败: ${error.message}`);
    return false;
  }
}

// 测试图像超分API
async function testUpscale() {
  log('cyan', '\n🚀 测试 /api/upscale...');
  
  try {
    const response = await makeRequest(`${VERCEL_URL}/api/upscale`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      image: TEST_IMAGE,
      scale: 2,
      face_enhance: false,
      model: 'real-esrgan'
    });
    
    log('blue', `状态码: ${response.statusCode}`);
    
    if (response.parseError) {
      log('red', `❌ JSON解析错误: ${response.parseError}`);
      log('yellow', `原始响应: ${response.rawBody.substring(0, 500)}...`);
      return false;
    }
    
    if (response.statusCode === 200 && response.data.success) {
      log('green', '✅ 图像超分API正常');
      log('blue', `处理结果: ${JSON.stringify(response.data, null, 2)}`);
      return true;
    } else {
      log('red', `❌ 图像超分API失败`);
      log('yellow', `响应: ${JSON.stringify(response.data, null, 2)}`);
      return false;
    }
  } catch (error) {
    log('red', `❌ 图像超分请求失败: ${error.message}`);
    return false;
  }
}

// 主测试函数
async function runTests() {
  log('magenta', '🔧 Vercel部署验证测试');
  log('blue', `测试目标: ${VERCEL_URL}`);
  
  const results = {
    health: await testHealth(),
    analyze: await testAnalyze(),
    upscale: await testUpscale()
  };
  
  // 总结
  log('cyan', '\n📊 测试结果总结:');
  log(results.health ? 'green' : 'red', `健康检查: ${results.health ? '✅ 通过' : '❌ 失败'}`);
  log(results.analyze ? 'green' : 'red', `图像分析: ${results.analyze ? '✅ 通过' : '❌ 失败'}`);
  log(results.upscale ? 'green' : 'red', `图像超分: ${results.upscale ? '✅ 通过' : '❌ 失败'}`);
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    log('green', '\n🎉 所有测试通过！Vercel部署成功！');
    process.exit(0);
  } else {
    log('red', '\n❌ 部分测试失败，请检查Vercel部署配置');
    log('yellow', '\n💡 故障排除提示:');
    log('yellow', '1. 检查环境变量是否正确设置');
    log('yellow', '2. 确认API函数没有语法错误');
    log('yellow', '3. 查看Vercel函数日志');
    log('yellow', '4. 验证依赖项是否正确安装');
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  runTests().catch(error => {
    log('red', `❌ 测试运行失败: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { runTests, testHealth, testAnalyze, testUpscale };