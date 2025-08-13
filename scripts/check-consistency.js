#!/usr/bin/env node
/**
 * 代码一致性检查脚本
 * 确保本地开发环境与Vercel生产环境的代码逻辑一致
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 需要检查一致性的文件对
const CONSISTENCY_CHECKS = [
  {
    name: 'API处理逻辑',
    files: [
      {
        path: 'shared/api-handlers.cjs',
        type: 'shared',
        description: '共享API处理逻辑'
      },
      {
        path: 'local-server.cjs',
        type: 'local',
        description: '本地开发服务器',
        extractFunctions: ['processUpscale', 'processAnalyze']
      },
      {
        path: 'api/upscale.ts',
        type: 'vercel',
        description: 'Vercel超分API',
        extractFunctions: ['handler']
      },
      {
        path: 'api/analyze.ts',
        type: 'vercel',
        description: 'Vercel分析API',
        extractFunctions: ['handler']
      }
    ]
  },
  {
    name: '依赖配置',
    files: [
      {
        path: 'package.json',
        type: 'config',
        description: '项目依赖配置'
      }
    ]
  },
  {
    name: '构建配置',
    files: [
      {
        path: 'vite.config.ts',
        type: 'config',
        description: 'Vite构建配置'
      },
      {
        path: 'tsconfig.json',
        type: 'config',
        description: 'TypeScript配置'
      },
      {
        path: 'vercel.json',
        type: 'config',
        description: 'Vercel部署配置'
      }
    ]
  }
];

// 关键代码模式检查
const CODE_PATTERNS = {
  replicateInit: {
    pattern: /new\s+Replicate\s*\(\s*{[^}]*}\s*\)/g,
    description: 'Replicate客户端初始化'
  },
  modelConfig: {
    pattern: /(modelId|model)\s*[:=]\s*['"`][^'"` ]+['"`]/g,
    description: '模型配置'
  },
  apiCall: {
    pattern: /replicate\.run\s*\([^)]+\)/g,
    description: 'Replicate API调用'
  },
  errorHandling: {
    pattern: /(try\s*{|catch\s*\(|throw\s+new\s+Error)/g,
    description: '错误处理'
  },
  envVars: {
    pattern: /process\.env\.[A-Z_]+/g,
    description: '环境变量使用'
  }
};

/**
 * 读取文件内容
 * @param {string} filePath - 文件路径
 * @returns {string|null} 文件内容
 */
function readFile(filePath) {
  const fullPath = path.join(projectRoot, filePath);
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  return fs.readFileSync(fullPath, 'utf8');
}

/**
 * 计算文件哈希
 * @param {string} content - 文件内容
 * @returns {string} 文件哈希
 */
function calculateHash(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * 提取函数代码
 * @param {string} content - 文件内容
 * @param {string} functionName - 函数名
 * @returns {string|null} 函数代码
 */
function extractFunction(content, functionName) {
  // 匹配函数定义的正则表达式
  const patterns = [
    // JavaScript/TypeScript 函数
    new RegExp(`(async\s+)?function\s+${functionName}\s*\([^)]*\)\s*{`, 'g'),
    // 箭头函数
    new RegExp(`(const|let|var)\s+${functionName}\s*=\s*(async\s+)?\([^)]*\)\s*=>\s*{`, 'g'),
    // 对象方法
    new RegExp(`${functionName}\s*:\s*(async\s+)?\([^)]*\)\s*=>\s*{`, 'g'),
    // 类方法
    new RegExp(`(async\s+)?${functionName}\s*\([^)]*\)\s*{`, 'g')
  ];
  
  for (const pattern of patterns) {
    const match = pattern.exec(content);
    if (match) {
      const startIndex = match.index;
      let braceCount = 0;
      let endIndex = startIndex;
      
      // 找到函数的结束位置
      for (let i = startIndex; i < content.length; i++) {
        if (content[i] === '{') braceCount++;
        if (content[i] === '}') braceCount--;
        if (braceCount === 0 && content[i] === '}') {
          endIndex = i + 1;
          break;
        }
      }
      
      return content.substring(startIndex, endIndex);
    }
  }
  
  return null;
}

/**
 * 提取代码模式
 * @param {string} content - 文件内容
 * @param {Object} pattern - 模式配置
 * @returns {Array} 匹配结果
 */
function extractPattern(content, pattern) {
  const matches = [];
  let match;
  
  while ((match = pattern.pattern.exec(content)) !== null) {
    matches.push({
      match: match[0],
      index: match.index,
      line: content.substring(0, match.index).split('\n').length
    });
  }
  
  return matches;
}

/**
 * 检查文件一致性
 * @param {Object} checkConfig - 检查配置
 * @returns {Object} 检查结果
 */
function checkFileConsistency(checkConfig) {
  console.log(`\n🔍 检查 ${checkConfig.name}...`);
  
  const results = {
    name: checkConfig.name,
    files: [],
    issues: [],
    summary: {
      total: checkConfig.files.length,
      missing: 0,
      inconsistent: 0,
      consistent: 0
    }
  };
  
  // 读取所有文件
  checkConfig.files.forEach(fileConfig => {
    const content = readFile(fileConfig.path);
    const fileResult = {
      ...fileConfig,
      exists: content !== null,
      content,
      hash: content ? calculateHash(content) : null,
      functions: {},
      patterns: {}
    };
    
    if (!content) {
      results.summary.missing++;
      results.issues.push({
        type: 'missing',
        file: fileConfig.path,
        message: `文件不存在: ${fileConfig.path}`
      });
      console.log(`❌ ${fileConfig.path}: 文件不存在`);
    } else {
      console.log(`✅ ${fileConfig.path}: 文件存在`);
      
      // 提取函数
      if (fileConfig.extractFunctions) {
        fileConfig.extractFunctions.forEach(funcName => {
          const funcCode = extractFunction(content, funcName);
          fileResult.functions[funcName] = funcCode;
          if (!funcCode) {
            results.issues.push({
              type: 'missing_function',
              file: fileConfig.path,
              function: funcName,
              message: `函数 ${funcName} 在 ${fileConfig.path} 中未找到`
            });
          }
        });
      }
      
      // 提取代码模式
      Object.entries(CODE_PATTERNS).forEach(([patternName, patternConfig]) => {
        const matches = extractPattern(content, patternConfig);
        fileResult.patterns[patternName] = matches;
      });
    }
    
    results.files.push(fileResult);
  });
  
  return results;
}

/**
 * 比较函数一致性
 * @param {Array} files - 文件列表
 * @returns {Array} 不一致问题
 */
function compareFunctionConsistency(files) {
  const issues = [];
  const functionGroups = {};
  
  // 按函数名分组
  files.forEach(file => {
    if (file.functions) {
      Object.entries(file.functions).forEach(([funcName, funcCode]) => {
        if (!functionGroups[funcName]) {
          functionGroups[funcName] = [];
        }
        functionGroups[funcName].push({
          file: file.path,
          code: funcCode,
          hash: funcCode ? calculateHash(funcCode) : null
        });
      });
    }
  });
  
  // 检查每个函数组的一致性
  Object.entries(functionGroups).forEach(([funcName, implementations]) => {
    const hashes = implementations.map(impl => impl.hash).filter(Boolean);
    const uniqueHashes = [...new Set(hashes)];
    
    if (uniqueHashes.length > 1) {
      issues.push({
        type: 'function_inconsistency',
        function: funcName,
        implementations: implementations.map(impl => impl.file),
        message: `函数 ${funcName} 在不同文件中实现不一致`
      });
    }
  });
  
  return issues;
}

/**
 * 比较代码模式一致性
 * @param {Array} files - 文件列表
 * @returns {Array} 不一致问题
 */
function comparePatternConsistency(files) {
  const issues = [];
  const patternGroups = {};
  
  // 按模式分组
  files.forEach(file => {
    if (file.patterns) {
      Object.entries(file.patterns).forEach(([patternName, matches]) => {
        if (!patternGroups[patternName]) {
          patternGroups[patternName] = [];
        }
        patternGroups[patternName].push({
          file: file.path,
          matches
        });
      });
    }
  });
  
  // 检查关键模式的一致性
  Object.entries(patternGroups).forEach(([patternName, fileMatches]) => {
    const patternConfig = CODE_PATTERNS[patternName];
    
    // 检查模型配置一致性
    if (patternName === 'modelConfig') {
      const modelIds = new Set();
      fileMatches.forEach(({ file, matches }) => {
        matches.forEach(match => {
          const modelId = match.match.match(/['"`]([^'"` ]+)['"`]/)?.[1];
          if (modelId) {
            modelIds.add(modelId);
          }
        });
      });
      
      if (modelIds.size > 1) {
        issues.push({
          type: 'pattern_inconsistency',
          pattern: patternName,
          message: `模型ID不一致: ${Array.from(modelIds).join(', ')}`,
          files: fileMatches.map(fm => fm.file)
        });
      }
    }
    
    // 检查环境变量使用一致性
    if (patternName === 'envVars') {
      const envVars = new Set();
      fileMatches.forEach(({ file, matches }) => {
        matches.forEach(match => {
          envVars.add(match.match);
        });
      });
      
      // 记录使用的环境变量
      console.log(`📋 ${patternConfig.description}: ${Array.from(envVars).join(', ')}`);
    }
  });
  
  return issues;
}

/**
 * 检查依赖版本一致性
 * @param {string} packageJsonContent - package.json内容
 * @returns {Array} 问题列表
 */
function checkDependencyConsistency(packageJsonContent) {
  const issues = [];
  
  try {
    const packageJson = JSON.parse(packageJsonContent);
    const { dependencies = {}, devDependencies = {} } = packageJson;
    
    // 检查关键依赖
    const criticalDeps = {
      'replicate': '用于AI模型调用',
      'vite': '前端构建工具',
      'typescript': 'TypeScript支持',
      '@clerk/clerk-react': 'Clerk用户认证',
      'stripe': 'Stripe支付'
    };
    
    Object.entries(criticalDeps).forEach(([dep, description]) => {
      const version = dependencies[dep] || devDependencies[dep];
      if (!version) {
        issues.push({
          type: 'missing_dependency',
          dependency: dep,
          message: `缺少关键依赖: ${dep} (${description})`
        });
      } else {
        console.log(`✅ ${dep}: ${version}`);
      }
    });
    
  } catch (error) {
    issues.push({
      type: 'invalid_package_json',
      message: `package.json格式错误: ${error.message}`
    });
  }
  
  return issues;
}

/**
 * 生成一致性报告
 * @param {Array} allResults - 所有检查结果
 */
function generateConsistencyReport(allResults) {
  console.log('\n📊 一致性检查报告:');
  
  let totalIssues = 0;
  let criticalIssues = 0;
  
  allResults.forEach(result => {
    console.log(`\n📁 ${result.name}:`);
    console.log(`   • 文件总数: ${result.summary.total}`);
    console.log(`   • 缺失文件: ${result.summary.missing}`);
    console.log(`   • 问题数量: ${result.issues.length}`);
    
    totalIssues += result.issues.length;
    
    // 显示具体问题
    result.issues.forEach(issue => {
      const icon = issue.type.includes('missing') ? '❌' : '⚠️';
      console.log(`   ${icon} ${issue.message}`);
      
      if (issue.type.includes('missing') || issue.type.includes('inconsistency')) {
        criticalIssues++;
      }
    });
  });
  
  console.log('\n📈 总结:');
  console.log(`   • 总问题数: ${totalIssues}`);
  console.log(`   • 严重问题: ${criticalIssues}`);
  console.log(`   • 警告问题: ${totalIssues - criticalIssues}`);
  
  return {
    totalIssues,
    criticalIssues,
    success: criticalIssues === 0
  };
}

/**
 * 生成修复建议
 * @param {Array} allResults - 所有检查结果
 */
function generateFixRecommendations(allResults) {
  console.log('\n💡 修复建议:');
  
  const recommendations = [];
  
  allResults.forEach(result => {
    result.issues.forEach(issue => {
      switch (issue.type) {
        case 'missing':
          recommendations.push(`创建缺失文件: ${issue.file}`);
          break;
        case 'function_inconsistency':
          recommendations.push(`统一函数实现: ${issue.function} (文件: ${issue.implementations.join(', ')})`);
          break;
        case 'pattern_inconsistency':
          recommendations.push(`统一代码模式: ${issue.message}`);
          break;
        case 'missing_dependency':
          recommendations.push(`安装缺失依赖: npm install ${issue.dependency}`);
          break;
      }
    });
  });
  
  if (recommendations.length === 0) {
    console.log('✅ 无需修复，代码一致性良好！');
  } else {
    recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
  }
  
  console.log('\n🔧 自动修复:');
  console.log('   • 运行 npm run fix-consistency 自动修复部分问题');
  console.log('   • 运行 npm run sync-env 同步环境变量');
  console.log('   • 查看 ./doc/DEPLOYMENT.md 获取详细指南');
}

/**
 * 主函数
 */
function main() {
  console.log('🔧 图像质量AI应用 - 代码一致性检查工具\n');
  
  const allResults = [];
  
  // 执行所有一致性检查
  CONSISTENCY_CHECKS.forEach(checkConfig => {
    const result = checkFileConsistency(checkConfig);
    
    // 检查函数一致性
    const functionIssues = compareFunctionConsistency(result.files);
    result.issues.push(...functionIssues);
    
    // 检查代码模式一致性
    const patternIssues = comparePatternConsistency(result.files);
    result.issues.push(...patternIssues);
    
    // 检查依赖一致性
    if (checkConfig.name === '依赖配置') {
      const packageFile = result.files.find(f => f.path === 'package.json');
      if (packageFile && packageFile.content) {
        const depIssues = checkDependencyConsistency(packageFile.content);
        result.issues.push(...depIssues);
      }
    }
    
    allResults.push(result);
  });
  
  // 生成报告
  const summary = generateConsistencyReport(allResults);
  
  // 生成建议
  generateFixRecommendations(allResults);
  
  // 退出码
  const exitCode = summary.success ? 0 : 1;
  if (exitCode === 0) {
    console.log('\n✅ 代码一致性检查通过！');
  } else {
    console.log('\n❌ 代码一致性检查失败，请修复上述问题后重试。');
  }
  
  process.exit(exitCode);
}

// 运行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  checkFileConsistency,
  compareFunctionConsistency,
  comparePatternConsistency,
  CONSISTENCY_CHECKS
};