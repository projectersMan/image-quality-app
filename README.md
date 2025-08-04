# 🎨 图像质量AI分析 - Image Quality AI

基于现代AI技术的智能图像质量分析web应用。使用Replicate AI、Clerk认证和Stripe支付系统构建。

## ✨ 功能特色

- 🤖 **AI智能分析**: 使用先进的LLAVA模型进行图像质量评估
- 📋 **多格式支持**: 支持JPG、PNG、WEBP等主流图像格式
- 🔐 **用户认证**: 集成Clerk安全登录系统
- 💳 **订阅付费**: Stripe支付集成，支持Pro版本升级
- 📡 **实时处理**: 秒级分析结果
- 🌍 **全球部署**: Vercel云边缘网络，全球快速访问

## 🚀 快速开始

### 1. 克隆仓库
```bash
git clone <your-repo-url>
cd image-quality-app
```

### 2. 安装依赖
```bash
npm install
# 或
pnpm install
```

### 3. 配置环境变量
复制 `.env.example` 到 `.env.local` 并填入你的API密钥：

```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件：

```env
# Replicate AI API - 在 https://replicate.com 获取
REPLICATE_API_TOKEN=r8_your_replicate_api_token_here

# Clerk 用户认证 - 在 https://clerk.com 获取
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key_here

# Stripe 支付 - 在 https://stripe.com 获取
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret_here
VITE_STRIPE_PRICE_ID=price_your_stripe_price_id_here
```

> 🔐 **Clerk详细配置**: 如需Clerk用户认证的详细配置步骤，请参考 [CLERK_SETUP.md](./CLERK_SETUP.md)

### 4. 本地开发
```bash
npm run dev
```

访问 `http://localhost:5173` 查看应用。

## 📦 部署到Vercel

### 方式1: 使用Vercel CLI

```bash
# 安装Vercel CLI
npm i -g vercel

# 登录并部署
vercel --prod
```

### 方式2: GitHub自动部署

1. 将代码推送到GitHub仓库
2. 在Vercel Dashboard中连接GitHub仓库
3. 配置环境变量（见下方）
4. 部署完成！

### 环境变量配置

在Vercel Dashboard → Settings → Environment Variables 中添加：

| 变量名 | 值 | 描述 |
|---------|-----|------|
| `REPLICATE_API_TOKEN` | `r8_...` | Replicate AI API密钥 |
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_test_...` | Clerk公开密钥 |
| `CLERK_SECRET_KEY` | `sk_test_...` | Clerk私有密钥 |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | Stripe公开密钥 |
| `STRIPE_SECRET_KEY` | `sk_test_...` | Stripe私有密钥 |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Stripe Webhook密钥 |
| `VITE_STRIPE_PRICE_ID` | `price_...` | Stripe价格ID |

## 🛠️ API文档

### POST /api/analyze
分析上传的图像质量。

> 📖 **Replicate API参考**: [https://replicate.com/docs](https://replicate.com/docs)
> 🤖 **使用的AI模型**: LLAVA-13B 图像理解模型

**请求参数:**
- `imageBase64`: Base64编码的图像数据 (JSON)

**响应示例:**
```json
{
  "score": 8.5,
  "message": "分析完成",
  "timestamp": "2025-01-01T12:00:00Z"
}
```

### POST /api/create-checkout-session
创建Stripe支付会话。

**请求参数:**
```json
{
  "priceId": "price_xxx",
  "userId": "user_xxx"
}
```

## 🎨 技术栈

- **前端**: React 18 + TypeScript + Vite
- **UI样式**: 原生 CSS + 响应式设计
- **后端**: Vercel Serverless Functions
- **AI模型**: Replicate LLAVA-13B
- **用户认证**: Clerk
- **支付系统**: Stripe
- **部署平台**: Vercel

## 🔧 开发指南

### 📚 开发者快速参考

**常用文档链接（编辑时查询）：**
- 🤖 [Replicate API文档](https://replicate.com/docs) - AI模型调用和配置
- 🔐 [Clerk认证文档](https://clerk.com/docs) - 用户认证和管理
- 💳 [Stripe支付文档](https://stripe.com/docs) - 支付集成和Webhook
- 🚀 [Vercel部署文档](https://vercel.com/docs) - 部署和函数配置
- ⚡ [Vite构建文档](https://vitejs.dev/guide/) - 前端构建工具

**项目相关文档：**
- 📖 [详细部署指南](./DEPLOYMENT.md) - 完整部署流程
- 🔑 [Clerk配置指南](./CLERK_SETUP.md) - 用户认证详细设置

### 项目结构
```
image-quality-app/
├── api/                    # Vercel Serverless Functions
│   ├── analyze.ts           # 图像分析API
│   ├── create-checkout-session.ts  # Stripe支付
│   └── webhook.ts           # Stripe Webhook
├── src/
│   ├── components/          # React组件
│   ├── App.tsx             # 主应用组件
│   ├── main.tsx            # 应用入口
│   └── index.css           # 样式文件
├── public/                 # 静态资源
├── scripts/                # 部署脚本
├── vercel.json             # Vercel配置
├── package.json            # 项目依赖
├── README.md              # 项目文档
├── DEPLOYMENT.md          # 部署指南
└── CLERK_SETUP.md         # Clerk认证详细配置指南
```

### 本地测试

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 🔒 安全注意事项

1. **保护API密钥**: 所有私有密钥必须存储在环境变量中
2. **Webhook验证**: 使用Stripe Webhook签名验证确保安全
3. **用户数据**: 遵守GDPR和数据保护法规
4. **速率限制**: 考虑对API调用实施速率限制

## 💰 成本估算

- **Vercel**: 免费套餐支持中小型项目
- **Replicate AI**: 按使用量计费，约$0.01-0.05/请求
- **Clerk**: 月活跃用1万用户内免费
- **Stripe**: 2.9% + ¥0.30/交易

## 🛣️ 故障排除

### 常见问题

**Q: AI分析返回500错误**
A: 检查REPLICATE_API_TOKEN是否正确配置

**Q: 用户登录失败**
A: 确认Clerk的publishableKey和secretKey是否匹配

**Q: Stripe支付跳转失败**
A: 检查priceId和publishableKey是否正确

### 日志查看

```bash
# Vercel部署日志
vercel logs

# 本地开发日志
# 在浏览器控制台查看
```

## 👥 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📝 许可证

MIT License - 详情见 [LICENSE](LICENSE) 文件。

## 🚀 路线图

- [ ] 批量处理功能
- [ ] 更多 AI 模型支持
- [ ] 移动端优化
- [ ] API 速率限制
- [ ] 管理后台
- [ ] 多语言支持

---

🌟 **如果这个项目对你有帮助，请给个 Star！**