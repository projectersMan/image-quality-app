/**
 * Vercel部署测试脚本
 * 测试部署到Vercel后的API是否正常工作
 */

const https = require('https');
const http = require('http');

// 配置 - 请根据实际情况修改Vercel URL
// 常见的Vercel URL格式:
// 1. https://your-app-name.vercel.app
// 2. https://your-app-name-git-main-username.vercel.app
// 3. https://your-app-name-username.vercel.app
const VERCEL_URL = process.env.VERCEL_URL || 'https://image-quality-app.vercel.app'; // 请替换为实际的Vercel URL
const LOCAL_URL = 'http://localhost:3000';

// 测试用的base64图像数据（1x1像素PNG）
const TEST_IMAGE_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

// 发送HTTP/HTTPS请求的通用函数
function sendRequest(url, data, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    const urlObj = new URL(url);
    
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Vercel-Test-Script/1.0'
      },
      timeout: timeout
    };

    const req = client.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: responseData,
          url: url
        });
      });
    });

    req.on('error', (error) => {
      reject(new Error(`请求失败: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时'));
    });

    req.write(postData);
    req.end();
  });
}

// 安全的JSON解析
function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

// 测试单个API端点
async function testEndpoint(baseUrl, endpoint, testData, description) {
  console.log(`\n📋 测试: ${description}`);
  console.log(`🔗 URL: ${baseUrl}${endpoint}`);
  console.log('-'.repeat(50));
  
  try {
    const response = await sendRequest(`${baseUrl}${endpoint}`, testData);
    
    console.log(`状态码: ${response.statusCode}`);
    console.log(`响应长度: ${response.body.length} 字符`);
    
    // 检查是否是JSON响应
    const contentType = response.headers['content-type'] || '';
    console.log(`Content-Type: ${contentType}`);
    
    // 尝试解析JSON
    const parsedResponse = safeJsonParse(response.body);
    
    if (parsedResponse === null) {
      console.log('❌ JSON解析失败 - 可能返回了HTML错误页面');
      console.log('原始响应前200字符:');
      console.log(response.body.substring(0, 200));
      if (response.body.length > 200) {
        console.log('...(响应被截断)');
      }
      return false;
    } else {
      console.log('✅ JSON解析成功');
      
      // 显示关键信息
      if (parsedResponse.success !== undefined) {
        console.log(`结果: ${parsedResponse.success ? '成功' : '失败'}`);
      }
      if (parsedResponse.error) {
        console.log(`错误: ${parsedResponse.error}`);
      }
      if (parsedResponse.message) {
        console.log(`消息: ${parsedResponse.message}`);
      }
      if (parsedResponse.score !== undefined) {
        console.log(`评分: ${parsedResponse.score}`);
      }
      if (parsedResponse.upscaled_image) {
        console.log(`超分图像: ${parsedResponse.upscaled_image.substring(0, 50)}...`);
      }
      
      return response.statusCode === 200 && !parsedResponse.error;
    }
    
  } catch (error) {
    console.log('❌ 请求失败');
    console.log(`错误: ${error.message}`);
    return false;
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始Vercel部署测试...');
  console.log('='.repeat(60));
  
  const testCases = [
    {
      baseUrl: VERCEL_URL,
      endpoint: '/api/analyze',
      data: { imageBase64: TEST_IMAGE_BASE64 },
      description: 'Vercel - AI图像质量分析'
    },
    {
      baseUrl: VERCEL_URL,
      endpoint: '/api/upscale',
      data: { 
        imageBase64: TEST_IMAGE_BASE64,
        scale: 2,
        face_enhance: false,
        model: 'real-esrgan'
      },
      description: 'Vercel - 图像超分处理'
    }
  ];
  
  let successCount = 0;
  let totalCount = testCases.length;
  
  for (const testCase of testCases) {
    const success = await testEndpoint(
      testCase.baseUrl,
      testCase.endpoint,
      testCase.data,
      testCase.description
    );
    
    if (success) {
      successCount++;
    }
    
    // 在测试之间添加延迟，避免频率限制
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 测试完成');
  console.log(`✅ 成功: ${successCount}/${totalCount}`);
  console.log(`❌ 失败: ${totalCount - successCount}/${totalCount}`);
  
  if (successCount === totalCount) {
    console.log('🎉 所有测试通过！Vercel部署正常工作');
  } else {
    console.log('⚠️  部分测试失败，请检查Vercel部署状态');
  }
}

// 检查Vercel URL是否可访问
async function checkVercelStatus() {
  console.log('🔍 检查Vercel部署状态...');
  
  try {
    const response = await sendRequest(`${VERCEL_URL}/api/health`, {}, 10000);
    
    if (response.statusCode === 200) {
      console.log('✅ Vercel部署可访问');
      return true;
    } else {
      console.log(`❌ Vercel部署状态异常: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ 无法访问Vercel部署: ${error.message}`);
    console.log('请确认:');
    console.log('1. Vercel URL是否正确');
    console.log('2. 部署是否成功完成');
    console.log('3. 网络连接是否正常');
    return false;
  }
}

// 主程序
async function main() {
  console.log('🌐 Vercel API测试工具');
  console.log(`📍 目标URL: ${VERCEL_URL}`);
  console.log('');
  
  console.log('💡 提示: 如果URL不正确，请设置环境变量:');
  console.log('   export VERCEL_URL="https://your-actual-vercel-url.vercel.app"');
  console.log('   然后重新运行此脚本');
  console.log('');
  
  // 首先检查Vercel状态
  const isVercelAccessible = await checkVercelStatus();
  
  if (!isVercelAccessible) {
    console.log('\n⚠️  跳过API测试，因为Vercel部署不可访问');
    console.log('\n🔧 可能的解决方案:');
    console.log('1. 检查Vercel项目是否已成功部署');
    console.log('2. 确认Vercel URL是否正确');
    console.log('3. 检查网络连接');
    console.log('4. 等待几分钟后重试（部署可能需要时间）');
    process.exit(1);
  }
  
  // 运行API测试
  await runTests();
}

// 运行测试
if (require.main === module) {
  main().catch(error => {
    console.error('测试过程中发生错误:', error);
    process.exit(1);
  });
}

module.exports = { testEndpoint, runTests, checkVercelStatus };