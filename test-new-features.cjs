/**
 * 测试新功能的脚本
 * 测试影调增强和细节增强API端点
 */

const fs = require('fs');
const path = require('path');

// 创建一个简单的测试图像的base64数据（1x1像素的PNG）
const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

async function testAPI(endpoint, data) {
  try {
    console.log(`\n🧪 测试 ${endpoint}...`);
    
    const response = await fetch(`http://localhost:3000${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ ${endpoint} 测试成功`);
      console.log(`📊 响应数据:`, {
        success: result.success,
        message: result.message,
        processing_time_ms: result.processing_time_ms
      });
    } else {
      console.log(`❌ ${endpoint} 测试失败`);
      console.log(`📊 错误信息:`, result.error);
    }
    
    return result;
  } catch (error) {
    console.log(`❌ ${endpoint} 请求失败:`, error.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 开始测试新功能...');
  
  // 测试健康检查
  try {
    const healthResponse = await fetch('http://localhost:3000/api/health');
    const healthData = await healthResponse.json();
    console.log('✅ API服务器健康检查通过');
    console.log('📋 可用端点:', healthData);
  } catch (error) {
    console.log('❌ API服务器连接失败:', error.message);
    return;
  }

  // 测试影调增强
  await testAPI('/api/tone-enhance', {
    imageBase64: testImageBase64,
    enhanceType: 'auto',
    intensity: 1.0
  });

  // 测试细节增强
  await testAPI('/api/detail-enhance', {
    imageBase64: testImageBase64,
    enhanceType: 'denoise',
    strength: 15
  });

  console.log('\n🎉 测试完成！');
}

// 运行测试
runTests().catch(console.error);
