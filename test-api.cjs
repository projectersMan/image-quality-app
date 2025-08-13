/**
 * API测试脚本
 * 测试超分API的JSON解析和错误处理
 */

const http = require('http');

// 安全的JSON解析函数
function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

// 发送HTTP请求的函数
function sendRequest(data, isInvalidJson = false) {
  return new Promise((resolve, reject) => {
    const postData = isInvalidJson ? data : JSON.stringify(data);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/upscale',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: responseData
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// 测试用例数据
const testCases = [
  {
    name: '正常请求',
    data: {
      imageBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A',
      model: 'real-esrgan',
      scale: 2,
      face_enhance: false
    }
  },
  {
    name: '缺少图像数据',
    data: {
      model: 'real-esrgan',
      scale: 2,
      face_enhance: false
    }
  },
  {
    name: '无效模型',
    data: {
      imageBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A',
      model: 'invalid-model',
      scale: 2,
      face_enhance: false
    }
  },
  {
    name: '无效缩放倍数',
    data: {
      imageBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A',
      model: 'real-esrgan',
      scale: 3, // 不支持的缩放倍数
      face_enhance: false
    }
  },
  {
    name: '错误请求 - JSON格式错误',
    data: '{"invalid": json}',
    isInvalidJson: true
  }
];

// 测试函数
async function testAPI() {
  console.log('🚀 开始API测试...');
  console.log('='.repeat(50));
  
  for (const testCase of testCases) {
    console.log(`\n📋 测试用例: ${testCase.name}`);
    console.log('-'.repeat(30));
    
    try {
      const response = await sendRequest(testCase.data, testCase.isInvalidJson);
      
      console.log(`状态码: ${response.statusCode}`);
      console.log(`响应长度: ${response.body.length} 字符`);
      
      // 使用安全的JSON解析
      const parsedResponse = safeJsonParse(response.body);
      
      if (parsedResponse === null) {
        console.log('❌ JSON解析失败');
        console.log('原始响应:', response.body.substring(0, 200) + (response.body.length > 200 ? '...' : ''));
      } else {
        console.log('✅ JSON解析成功');
        console.log('响应数据:', JSON.stringify(parsedResponse, null, 2));
        
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
      }
      
    } catch (error) {
      console.log('❌ 请求失败');
      console.log('错误:', error.message);
    }
  }
  
  console.log('\n🏁 测试完成');
}

// 检查服务器是否运行
async function checkServer() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      if (res.statusCode === 200) {
        console.log('✅ 服务器运行正常');
        resolve(true);
      } else {
        console.log('❌ 服务器响应异常');
        resolve(false);
      }
    });

    req.on('error', () => {
      console.log('❌ 无法连接到服务器');
      console.log('请确保运行: npm run dev');
      resolve(false);
    });

    req.end();
  });
}

// 主函数
async function main() {
  console.log('🔍 检查服务器状态...');
  const serverRunning = await checkServer();
  
  if (serverRunning) {
    await testAPI();
  } else {
    console.log('\n❌ 服务器未运行，请先启动本地服务器:');
    console.log('node local-server.cjs');
    return;
  }
  
  console.log('\n🏁 测试完成');
  console.log('\n📝 说明:');
  console.log('- 如果看到"Replicate API Token未配置"错误，请在setenv.sh中配置真实的REPLICATE_API_TOKEN');
  console.log('- 获取Token地址: https://replicate.com/account/api-tokens');
}

// 运行测试
if (require.main === module) {
  main().catch(console.error);
}

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n\n👋 测试中断');
  process.exit(0);
});

module.exports = { testAPI, checkServer };