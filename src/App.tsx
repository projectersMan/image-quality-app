import { useState, useCallback } from 'react';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useUser } from '@clerk/clerk-react';
import { loadStripe } from '@stripe/stripe-js';
import { clsx } from 'clsx';

// 初始化Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

function App() {
  const { user } = useUser();
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // 处理文件选择
  const handleFileSelect = useCallback((selectedFile: File) => {
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      setFile(selectedFile);
      setError(null);
      setScore(null);
      
      // 生成预览图
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setError('请选择一个有效的图片文件');
    }
  }, []);

  // 处理文件输入变化
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  // 处理拖拽
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  // 分析图片质量
  const handleAnalyze = async () => {
    if (!file) {
      setError('请先选择一张图片');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // 将文件转换为base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `分析失败: ${response.statusText}`);
      }

      const result = await response.json();
      setScore(result.score);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析过程中出现错误');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 处理升级到Pro
  const handleUpgradeToPro = async () => {
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: import.meta.env.VITE_STRIPE_PRICE_ID,
          userId: user?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('创建支付会话失败');
      }

      const { sessionId } = await response.json();
      const stripe = await stripePromise;
      
      if (stripe) {
        await stripe.redirectToCheckout({ sessionId });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '支付过程中出现错误');
    }
  };

  // 获取评分显示样式
  const getScoreStyle = (score: number) => {
    if (score >= 8) return { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' };
    if (score >= 6) return { background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' };
    return { background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' };
  };

  // 获取评分文本
  const getScoreText = (score: number) => {
    if (score >= 8) return '优秀';
    if (score >= 6) return '良好';
    return '需要改进';
  };

  return (
    <div className="App">
      <header>
        <h1>🖼️ 图像质量AI分析</h1>
        <p>使用先进的AI技术分析您的图片质量</p>
        
        {/* 用户认证区域 */}
        <div className="auth-section">
          <SignedOut>
            <div>
              <p>登录以享受完整功能</p>
              <SignInButton mode="modal">
                <button className="analyze-btn">登录</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="analyze-btn">注册</button>
              </SignUpButton>
            </div>
          </SignedOut>
          <SignedIn>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center' }}>
              <span>欢迎，{user?.firstName || user?.emailAddresses[0]?.emailAddress}</span>
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>
        </div>
      </header>

      <main>
        <SignedIn>
          {/* 上传区域 */}
          <div 
            className={clsx('upload-area', { dragover: dragOver })}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            {imagePreview ? (
              <div>
                <img 
                  src={imagePreview} 
                  alt="预览" 
                  className="image-preview"
                />
                <p>点击或拖拽选择其他图片</p>
              </div>
            ) : (
              <div>
                <p>📷 点击或拖拽上传图片</p>
                <p>支持 JPG, PNG, WEBP 格式</p>
              </div>
            )}
          </div>

          {/* 分析按钮 */}
          {file && (
            <button 
              className="analyze-btn"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <span className="loading"></span>
                  分析中...
                </>
              ) : (
                '🤖 开始AI分析'
              )}
            </button>
          )}

          {/* 错误显示 */}
          {error && (
            <div style={{ 
              color: '#ef4444', 
              margin: '1rem 0', 
              padding: '1rem', 
              border: '1px solid #ef4444', 
              borderRadius: '4px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)'
            }}>
              ❌ {error}
            </div>
          )}

          {/* 分数显示 */}
          {score !== null && (
            <div className="score-display" style={getScoreStyle(score)}>
              <div>质量评分: {score.toFixed(1)}/10</div>
              <div style={{ fontSize: '1rem', marginTop: '0.5rem' }}>
                {getScoreText(score)}
              </div>
            </div>
          )}

          {/* Pro功能推广 */}
          <div className="premium-banner">
            <h3>🚀 升级到Pro版本</h3>
            <p>• 批量分析 • 详细报告 • 优化建议 • 无限制使用</p>
            <button className="analyze-btn" onClick={handleUpgradeToPro}>
              💎 立即升级 - ¥29/月
            </button>
          </div>
        </SignedIn>

        <SignedOut>
          <div style={{ margin: '2rem 0', padding: '2rem', border: '1px solid #333', borderRadius: '8px' }}>
            <h2>🔒 请先登录</h2>
            <p>登录后即可享受AI图像质量分析服务</p>
            <div style={{ margin: '1rem 0' }}>
              <SignInButton mode="modal">
                <button className="analyze-btn">立即登录</button>
              </SignInButton>
            </div>
          </div>
        </SignedOut>
      </main>

      <footer style={{ marginTop: '3rem', padding: '2rem', borderTop: '1px solid #333', fontSize: '0.9rem', color: '#888' }}>
        <p>🤖 基于先进AI技术 • 🔒 隐私保护 • ⚡ 秒级分析</p>
        <p>本服务使用 Replicate AI 模型进行图像质量分析</p>
      </footer>
    </div>
  );
}

export default App;
