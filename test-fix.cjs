// 测试前端修复的简单脚本
const fs = require('fs');
const path = require('path');

// 创建一个简单的测试图像的base64数据
const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function testAPI(endpoint, data) {
  try {
    console.log(`\n🧪 测试 ${endpoint}...`);
    
    const response = await fetch(`http://localhost:3000${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    
    console.log(`状态码: ${response.status}`);
    console.log(`响应:`, result);
    
    if (response.status === 500 && result.message && result.message.includes('缺少图像数据')) {
      console.log('❌ 仍然报告缺少图像数据 - 前端修复可能无效');
    } else if (response.status === 500 && result.message && result.message.includes('API Token')) {
      console.log('✅ 前端修复有效 - 错误现在是API Token问题');
    } else {
      console.log('✅ 请求格式正确');
    }
    
  } catch (error) {
    console.log('❌ 请求失败:', error.message);
  }
}

async function main() {
  console.log('🔧 测试前端API修复...');
  
  // 测试分析API
  await testAPI('/api/analyze', {
    imageBase64: testImageBase64
  });
  
  // 测试超分API
  await testAPI('/api/upscale', {
    imageBase64: testImageBase64,
    scale: 2,
    face_enhance: true,
    model: 'real-esrgan'
  });
  
  console.log('\n🏁 测试完成');
}

main().catch(console.error);