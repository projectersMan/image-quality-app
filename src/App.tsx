import { useState, useCallback } from 'react';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useUser } from '@clerk/clerk-react';
import { clsx } from 'clsx';
import ProgressBar from './components/ProgressBar';
import Sidebar from './components/Sidebar';
import ImageComparison from './components/ImageComparison';
import AutopilotPanel from './components/AutopilotPanel';

function App() {
  const { user } = useUser();
  
  // 基础状态
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // 分析功能状态
  const [score, setScore] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);

  // 处理状态（用于检测是否有任何处理正在进行）
  const [isProcessing] = useState(false);

  // Autopilot功能状态
  const [autopilotScores, setAutopilotScores] = useState<any>(null);
  const [autopilotRecommendations, setAutopilotRecommendations] = useState<any>(null);
  const [isAutopilotAnalyzing, setIsAutopilotAnalyzing] = useState(false);
  const [isAutopilotEnhancing, setIsAutopilotEnhancing] = useState(false);

  // 当前显示的图像状态
  const [currentProcessedImage, setCurrentProcessedImage] = useState<string | null>(null);
  const [currentProcessingType, setCurrentProcessingType] = useState<string>('');

  // 文件上传处理
  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    
    // 重置所有结果
    setScore(null);
    setAutopilotScores(null);
    setAutopilotRecommendations(null);
    setCurrentProcessedImage(null);
    setCurrentProcessingType('');

    // 创建预览
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  }, []);

  // 拖拽处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  // 文件输入处理
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  }, [handleFileSelect]);

  // 图像转换为base64
  const getImageBase64 = useCallback(async (imageFile: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(imageFile);
    });
  }, []);

  // AI分析处理
  const handleAnalyze = async () => {
    if (!file) {
      setError('请先选择图像');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalyzeProgress(0);

    try {
      setAnalyzeProgress(20);
      const base64 = await getImageBase64(file);
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
      setScore(result.quality_score);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析过程中出现错误');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Autopilot智能增强
  const handleAutopilot = async () => {
    if (!file) {
      setError('请先选择图像');
      return;
    }

    setIsAutopilotAnalyzing(true);
    setError(null);

    try {
      // 第一阶段：智能分析
      const base64 = await getImageBase64(file);
      
      const analyzeResponse = await fetch('/api/autopilot-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64,
        }),
      });

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json();
        throw new Error(errorData.error || 'Autopilot分析失败');
      }

      const analyzeResult = await analyzeResponse.json();
      setAutopilotScores(analyzeResult.scores);
      setAutopilotRecommendations(analyzeResult.recommendations);
      
      setIsAutopilotAnalyzing(false);
      setIsAutopilotEnhancing(true);
      setCurrentProcessingType('Autopilot智能增强');

      // 第二阶段：自动增强
      const enhanceResponse = await fetch('/api/autopilot-enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64,
          recommendations: analyzeResult.recommendations,
        }),
      });

      if (!enhanceResponse.ok) {
        const errorData = await enhanceResponse.json();
        throw new Error(errorData.error || 'Autopilot增强失败');
      }

      const enhanceResult = await enhanceResponse.json();
      setCurrentProcessedImage(enhanceResult.results.final);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Autopilot处理过程中出现错误');
    } finally {
      setIsAutopilotAnalyzing(false);
      setIsAutopilotEnhancing(false);
    }
  };

  // 参数变化处理
  const handleParameterChange = (type: string, key: string, value: any) => {
    if (!autopilotRecommendations) return;

    const newRecommendations = { ...autopilotRecommendations };
    if (newRecommendations[type]) {
      newRecommendations[type][key] = value;
      setAutopilotRecommendations(newRecommendations);
      
      // TODO: 实现参数变化时的自动重新处理
      console.log('参数变化:', type, key, value);
    }
  };

  return (
    <div className="app-container">
      {/* 顶部导航栏 */}
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <h1>🤖 AI图像质量分析</h1>
            <p className="header-subtitle">智能分析 · 自动增强 · 专业处理</p>
          </div>
          <div className="header-right">
            <SignedOut>
              <div className="auth-buttons">
                <SignInButton mode="modal">
                  <button className="auth-btn signin-btn">登录</button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="auth-btn signup-btn">注册</button>
                </SignUpButton>
              </div>
            </SignedOut>
            <SignedIn>
              <div className="user-section">
                <span className="welcome-text">欢迎, {user?.firstName || '用户'}</span>
                <UserButton afterSignOutUrl="/" />
              </div>
            </SignedIn>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <main className="app-main">
        {/* 左侧和中间：图像对比显示 */}
        <div className="main-content">
          <ImageComparison
            originalImage={imagePreview}
            processedImage={currentProcessedImage}
            isProcessing={isAutopilotAnalyzing || isAutopilotEnhancing || isAnalyzing || isProcessing}
            processingType={currentProcessingType}
          />
        </div>

        {/* 右侧边栏：所有控制功能 */}
        <Sidebar>
          {/* 图像上传区域 */}
          <div className="upload-section">
            <h3>📷 图像上传</h3>
            <div
              className={clsx('upload-area', { 'drag-over': dragOver })}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="file-input"
                id="file-input"
              />
              <label htmlFor="file-input" className="upload-label">
                <div className="upload-content">
                  <span className="upload-icon">📁</span>
                  <p>点击选择或拖拽图像文件</p>
                  <p className="upload-hint">支持 JPG, PNG, WEBP 格式</p>
                </div>
              </label>
            </div>
            
            {file && (
              <div className="file-info">
                <p>已选择: {file.name}</p>
                <p>大小: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            )}
          </div>

          {/* Autopilot智能增强面板 */}
          <AutopilotPanel
            scores={autopilotScores}
            recommendations={autopilotRecommendations}
            isAnalyzing={isAutopilotAnalyzing}
            isEnhancing={isAutopilotEnhancing}
            onStartAutopilot={handleAutopilot}
            onParameterChange={handleParameterChange}
          />

          {/* 基础AI分析 */}
          <div className="analysis-section">
            <h3>🤖 AI质量分析</h3>
            <button
              className="analyze-btn"
              onClick={handleAnalyze}
              disabled={isAnalyzing || !file}
            >
              {isAnalyzing ? (
                <>
                  <span className="loading"></span>
                  分析中...
                </>
              ) : (
                '开始AI分析'
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
            
            {score !== null && (
              <div className="score-result">
                <p>质量评分: <span className="score-value">{score}/100</span></p>
              </div>
            )}
          </div>

          {/* 错误显示 */}
          {error && (
            <div className="error-message">
              <p>❌ {error}</p>
            </div>
          )}
        </Sidebar>
      </main>
    </div>
  );
}

export default App;
