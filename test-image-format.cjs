/**
 * 测试图像格式验证修复
 */

const { validateImageData } = require('./shared/api-handlers.cjs');

console.log('🧪 测试图像格式验证修复...');

// 测试用例
const testCases = [
  {
    name: '标准PNG格式',
    data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    shouldPass: true
  },
  {
    name: '标准JPEG格式',
    data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA==',
    shouldPass: true
  },
  {
    name: '标准WEBP格式',
    data: 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA',
    shouldPass: true
  },
  {
    name: '大写JPEG格式',
    data: 'data:image/JPEG;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA==',
    shouldPass: true
  },
  {
    name: '纯base64数据（无前缀）',
    data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    shouldPass: true
  },
  {
    name: '空数据',
    data: '',
    shouldPass: false
  },
  {
    name: '无效格式',
    data: 'data:text/plain;base64,SGVsbG8gV29ybGQ=',
    shouldPass: false
  }
];

// 执行测试
let passedTests = 0;
let totalTests = testCases.length;

for (const testCase of testCases) {
  try {
    const result = validateImageData(testCase.data);
    if (testCase.shouldPass && result) {
      console.log(`✅ ${testCase.name}: 通过`);
      passedTests++;
    } else if (!testCase.shouldPass) {
      console.log(`❌ ${testCase.name}: 应该失败但通过了`);
    }
  } catch (error) {
    if (!testCase.shouldPass) {
      console.log(`✅ ${testCase.name}: 正确失败 - ${error.message}`);
      passedTests++;
    } else {
      console.log(`❌ ${testCase.name}: 应该通过但失败了 - ${error.message}`);
    }
  }
}

console.log(`\n📊 测试结果: ${passedTests}/${totalTests} 通过`);

if (passedTests === totalTests) {
  console.log('🎉 所有测试通过！图像格式验证修复成功。');
} else {
  console.log('⚠️ 部分测试失败，需要进一步调试。');
}
