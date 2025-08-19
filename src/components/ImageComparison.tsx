import React from 'react';

interface ImageComparisonProps {
  originalImage: string | null;
  processedImage: string | null;
  isProcessing: boolean;
  processingType?: string;
}

const ImageComparison: React.FC<ImageComparisonProps> = ({
  originalImage,
  processedImage,
  isProcessing,
  processingType
}) => {
  return (
    <div className="image-comparison-container">
      {/* 左侧：原始图像 */}
      <div className="image-panel original-panel">
        <div className="image-panel-header">
          <h3>原始图像</h3>
        </div>
        <div className="image-panel-content">
          {originalImage ? (
            <img
              src={originalImage}
              alt="原始图像"
              className="comparison-image"
            />
          ) : (
            <div className="image-placeholder">
              <div className="placeholder-content">
                <span className="placeholder-icon">📷</span>
                <p>请上传图像</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 中间：处理后图像 */}
      <div className="image-panel processed-panel">
        <div className="image-panel-header">
          <h3>处理结果</h3>
          {processingType && (
            <span className="processing-type">{processingType}</span>
          )}
        </div>
        <div className="image-panel-content">
          {isProcessing ? (
            <div className="processing-placeholder">
              <div className="processing-content">
                <div className="loading-spinner"></div>
                <p>处理中...</p>
              </div>
            </div>
          ) : processedImage ? (
            <img
              src={processedImage}
              alt="处理结果"
              className="comparison-image"
            />
          ) : (
            <div className="image-placeholder">
              <div className="placeholder-content">
                <span className="placeholder-icon">✨</span>
                <p>处理结果将显示在这里</p>
              </div>
            </div>
          )}
        </div>
        
        {processedImage && !isProcessing && (
          <div className="image-panel-actions">
            <a
              href={processedImage}
              download={`enhanced_image_${Date.now()}.png`}
              className="download-btn"
            >
              📥 下载图像
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageComparison;
