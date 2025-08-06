# 🔐 安全检查清单

## ✅ 已修复的安全问题

### 1. **API密钥泄露防护**
- ✅ 创建了 `.gitignore` 文件，防止敏感文件被提交
- ✅ 从Git历史中移除了 `.env.local` 文件
- ✅ 创建了 `.env.example` 模板文件
- ✅ 确保所有环境变量通过Vercel Dashboard配置

### 2. **文件安全检查**
- ✅ `.env.local` - 已从Git历史移除
- ✅ `.gitignore` - 已创建，包含所有敏感文件类型
- ✅ API文件 - 无硬编码密钥
- ✅ 配置文件 - 无敏感信息泄露

## 🚨 关于 .env.local 文件

### **GitHub自动部署方案下的.env.local文件**

**结论：.env.local文件在GitHub自动部署方案下是不必要的，甚至是危险的。**

#### **原因：**

1. **Vercel自动部署流程：**
   ```
   GitHub代码推送 → Vercel自动构建 → 使用Vercel Dashboard环境变量
   ```

2. **环境变量来源：**
   - ❌ **不使用** `.env.local` 文件（容易泄露）
   - ✅ **使用** Vercel Dashboard 环境变量配置

3. **安全风险：**
   - `.env.local` 包含真实API密钥
   - 如果被提交到Git，密钥会永久暴露
   - GitHub是公开仓库，任何人都能看到

#### **正确的做法：**

1. **删除 `.env.local` 文件**（如果不需要本地开发）
2. **在Vercel Dashboard配置环境变量**
3. **本地开发时使用 `.env.local`，但确保被 `.gitignore` 忽略**

## 🛠️ 环境变量配置指南

### **生产环境（Vercel）**
在Vercel Dashboard → Settings → Environment Variables 中配置：

```env
# 必需变量
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
REPLICATE_API_TOKEN=r8_...

# 可选变量（Pro功能）
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_PRICE_ID=price_...
```

### **本地开发环境**
1. 复制 `.env.example` 为 `.env.local`
2. 填入真实的API密钥
3. 确保 `.env.local` 被 `.gitignore` 忽略

## 🔍 安全检查命令

### **检查Git历史中的敏感文件**
```bash
# 检查是否有.env文件被提交
git log --name-only --oneline | grep -E "(\.env|env\.local)"

# 检查当前Git状态
git status

# 确认.gitignore生效
git check-ignore .env.local
```

### **检查代码中的硬编码密钥**
```bash
# 搜索可能的API密钥
grep -r "pk_test_\|sk_test_\|r8_\|whsec_" src/ api/ --exclude-dir=node_modules

# 搜索可能的硬编码URL
grep -r "https://.*\.com.*key\|token" src/ api/ --exclude-dir=node_modules
```

## 🚨 紧急响应

### **如果API密钥已泄露：**

1. **立即撤销密钥：**
   - Clerk: https://dashboard.clerk.com/
   - Replicate: https://replicate.com/account/api-tokens
   - Stripe: https://dashboard.stripe.com/apikeys

2. **生成新密钥：**
   - 在各平台生成新的API密钥
   - 更新Vercel Dashboard中的环境变量

3. **清理Git历史：**
   ```bash
   # 从Git历史中移除敏感文件
   git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch .env.local' --prune-empty --tag-name-filter cat -- --all
   
   # 强制推送更新的历史
   git push origin --force --all
   ```

## 📋 定期安全检查

### **每月检查：**
- [ ] 检查Git历史中是否有新的敏感文件
- [ ] 验证 `.gitignore` 文件是否完整
- [ ] 检查API密钥是否仍然有效
- [ ] 审查代码中是否有硬编码密钥

### **部署前检查：**
- [ ] 确认 `.env.local` 不在Git中
- [ ] 验证Vercel环境变量配置
- [ ] 测试API功能是否正常
- [ ] 检查构建日志中是否有敏感信息

## 🔗 相关文档

- 📖 [部署指南](./DEPLOYMENT.md)
- 🛠️ [开发者参考](./DEV_REFERENCE.md)
- 🔑 [Clerk配置](./CLERK_SETUP.md)

---

**⚠️ 重要提醒：永远不要将真实的API密钥提交到Git仓库！**
