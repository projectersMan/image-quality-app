import React from 'react';

interface ProgressBarProps {
  isVisible: boolean;
  progress: number; // 0-100
  message?: string;
  type?: 'analyze' | 'upscale';
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  isVisible, 
  progress, 
  message = '处理中...', 
  type = 'analyze' 
}) => {
  if (!isVisible) return null;

  const getProgressColor = () => {
    switch (type) {
      case 'analyze':
        return 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)';
      case 'upscale':
        return 'linear-gradient(90deg, #10b981 0%, #059669 100%)';
      default:
        return 'linear-gradient(90deg, #6b7280 0%, #4b5563 100%)';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'analyze':
        return '🤖';
      case 'upscale':
        return '🚀';
      default:
        return '⚡';
    }
  };

  return (
    <div className="progress-container">
      <div className="progress-header">
        <span className="progress-icon">{getIcon()}</span>
        <span className="progress-message">{message}</span>
        <span className="progress-percentage">{Math.round(progress)}%</span>
      </div>
      
      <div className="progress-bar-wrapper">
        <div 
          className="progress-bar-fill"
          style={{
            width: `${progress}%`,
            background: getProgressColor(),
            transition: 'width 0.3s ease-in-out'
          }}
        />
      </div>
      
      <style>{`
        .progress-container {
          margin: 1rem 0;
          padding: 1rem;
          border: 1px solid #333;
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.1);
        }
        
        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
        }
        
        .progress-icon {
          font-size: 1.2rem;
        }
        
        .progress-message {
          flex: 1;
          margin-left: 0.5rem;
          color: #e5e7eb;
        }
        
        .progress-percentage {
          font-weight: bold;
          color: #f3f4f6;
        }
        
        .progress-bar-wrapper {
          width: 100%;
          height: 8px;
          background-color: #374151;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .progress-bar-fill {
          height: 100%;
          border-radius: 4px;
          position: relative;
        }
        
        .progress-bar-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.2) 50%,
            transparent 100%
          );
          animation: shimmer 2s infinite;
        }
        
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
};

export default ProgressBar;