# 🛠️ 开发者快速参考

> 📌 **编辑时快速查询的常用链接和配置**

## 📚 官方文档链接

### 🤖 AI & 后端服务
- **[Replicate API文档](https://replicate.com/docs)** - AI模型调用、参数配置、错误处理
  - [模型列表](https://replicate.com/explore)
  - [API参考](https://replicate.com/docs/reference/http)
  - [Python客户端](https://replicate.com/docs/reference/python)
  - [Node.js客户端](https://replicate.com/docs/reference/node)

### 🔐 用户认证
- **[Clerk文档](https://clerk.com/docs)** - 用户认证、会话管理
  - [React集成](https://clerk.com/docs/quickstarts/react)
  - [环境变量](https://clerk.com/docs/deployments/overview)
  - [Webhook](https://clerk.com/docs/integrations/webhooks)

### 💳 支付系统
- **[Stripe文档](https://stripe.com/docs)** - 支付集成、订阅管理
  - [Checkout Session](https://stripe.com/docs/api/checkout/sessions)
  - [Webhook](https://stripe.com/docs/webhooks)
  - [测试卡号](https://stripe.com/docs/testing)

### 🚀 部署平台
- **[Vercel文档](https://vercel.com/docs)** - 部署、函数、环境变量
  - [Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
  - [环境变量](https://vercel.com/docs/projects/environment-variables)
  - [域名配置](https://vercel.com/docs/projects/domains)

### ⚡ 前端工具
- **[Vite文档](https://vitejs.dev/guide/)** - 构建工具、开发服务器
- **[React文档](https://react.dev/)** - 组件开发、Hooks
- **[TypeScript文档](https://www.typescriptlang.org/docs/)** - 类型定义

---

## 🔑 环境变量快速参考

### 必需变量
```env
# Clerk 用户认证 (必需)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Replicate AI (核心功能)
REPLICATE_API_TOKEN=r8_...
```

### 可选变量
```env
# Stripe 支付 (Pro功能)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_PRICE_ID=price_...
```

---

## 🚨 常用调试命令

### 本地开发
```bash
# 启动开发服务器
npm run dev

# 构建检查
npm run build

# 类型检查
npx tsc --noEmit
```

### Vercel部署
```bash
# 本地预览
vercel dev

# 部署到预览环境
vercel

# 部署到生产环境
vercel --prod

# 查看日志
vercel logs
```

### Git操作
```bash
# 快速提交
git add . && git commit -m "feat: description" && git push

# 查看状态
git status

# 查看最近提交
git log --oneline -5
```

---

## 🔧 API端点快速测试

### 测试图像分析API
```bash
curl -X POST https://your-app.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"imageBase64": "data:image/jpeg;base64,..."}'
```

### 测试支付API
```bash
curl -X POST https://your-app.vercel.app/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{"priceId": "price_xxx", "userId": "user_xxx"}'
```

---

## 📱 浏览器调试

### 开发者工具快捷键
- **打开控制台**: `F12` 或 `Cmd+Option+I`
- **硬刷新**: `Ctrl+F5` 或 `Cmd+Shift+R`
- **网络面板**: 查看API请求和响应
- **控制台**: 查看JavaScript错误和日志

### 常用控制台命令
```javascript
// 查看用户信息
console.log(user);

// 查看环境变量
console.log(import.meta.env);

// 清除控制台
console.clear();
```

---

## 🎯 快速链接

- 🏠 [项目首页](./README.md)
- 🚀 [部署指南](./DEPLOYMENT.md)
- 🔑 [Clerk配置](./CLERK_SETUP.md)
- 📊 [Vercel Dashboard](https://vercel.com/dashboard)
- 🤖 [Replicate Dashboard](https://replicate.com/account)
- 🔐 [Clerk Dashboard](https://dashboard.clerk.com/)
- 💳 [Stripe Dashboard](https://dashboard.stripe.com/)

---

**💡 提示**: 将此文件加入书签，编辑时快速查询！
