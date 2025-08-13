# 🚀 图像质量AI分析 - 完整部署指南

这是一个**复制即可用**的部署指南，所有命令与配置已在2025年7月验证通过。

## 📋 部署前准备清单

### 1. 获取必要的API密钥

#### Replicate AI (必需)
1. 访问 [https://replicate.com](https://replicate.com)
2. 注册账号并登录
3. 前往 Account → API Tokens
4. 创建新的API Token，格式：`r8_xxxxxxxx`

#### Clerk 用户认证 (必需)

**快速配置步骤：**

1. **注册Clerk账户**
   - 访问 [https://clerk.com](https://clerk.com) 
   - 注册账户并验证邮箱

2. **创建应用**
   - 点击 "Create Application" 
   - 应用名称：`Image Quality AI`
   - 选择登录方式：`Email` + `Google`（推荐）
   - 框架选择：`React`

3. **获取API密钥**
   - Publishable Key: `pk_test_xxxxxxxx` （用于前端）
   - Secret Key: `sk_test_xxxxxxxx` （用于后端，保密）

4. **配置域名**
   - 在Clerk Dashboard → Domains 中添加：
   - Development: `localhost:5173`
   - Production: `yourdomain.com`（部署后填入）

5. **测试功能**
   - 启动 `npm run dev`
   - 测试登录/注册/退出功能

> 📖 **详细配置指南**: 完整的Clerk配置步骤请参考 [CLERK_SETUP.md](./CLERK_SETUP.md)，包含账户创建、应用配置、域名设置、社交登录、Webhook配置、故障排除等详细说明。

#### Stripe 支付 (可选，Pro功能需要)
1. 访问 [https://stripe.com](https://stripe.com)
2. 注册并进入Dashboard
3. 创建产品和价格：
   - Products → Create Product
   - 设置价格为 ¥29/月（或自定义）
   - 获取 Price ID: `price_xxxxxxxx`
4. 获取API密钥：
   - Publishable Key: `pk_test_xxxxxxxx`
   - Secret Key: `sk_test_xxxxxxxx`
5. 配置Webhook：
   - Webhooks → Add Endpoint
   - URL: `https://yourdomain.com/api/webhook`
   - 事件: `checkout.session.completed`, `customer.subscription.deleted`
   - 获取 Webhook Secret: `whsec_xxxxxxxx`

---

## 🛠️ 方式一：Vercel CLI 部署（推荐）

### 1. 本地环境设置
```bash
# 1. 克隆或下载项目
cd image-quality-app

# 2. 安装依赖
npm install
# 或使用 pnpm (推荐)
pnpm install

# 3. 配置环境变量
cp setenv.sh.example setenv.sh
```

### 2. 编辑环境变量
打开 `setenv.sh` 文件，填入你的API密钥：

```env
# Replicate AI API
REPLICATE_API_TOKEN=r8_your_actual_token_here

# Clerk 用户认证
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_key_here
CLERK_SECRET_KEY=sk_test_your_actual_key_here

# Stripe 支付 (可选)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_key_here
STRIPE_SECRET_KEY=sk_test_your_actual_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_actual_secret_here
VITE_STRIPE_PRICE_ID=price_your_actual_price_here

NODE_ENV=development
```

### 3. 本地测试
```bash
# 启动开发服务器
npm run dev

# 访问 http://localhost:5173 进行测试
# 确保上传图片和AI分析功能正常工作
```

### 4. 部署到Vercel
```bash
# 安装 Vercel CLI
npm i -g vercel

# 首次部署（会要求登录）
vercel

# 生产环境部署
vercel --prod
```

### 5. 配置生产环境变量
在Vercel Dashboard中：
1. 选择你的项目
2. Settings → Environment Variables
3. 添加以下变量（**注意去掉 VITE_ 前缀的是服务器端变量**）：

| 变量名 | 值 | 环境 |
|--------|-----|------|
| `REPLICATE_API_TOKEN` | `r8_...` | Production |
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_test_...` | Production |
| `CLERK_SECRET_KEY` | `sk_test_...` | Production |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | Production |
| `STRIPE_SECRET_KEY` | `sk_test_...` | Production |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Production |
| `VITE_STRIPE_PRICE_ID` | `price_...` | Production |

### 6. 重新部署
```bash
vercel --prod
```

---

## 🔄 方式二：GitHub 自动部署

### 1. 推送到GitHub
```bash
# 初始化git仓库（如果还没有）
git init
git add .
git commit -m "Initial commit: Image Quality AI App"

# 推送到GitHub
git remote add origin https://github.com/yourusername/image-quality-app.git
git push -u origin main
```

### 2. 连接Vercel
1. 访问 [https://vercel.com](https://vercel.com)
2. 登录并点击 "Import Project"
3. 选择你的GitHub仓库
4. 保持默认设置，点击 "Deploy"

### 3. 配置环境变量
按照上述步骤5配置生产环境变量。

### 4. 自动部署
之后每次 `git push` 都会自动触发部署！

---

## 🔧 高级配置

### 自定义域名
1. 在Vercel Dashboard → Settings → Domains
2. 添加你的域名，例如：`ai.yourdomain.com`
3. 按照提示配置DNS记录
4. 更新Stripe Webhook URL为新域名

### 中国大陆访问优化
如需更稳定的中国大陆访问：

1. **Cloudflare CDN代理**：
   - 注册Cloudflare账号
   - 添加域名到Cloudflare
   - DNS记录设置为：`CNAME ai cname.vercel-dns.com`
   - 开启Proxy（橙色云朵）

### 监控和日志
```bash
# 查看部署日志
vercel logs

# 查看实时日志
vercel logs --follow
```

---

## ✅ 部署验证清单

部署完成后，请逐一验证以下功能：

### 基础功能测试
- [ ] 网站可以正常访问
- [ ] **用户认证功能**：
  - [ ] 登录按钮显示和点击
  - [ ] 注册新账户流程
  - [ ] 邮箱验证（如果启用）
  - [ ] 登录状态正确显示用户信息
  - [ ] 退出登录功能正常
- [ ] 图片上传功能正常
- [ ] AI分析返回评分
- [ ] 界面显示正常

### API测试
```bash
# 测试图片分析API
curl -X POST https://yourdomain.com/api/analyze \
  -F "image=@test-image.jpg"

# 应该返回类似：
# {"score": 7.5, "message": "分析完成", "timestamp": "..."}
```

### Stripe功能测试（如果启用）
- [ ] Pro升级按钮可点击
- [ ] 跳转到Stripe支付页面
- [ ] 测试支付流程（使用测试卡号：4242 4242 4242 4242）
- [ ] 支付成功后正确跳转

### Webhook测试
```bash
# 使用Stripe CLI测试Webhook
stripe listen --forward-to https://yourdomain.com/api/webhook
```

---

## 🚨 常见问题解决

### 1. AI分析返回500错误
**原因**: REPLICATE_API_TOKEN配置错误
**解决**: 
- 检查token是否正确
- 确认token有足够余额
- 验证token权限

### 2. 用户登录失败
**原因**: Clerk配置问题
**解决**:
- 确认publishableKey和secretKey匹配同一个Clerk应用
- 检查Clerk Dashboard → Domains 中是否添加了当前域名
- 验证环境变量 `VITE_CLERK_PUBLISHABLE_KEY` 是否正确部署
- 确认使用的是正确环境的密钥（test环境用pk_test_，生产环境用pk_live_）
- 检查浏览器控制台是否有Clerk相关错误信息

**详细故障排除**: 参考 [CLERK_SETUP.md](./CLERK_SETUP.md) 的故障排除部分

### 3. 支付跳转失败
**原因**: Stripe配置问题
**解决**:
- 检查priceId是否存在
- 确认publishableKey正确
- 验证产品状态为Active

### 4. 图片上传失败
**原因**: 文件大小或格式限制
**解决**:
- 限制图片大小 < 10MB
- 支持格式：JPG, PNG, WEBP
- 检查Vercel Function timeout设置

### 5. 环境变量不生效
**解决步骤**:
```bash
# 1. 检查Vercel环境变量
vercel env ls

# 2. 重新部署
vercel --prod

# 3. 清除缓存
vercel --prod --force
```

---

## 📊 成本预估

### 开发阶段（测试）
- **Vercel**: 免费套餐
- **Replicate**: $5-20/月（取决于使用量）
- **Clerk**: 免费套餐（月活用户<10K）
- **Stripe**: 免费（仅测试）

### 生产环境（1000用户/月）
- **Vercel**: $20/月（Pro套餐）
- **Replicate**: $50-200/月
- **Clerk**: $25/月
- **Stripe**: 2.9% + ¥0.30/交易

---

## 🎯 后续优化建议

### 性能优化
1. **图片压缩**: 集成tinify或类似服务
2. **缓存策略**: Redis缓存分析结果
3. **CDN加速**: 图片资源CDN分发

### 功能扩展
1. **批量处理**: 支持多图片同时分析
2. **历史记录**: 用户分析历史
3. **详细报告**: PDF导出功能
4. **API接口**: 开放API供第三方调用

### 监控告警
1. **错误监控**: Sentry集成
2. **性能监控**: Vercel Analytics
3. **成本监控**: 设置Replicate API使用限额

---

## 🔗 相关链接

- [Vercel文档](https://vercel.com/docs)
- [Replicate文档](https://replicate.com/docs)
- [Clerk文档](https://clerk.com/docs)
- [Stripe文档](https://stripe.com/docs)
- [项目GitHub](https://github.com/yourusername/image-quality-app)

---

**🎉 恭喜！你的图像质量AI分析应用已成功部署上线！**

如遇到问题，请提交Issue或参考故障排除部分。
