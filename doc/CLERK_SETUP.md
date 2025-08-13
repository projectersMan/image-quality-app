# 🔐 Clerk 用户认证详细配置指南

Clerk是一个现代化的用户认证和管理服务，为应用提供安全、易用的登录注册功能。

## 📋 第一步：创建Clerk账户和应用

### 1.1 注册Clerk账户
1. 访问 [https://clerk.com](https://clerk.com)
2. 点击 "Sign up" 注册新账户
3. 使用邮箱验证并完成注册流程

### 1.2 创建新应用
1. 登录Clerk Dashboard后，点击 "Create Application"
2. 填写应用信息：
   - **Application name**: `Image Quality AI`（或你的应用名称）
   - **Sign-in options**: 勾选 `Email` 和 `Google`（推荐）
   - **Framework**: 选择 `React`
3. 点击 "Create Application"

### 1.3 获取API密钥
创建完成后，你将看到两个重要的密钥：
- **Publishable Key** (pk_test_...): 用于前端，可以公开
- **Secret Key** (sk_test_...): 用于后端，必须保密

📝 **复制并保存这两个密钥，稍后需要配置到环境变量中。**

---

## 🛠️ 第二步：配置应用设置

### 2.1 配置域名设置
1. 在Clerk Dashboard左侧菜单，点击 "Domains"
2. 添加你的开发和生产域名：
   - **Development**: `localhost:5173`
   - **Production**: `yourdomain.com`（部署后的实际域名）

### 2.2 自定义登录界面（可选）
1. 点击左侧菜单 "Customization" → "Appearance"
2. 可以自定义：
   - 应用Logo
   - 主题颜色
   - 字体样式
3. 点击 "Save changes"

### 2.3 配置社交登录（推荐）
1. 点击左侧菜单 "User & Authentication" → "Social Connections"
2. 启用你想要的社交登录方式：
   - **Google**: 最常用，建议启用
   - **GitHub**: 适合技术用户
   - **Apple**: 适合iOS用户
3. 每个社交登录都需要在对应平台创建OAuth应用

---

## 🔧 第三步：项目代码集成

### 3.1 环境变量配置
在你的 `setenv.sh` 文件中添加：

```env
# Clerk 用户认证
VITE_CLERK_PUBLISHABLE_KEY=pk_test_你的实际密钥
CLERK_SECRET_KEY=sk_test_你的实际密钥
```

### 3.2 前端集成检查
确认 `src/main.tsx` 文件中已经正确集成：

```tsx
import { ClerkProvider } from '@clerk/clerk-react'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <App />
    </ClerkProvider>
  </React.StrictMode>,
)
```

### 3.3 组件使用检查
确认 `src/App.tsx` 中正确使用了Clerk组件：

```tsx
import { 
  SignedIn, 
  SignedOut, 
  SignInButton, 
  SignUpButton, 
  UserButton, 
  useUser 
} from '@clerk/clerk-react';

function App() {
  const { user } = useUser();
  
  return (
    <div>
      <SignedOut>
        <SignInButton mode="modal">
          <button>登录</button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button>注册</button>
        </SignUpButton>
      </SignedOut>
      
      <SignedIn>
        <p>欢迎，{user?.firstName || user?.emailAddresses[0]?.emailAddress}</p>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </div>
  );
}
```

---

## 🧪 第四步：本地测试

### 4.1 启动开发服务器
```bash
npm run dev
```

### 4.2 测试功能清单
访问 `http://localhost:5173` 并测试：

- [ ] **登录按钮显示**: 未登录时显示登录/注册按钮
- [ ] **登录流程**: 点击登录按钮，弹出登录模态框
- [ ] **注册流程**: 点击注册按钮，可以创建新账户
- [ ] **邮箱验证**: 新注册用户需要验证邮箱
- [ ] **登录状态**: 登录后显示用户信息和退出按钮
- [ ] **退出功能**: 点击退出按钮可以正常登出

### 4.3 常见测试账户
为了方便测试，可以使用以下格式的测试邮箱：
- `test+1@yourdomain.com`
- `test+2@yourdomain.com`
- `test+3@yourdomain.com`

---

## 🚀 第五步：生产环境部署

### 5.1 Vercel环境变量配置
1. 在Vercel Dashboard中选择你的项目
2. 进入 "Settings" → "Environment Variables"
3. 添加以下变量：

| 变量名 | 值 | 环境 |
|--------|-----|------|
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_test_...` 或 `pk_live_...` | Production |
| `CLERK_SECRET_KEY` | `sk_test_...` 或 `sk_live_...` | Production |

### 5.2 生产环境密钥获取
1. 在Clerk Dashboard右上角，切换到 "Live" 模式
2. 获取生产环境的密钥：
   - Live Publishable Key: `pk_live_...`
   - Live Secret Key: `sk_live_...`

### 5.3 域名验证
1. 部署完成后，在Clerk Dashboard的 "Domains" 中添加生产域名
2. 确保生产环境可以正常访问认证功能

---

## ⚙️ 高级配置（可选）

### 6.1 自定义用户字段
1. 在Clerk Dashboard中点击 "User & Authentication" → "User Profile"
2. 可以添加自定义字段：
   - 用户昵称
   - 个人简介
   - 头像上传
   - 等等

### 6.2 Webhook配置
如果需要在用户注册/登录时执行自定义逻辑：

1. 在Clerk Dashboard中点击 "Webhooks"
2. 添加新的Webhook端点：
   - **Endpoint URL**: `https://yourdomain.com/api/clerk-webhook`
   - **Events**: 选择需要监听的事件（如 `user.created`）

3. 创建 `api/clerk-webhook.ts` 文件：
```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Webhook } from 'svix';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhook = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  
  try {
    const payload = webhook.verify(JSON.stringify(req.body), {
      'svix-id': req.headers['svix-id'] as string,
      'svix-timestamp': req.headers['svix-timestamp'] as string,
      'svix-signature': req.headers['svix-signature'] as string,
    });

    // 处理用户事件
    if (payload.type === 'user.created') {
      console.log('新用户注册:', payload.data.id);
      // 这里可以添加自定义逻辑，如发送欢迎邮件
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook验证失败:', error);
    res.status(400).json({ error: 'Webhook verification failed' });
  }
}
```

### 6.3 多租户支持
如果需要支持多个组织或团队：

1. 在Clerk Dashboard中启用 "Organizations" 功能
2. 在代码中使用组织相关的组件：
```tsx
import { OrganizationSwitcher, OrganizationProfile } from '@clerk/clerk-react';

// 组织切换器
<OrganizationSwitcher />

// 组织配置页面
<OrganizationProfile />
```

---

## 🔍 故障排除

### 常见错误及解决方案

#### 错误1: "Clerk: publishableKey is missing"
**原因**: 环境变量未正确配置
**解决**: 检查 `setenv.sh` 文件中的 `VITE_CLERK_PUBLISHABLE_KEY`

#### 错误2: "Invalid publishable key"
**原因**: 使用了错误的密钥或环境不匹配
**解决**: 确认使用的是正确环境的密钥（test vs live）

#### 错误3: 登录后页面不刷新
**原因**: React状态管理问题
**解决**: 确保正确使用了 `useUser()` hook

#### 错误4: 社交登录失败
**原因**: OAuth配置不正确
**解决**: 检查社交平台的OAuth应用配置，确保回调URL正确

#### 错误5: 生产环境认证失败
**原因**: 域名配置问题
**解决**: 在Clerk Dashboard中添加正确的生产域名

---

## 📞 获取帮助

### 官方资源
- **官方文档**: https://clerk.com/docs
- **API参考**: https://clerk.com/docs/reference
- **社区论坛**: https://clerk.com/community

### 本地调试技巧
1. **查看网络请求**: 浏览器开发者工具 → Network标签
2. **检查控制台**: 查看任何JavaScript错误
3. **Clerk调试**: 在代码中添加 `console.log(user)` 查看用户对象

### 技术支持
如果遇到问题：
1. 检查Clerk Dashboard的状态页面
2. 查看官方文档的故障排除部分
3. 在项目Issues中搜索类似问题

---

## ✅ 配置完成检查清单

完成所有配置后，请确认：

- [ ] Clerk账户已创建并验证
- [ ] 应用已在Clerk Dashboard中创建
- [ ] 获得了publishableKey和secretKey
- [ ] 环境变量正确配置在 `setenv.sh` 中
- [ ] 本地开发环境认证功能正常
- [ ] 生产环境变量已配置到Vercel
- [ ] 生产域名已添加到Clerk Dashboard
- [ ] 生产环境认证功能正常

**🎉 Clerk用户认证系统配置完成！**

现在你的应用已经拥有了企业级的用户认证功能，支持邮箱登录、社交登录、用户管理等完整功能。
