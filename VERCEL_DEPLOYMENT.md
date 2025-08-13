# Vercel部署指南

## 问题描述

在Vercel服务端操作时遇到以下错误：

### 1. JSON解析错误
`Unexpected token 'A', "A server e"... is not valid JSON`

### 2. ES模块兼容性错误
```
ReferenceError: require is not defined in ES module scope, you can use import instead
This file is being treated as an ES module because it has a '.js' file extension and '/var/task/package.json' contains "type": "module".
```

## 问题原因

### JSON解析错误原因：
1. **API函数错误处理不当** - 直接使用`res.status().json()`可能在某些情况下返回HTML
2. **Vercel部署配置问题** - 环境变量未正确设置
3. **依赖项问题** - 某些模块在Vercel环境中不兼容

### ES模块兼容性错误原因：
1. **混用CommonJS和ES模块** - 在ES模块环境中使用`require()`语句
2. **模块导入语法不匹配** - Vercel环境默认使用ES模块，但代码中使用CommonJS语法
3. **依赖项导入方式错误** - 共享模块使用了不兼容的导出格式

## 已实施的修复

### 1. 统一API响应格式

修改了`api/analyze.ts`文件，使其与`api/upscale.ts`保持一致：

- 使用`debug.safeJSON()`确保安全的JSON序列化
- 使用`debug.errorResponse()`统一错误响应格式
- 添加请求体解析错误处理
- 增强日志记录和调试信息

### 2. 修复ES模块兼容性

- **创建ES模块版本** - 新建 `shared/api-handlers.mjs` 替代 `shared/api-handlers.cjs`
- **转换导入语句** - 将所有 `require()` 语句替换为 `import` 语句
- **修复依赖导入** - 使用 `import Replicate from 'replicate'` 替代 `require('replicate')`
- **调整函数参数** - 修改 `processUpscale` 和 `processAnalyze` 的调用方式
- **环境变量类型检查** - 添加 `REPLICATE_API_TOKEN` 的存在性验证

### 3. 改进错误处理

```typescript
// 修复前（可能返回HTML）
res.status(500).json({ error: message });

// 修复后（确保JSON格式）
return debug.errorResponse(res, message, 500);
```

### 4. 增强调试功能

- 添加环境检查
- 统一日志记录
- JSON序列化验证
- 请求/响应追踪

## 部署步骤

### 1. 推送代码到GitHub

```bash
git add .
git commit -m "🔧 修复Vercel API响应格式问题"
git push origin main
```

### 2. 在Vercel中重新部署

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 找到你的项目
3. 点击「Redeploy」重新部署
4. 等待部署完成

### 3. 设置环境变量

确保在Vercel项目设置中配置了以下环境变量：

```
REPLICATE_API_TOKEN=your_replicate_token_here
NODE_ENV=production
```

## 测试部署

### 1. 获取正确的Vercel URL

部署完成后，Vercel会提供一个URL，格式通常为：
- `https://your-app-name.vercel.app`
- `https://your-app-name-git-main-username.vercel.app`

### 2. 运行测试脚本

```bash
# 设置正确的Vercel URL
export VERCEL_URL="https://your-actual-vercel-url.vercel.app"

# 运行测试
node test-vercel.cjs
```

### 3. 手动测试API

使用curl或Postman测试API端点：

```bash
# 测试analyze接口
curl -X POST https://your-vercel-url.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"imageBase64":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="}'

# 测试upscale接口
curl -X POST https://your-vercel-url.vercel.app/api/upscale \
  -H "Content-Type: application/json" \
  -d '{"imageBase64":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==","scale":2}'
```

## 预期结果

修复后，API应该返回正确的JSON格式响应：

### 成功响应示例

```json
{
  "success": true,
  "score": 3.8,
  "analysis": {
    "format": "png",
    "size": 70,
    "quality_factors": {
      "resolution": "low",
      "file_size": "small"
    }
  },
  "message": "图像质量分析完成（基础模式）",
  "timestamp": "2025-08-13T02:19:20.033Z"
}
```

### 错误响应示例

```json
{
  "error": "请提供图片URL或base64数据",
  "timestamp": "2025-08-13T02:19:20.033Z",
  "statusCode": 400
}
```

## 故障排除

### 如果仍然遇到JSON解析错误：

1. **检查Vercel部署日志**
   - 在Vercel Dashboard中查看部署日志
   - 查找具体的错误信息

2. **验证环境变量**
   - 确保`REPLICATE_API_TOKEN`已正确设置
   - 检查其他必要的环境变量

3. **检查依赖项**
   - 确保所有依赖项在Vercel环境中兼容
   - 检查`package.json`中的版本

4. **查看函数日志**
   - 在Vercel Dashboard的Functions标签页查看实时日志
   - 查找具体的错误堆栈

### 常见问题

**Q: API返回HTML而不是JSON**
A: 这通常是因为发生了未捕获的错误，Vercel返回了默认的错误页面。检查函数日志以找到具体错误。

**Q: 部署成功但API不工作**
A: 检查环境变量是否正确设置，特别是`REPLICATE_API_TOKEN`。

**Q: 超时错误**
A: Vercel Serverless函数有执行时间限制，确保API调用在限制时间内完成。

## 联系支持

如果问题仍然存在，请提供：
1. 完整的错误信息
2. Vercel部署日志
3. API请求和响应示例
4. 环境变量配置（隐藏敏感信息）