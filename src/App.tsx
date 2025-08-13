import { useState, useCallback } from 'react';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useUser } from '@clerk/clerk-react';
import { loadStripe } from '@stripe/stripe-js';
import { clsx } from 'clsx';
import ProgressBar from './components/ProgressBar';

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
  const [analyzeProgress, setAnalyzeProgress] = useState(0);

  // 超分功能状态
  const [upscaledImage, setUpscaledImage] = useState<string | null>(null);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [upscaleScale, setUpscaleScale] = useState<number>(2);
  const [upscaleModel, setUpscaleModel] = useState('real-esrgan');
  const [upscaleProgress, setUpscaleProgress] = useState(0);

  // 影调增强功能状态
  const [toneEnhancedImage, setToneEnhancedImage] = useState<string | null>(null);
  const [isToneEnhancing, setIsToneEnhancing] = useState(false);
  const [toneEnhanceType, setToneEnhanceType] = useState('general');
  const [toneIntensity, setToneIntensity] = useState<number>(1.0);
  const [toneEnhanceProgress, setToneEnhanceProgress] = useState(0);

  // 细节增强功能状态
  const [detailEnhancedImage, setDetailEnhancedImage] = useState<string | null>(null);
  const [isDetailEnhancing, setIsDetailEnhancing] = useState(false);
  const [detailEnhanceType, setDetailEnhanceType] = useState('general');
  const [detailStrength, setDetailStrength] = useState<number>(2);
  const [detailEnhanceProgress, setDetailEnhanceProgress] = useState(0);

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
    setAnalyzeProgress(0);

    try {
      setAnalyzeProgress(20);
      // 将文件转换为base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setAnalyzeProgress(40);

      setAnalyzeProgress(60);
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64,
        }),
      });
      setAnalyzeProgress(80);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `分析失败: ${response.statusText}`);
      }

      const result = await response.json();
      setAnalyzeProgress(100);
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

  // 处理图像超分
  const handleUpscale = async () => {
    if (!file) {
      setError('请先选择图像');
      return;
    }

    setIsUpscaling(true);
    setError(null);
    setUpscaleProgress(0);

    try {
      setUpscaleProgress(20);
      // 将文件转换为base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setUpscaleProgress(40);

      setUpscaleProgress(60);
      const response = await fetch('/api/upscale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64,
          scale: upscaleScale,
          face_enhance: true,
          model: upscaleModel
        }),
      });
      setUpscaleProgress(80);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `超分处理失败: ${response.statusText}`);
      }

      const result = await response.json();
      setUpscaleProgress(100);
      setUpscaledImage(result.upscaled_image);
    } catch (err) {
      setError(err instanceof Error ? err.message : '超分处理过程中出现错误');
    } finally {
      setIsUpscaling(false);
    }
  };

  // 处理影调增强
  const handleToneEnhance = async () => {
    if (!file) {
      setError('请先选择图像');
      return;
    }

    setIsToneEnhancing(true);
    setError(null);
    setToneEnhanceProgress(0);

    try {
      setToneEnhanceProgress(20);
      // 将文件转换为base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setToneEnhanceProgress(40);

      setToneEnhanceProgress(60);
      const response = await fetch('/api/tone-enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64,
          enhanceType: toneEnhanceType,
          intensity: toneIntensity
        }),
      });
      setToneEnhanceProgress(80);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `影调增强失败: ${response.statusText}`);
      }

      const result = await response.json();
      setToneEnhanceProgress(100);
      setToneEnhancedImage(result.enhanced_image);
    } catch (err) {
      setError(err instanceof Error ? err.message : '影调增强过程中出现错误');
    } finally {
      setIsToneEnhancing(false);
    }
  };

  // 处理细节增强
  const handleDetailEnhance = async () => {
    if (!file) {
      setError('请先选择图像');
      return;
    }

    setIsDetailEnhancing(true);
    setError(null);
    setDetailEnhanceProgress(0);

    try {
      setDetailEnhanceProgress(20);
      // 将文件转换为base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setDetailEnhanceProgress(40);

      setDetailEnhanceProgress(60);
      const response = await fetch('/api/detail-enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64,
          enhanceType: detailEnhanceType,
          strength: detailStrength
        }),
      });
      setDetailEnhanceProgress(80);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `细节增强失败: ${response.statusText}`);
      }

      const result = await response.json();
      setDetailEnhanceProgress(100);
      setDetailEnhancedImage(result.enhanced_image);
    } catch (err) {
      setError(err instanceof Error ? err.message : '细节增强过程中出现错误');
    } finally {
      setIsDetailEnhancing(false);
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

          {/* 功能按钮组 */}
          {file && (
            <div className="button-group">
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
              {isAnalyzing && (
                 <ProgressBar 
                   isVisible={isAnalyzing} 
                   progress={analyzeProgress} 
                   message="AI分析进度" 
                   type="analyze" 
                 />
               )}

              <div className="upscale-section">
                <div className="upscale-controls">
                  <label htmlFor="model-select">超分模型:</label>
                  <select
                    id="model-select"
                    value={upscaleModel}
                    onChange={(e) => setUpscaleModel(e.target.value)}
                    disabled={isUpscaling}
                  >
                    <option value="real-esrgan">Real-ESRGAN (通用)</option>
                    <option value="aura-sr-v2">Aura SR v2 (高质量)</option>
                  </select>

                  <label htmlFor="scale-select">放大倍数:</label>
                  <select
                    id="scale-select"
                    value={upscaleScale}
                    onChange={(e) => setUpscaleScale(Number(e.target.value))}
                    disabled={isUpscaling}
                  >
                    <option value={2}>2x</option>
                    <option value={4}>4x</option>
                    <option value={8}>8x</option>
                  </select>
                </div>

                <button
                  className="upscale-btn"
                  onClick={handleUpscale}
                  disabled={isUpscaling}
                >
                  {isUpscaling ? (
                    <>
                      <span className="loading"></span>
                      超分处理中...
                    </>
                  ) : (
                    '🚀 AI超分辨率'
                  )}
                </button>
                {isUpscaling && (
                   <ProgressBar
                     isVisible={isUpscaling}
                     progress={upscaleProgress}
                     message="超分处理进度"
                     type="upscale"
                   />
                 )}
              </div>

              {/* 影调增强功能 */}
              <div className="tone-enhance-section">
                <div className="tone-enhance-controls">
                  <label htmlFor="tone-type-select">影调增强类型:</label>
                  <select
                    id="tone-type-select"
                    value={toneEnhanceType}
                    onChange={(e) => setToneEnhanceType(e.target.value)}
                    disabled={isToneEnhancing}
                  >
                    <option value="general">通用增强</option>
                    <option value="night">夜景增强</option>
                    <option value="landscape">风景增强</option>
                    <option value="hdr">高动态增强</option>
                  </select>

                  <label htmlFor="tone-intensity-select">增强强度:</label>
                  <select
                    id="tone-intensity-select"
                    value={toneIntensity}
                    onChange={(e) => setToneIntensity(Number(e.target.value))}
                    disabled={isToneEnhancing}
                  >
                    <option value={0.5}>轻微 (0.5x)</option>
                    <option value={1.0}>标准 (1.0x)</option>
                    <option value={1.5}>增强 (1.5x)</option>
                    <option value={2.0}>强烈 (2.0x)</option>
                  </select>
                </div>

                <button
                  className="tone-enhance-btn"
                  onClick={handleToneEnhance}
                  disabled={isToneEnhancing}
                >
                  {isToneEnhancing ? (
                    <>
                      <span className="loading"></span>
                      影调增强中...
                    </>
                  ) : (
                    '🎨 AI影调增强'
                  )}
                </button>
                {isToneEnhancing && (
                   <ProgressBar
                     isVisible={isToneEnhancing}
                     progress={toneEnhanceProgress}
                     message="影调增强进度"
                     type="tone-enhance"
                   />
                 )}
              </div>

              {/* 细节增强功能 */}
              <div className="detail-enhance-section">
                <div className="detail-enhance-controls">
                  <label htmlFor="detail-type-select">细节增强类型:</label>
                  <select
                    id="detail-type-select"
                    value={detailEnhanceType}
                    onChange={(e) => setDetailEnhanceType(e.target.value)}
                    disabled={isDetailEnhancing}
                  >
                    <option value="general">通用细节</option>
                    <option value="hair">发丝细节</option>
                    <option value="plant">植物细节</option>
                    <option value="text">文字清晰</option>
                  </select>

                  <label htmlFor="detail-strength-select">增强强度:</label>
                  <select
                    id="detail-strength-select"
                    value={detailStrength}
                    onChange={(e) => setDetailStrength(Number(e.target.value))}
                    disabled={isDetailEnhancing}
                  >
                    <option value={1}>轻微</option>
                    <option value={2}>标准</option>
                    <option value={3}>强烈</option>
                  </select>
                </div>

                <button
                  className="detail-enhance-btn"
                  onClick={handleDetailEnhance}
                  disabled={isDetailEnhancing}
                >
                  {isDetailEnhancing ? (
                    <>
                      <span className="loading"></span>
                      细节增强中...
                    </>
                  ) : (
                    '🔍 AI细节增强'
                  )}
                </button>
                {isDetailEnhancing && (
                   <ProgressBar
                     isVisible={isDetailEnhancing}
                     progress={detailEnhanceProgress}
                     message="细节增强进度"
                     type="detail-enhance"
                   />
                 )}
              </div>
            </div>
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

          {/* 超分结果显示 */}
          {upscaledImage && (
            <div className="upscale-result">
              <h3>🚀 超分辨率结果</h3>
              <div className="image-comparison">
                <div className="comparison-item">
                  <h4>原图</h4>
                  <img
                    src={imagePreview || ''}
                    alt="原图"
                    style={{ maxWidth: '100%', height: 'auto', border: '1px solid #333' }}
                  />
                </div>
                <div className="comparison-item">
                  <h4>超分结果 ({upscaleScale}x)</h4>
                  <img
                    src={upscaledImage}
                    alt="超分结果"
                    style={{ maxWidth: '100%', height: 'auto', border: '1px solid #333' }}
                  />
                  <div style={{ marginTop: '1rem' }}>
                    <a
                      href={upscaledImage}
                      download={`upscaled_${upscaleScale}x_${file?.name || 'image'}`}
                      className="download-btn"
                    >
                      📥 下载超分图像
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 影调增强结果显示 */}
          {toneEnhancedImage && (
            <div className="tone-enhance-result">
              <h3>🎨 影调增强结果</h3>
              <div className="image-comparison">
                <div className="comparison-item">
                  <h4>原图</h4>
                  <img
                    src={imagePreview || ''}
                    alt="原图"
                    style={{ maxWidth: '100%', height: 'auto', border: '1px solid #333' }}
                  />
                </div>
                <div className="comparison-item">
                  <h4>影调增强结果 ({toneEnhanceType})</h4>
                  <img
                    src={toneEnhancedImage}
                    alt="影调增强结果"
                    style={{ maxWidth: '100%', height: 'auto', border: '1px solid #333' }}
                  />
                  <div style={{ marginTop: '1rem' }}>
                    <a
                      href={toneEnhancedImage}
                      download={`tone_enhanced_${toneEnhanceType}_${file?.name || 'image'}`}
                      className="download-btn"
                    >
                      📥 下载影调增强图像
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 细节增强结果显示 */}
          {detailEnhancedImage && (
            <div className="detail-enhance-result">
              <h3>🔍 细节增强结果</h3>
              <div className="image-comparison">
                <div className="comparison-item">
                  <h4>原图</h4>
                  <img
                    src={imagePreview || ''}
                    alt="原图"
                    style={{ maxWidth: '100%', height: 'auto', border: '1px solid #333' }}
                  />
                </div>
                <div className="comparison-item">
                  <h4>细节增强结果 ({detailEnhanceType})</h4>
                  <img
                    src={detailEnhancedImage}
                    alt="细节增强结果"
                    style={{ maxWidth: '100%', height: 'auto', border: '1px solid #333' }}
                  />
                  <div style={{ marginTop: '1rem' }}>
                    <a
                      href={detailEnhancedImage}
                      download={`detail_enhanced_${detailEnhanceType}_${file?.name || 'image'}`}
                      className="download-btn"
                    >
                      📥 下载细节增强图像
                    </a>
                  </div>
                </div>
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
