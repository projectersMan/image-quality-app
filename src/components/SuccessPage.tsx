import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const SuccessPage = () => {
  const [searchParams] = useSearchParams();
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const id = searchParams.get('session_id');
    setSessionId(id);
  }, [searchParams]);

  return (
    <div style={{ 
      textAlign: 'center', 
      padding: '3rem', 
      maxWidth: '600px', 
      margin: '0 auto' 
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: 'white',
        padding: '2rem',
        borderRadius: '12px',
        marginBottom: '2rem'
      }}>
        <h1>🎉 支付成功！</h1>
        <p>欢迎升级到Pro版本！</p>
      </div>
      
      <div style={{
        padding: '2rem',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        backgroundColor: '#f9fafb'
      }}>
        <h2>您现在可以享受：</h2>
        <ul style={{ textAlign: 'left', margin: '1rem 0' }}>
          <li>✅ 无限制图像分析</li>
          <li>✅ 批量处理功能</li>
          <li>✅ 详细分析报告</li>
          <li>✅ 优先技术支持</li>
          <li>✅ 高级AI模型访问</li>
        </ul>
        
        {sessionId && (
          <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '1rem' }}>
            交易ID: {sessionId}
          </p>
        )}
        
        <button 
          onClick={() => window.location.href = '/'}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            padding: '1rem 2rem',
            borderRadius: '8px',
            fontSize: '1rem',
            cursor: 'pointer',
            marginTop: '2rem'
          }}
        >
          开始使用Pro功能
        </button>
      </div>
    </div>
  );
};

export default SuccessPage;