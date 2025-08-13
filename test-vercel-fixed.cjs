#!/usr/bin/env node

/**
 * Vercel API测试脚本 - 验证修复后的Vercel部署
 */

const https = require('https');
const http = require('http');

// 测试用的小图片base64数据 (1x1像素的PNG)
const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77zgAAAABJRU5ErkJggg==';

// Vercel URL - 需要根据实际部署更新
const VERCEL_URL = process.env.VERCEL_URL || 'https://your-app-name.vercel.app';

/**
 * 发送HTTPS请求
 */
function makeRequest(url, options, data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = client.request(requestOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (error) {
          // 如果不是JSON，返回原始文本
          resolve({ status: res.statusCode, data: body, headers: res.headers, isText: true });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

/**
 * 测试Vercel部署状态
 */
async function testVercelDeployment() {
  console.log('🔍 测试Vercel部署状态...');
  console.log(`📍 URL: ${VERCEL_URL}`);
  
  try {
    const response = await makeRequest(VERCEL_URL, { method: 'GET' });
    
    if (response.status === 200) {
      console.log('✅ Vercel部署正常');
      return true;
    } else {
      console.log('❌ Vercel部署异常:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Vercel部署连接失败:', error.message);
    return false;
  }
}

/**
 * 测试图像分析API
 */
async function testAnalyzeAPI() {
  console.log('🔍 测试Vercel图像分析API...');
  
  try {
    const url = `${VERCEL_URL}/api/analyze`;
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const requestData = {
      imageBase64: testImageBase64
    };

    const response = await makeRequest(url, options, requestData);
    
    if (response.isText) {
      console.log('❌ API返回了HTML而不是JSON:');
      console.log(response.data.substring(0, 200) + '...');
      return false;
    }
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ 图像分析API正常');
      console.log(`   评分: ${response.data.score}`);
      console.log(`   处理时间: ${response.data.processing_time_ms}ms`);
      return true;
    } else {
      console.log('❌ 图像分析API失败:', response);
      return false;
    }
  } catch (error) {
    console.log('❌ 图像分析API错误:', error.message);
    return false;
  }
}

/**
 * 测试图像超分API
 */
async function testUpscaleAPI() {
  console.log('🔍 测试Vercel图像超分API...');
  
  try {
    const url = `${VERCEL_URL}/api/upscale`;
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const requestData = {
      imageBase64: testImageBase64,
      scale: 2,
      face_enhance: false,
      model: 'real-esrgan'
    };

    const response = await makeRequest(url, options, requestData);
    
    if (response.isText) {
      console.log('❌ API返回了HTML而不是JSON:');
      console.log(response.data.substring(0, 200) + '...');
      return false;
    }
    
    // 由于我们使用的是测试图片，可能会因为Replicate API调用而失败
    // 但我们主要关心是否返回了正确的JSON格式
    if (response.status === 200 || (response.status >= 400 && response.data.error)) {
      console.log('✅ 图像超分API响应格式正常');
      if (response.data.error) {
        console.log(`   预期错误: ${response.data.error}`);
      }
      return true;
    } else {
      console.log('❌ 图像超分API异常:', response);
      return false;
    }
  } catch (error) {
    console.log('❌ 图像超分API错误:', error.message);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🚀 开始Vercel API测试...\n');
  
  // 检查URL配置
  if (VERCEL_URL.includes('your-app-name')) {
    console.log('❌ 请设置正确的Vercel URL:');
    console.log('   export VERCEL_URL="https://your-actual-vercel-url.vercel.app"');
    console.log('   node test-vercel-fixed.cjs');
    process.exit(1);
  }
  
  const results = [];
  
  // 测试部署状态
  results.push(await testVercelDeployment());
  console.log('');
  
  // 测试图像分析
  results.push(await testAnalyzeAPI());
  console.log('');
  
  // 测试图像超分
  results.push(await testUpscaleAPI());
  console.log('');
  
  // 汇总结果
  const passedTests = results.filter(r => r).length;
  const totalTests = results.length;
  
  console.log('📊 测试结果汇总:');
  console.log(`   通过: ${passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('🎉 所有Vercel测试通过！');
    process.exit(0);
  } else {
    console.log('⚠️  部分Vercel测试失败，请检查部署配置');
    process.exit(1);
  }
}

// 主程序
async function main() {
  await runTests();
}

main().catch(console.error);
