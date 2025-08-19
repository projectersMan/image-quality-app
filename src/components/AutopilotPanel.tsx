import React, { useState } from 'react';

interface AutopilotScores {
  tone: number;
  detail: number;
  resolution: number;
  overall: number;
}

interface AutopilotRecommendations {
  tone?: {
    enabled: boolean;
    type: string;
    intensity: number;
  };
  detail?: {
    enabled: boolean;
    type: string;
    strength: number;
  };
  upscale?: {
    enabled: boolean;
    scale: number;
    model: string;
  };
  priority: string[];
}

interface AutopilotPanelProps {
  scores: AutopilotScores | null;
  recommendations: AutopilotRecommendations | null;
  isAnalyzing: boolean;
  isEnhancing: boolean;
  onStartAutopilot: () => void;
  onParameterChange: (type: string, key: string, value: any) => void;
}

const AutopilotPanel: React.FC<AutopilotPanelProps> = ({
  scores,
  recommendations,
  isAnalyzing,
  isEnhancing,
  onStartAutopilot,
  onParameterChange
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981'; // 绿色
    if (score >= 60) return '#f59e0b'; // 橙色
    return '#ef4444'; // 红色
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return '优秀';
    if (score >= 60) return '良好';
    return '需要改进';
  };

  return (
    <div className="autopilot-panel">
      <div className="panel-header">
        <h3>🤖 Autopilot 智能增强</h3>
        <p className="panel-description">
          自动分析图像质量并智能推荐最佳增强方案
        </p>
      </div>

      <div className="autopilot-actions">
        <button
          className="autopilot-btn primary"
          onClick={onStartAutopilot}
          disabled={isAnalyzing || isEnhancing}
        >
          {isAnalyzing ? (
            <>
              <span className="loading"></span>
              分析中...
            </>
          ) : isEnhancing ? (
            <>
              <span className="loading"></span>
              增强中...
            </>
          ) : (
            '🚀 开始智能增强'
          )}
        </button>
      </div>

      {/* 质量评分显示 */}
      {scores && (
        <div className="quality-scores">
          <h4>质量评分</h4>
          <div className="score-grid">
            <div className="score-item">
              <div className="score-label">影调质量</div>
              <div className="score-value" style={{ color: getScoreColor(scores.tone) }}>
                {scores.tone}分
              </div>
              <div className="score-status">{getScoreLabel(scores.tone)}</div>
            </div>
            
            <div className="score-item">
              <div className="score-label">细节清晰</div>
              <div className="score-value" style={{ color: getScoreColor(scores.detail) }}>
                {scores.detail}分
              </div>
              <div className="score-status">{getScoreLabel(scores.detail)}</div>
            </div>
            
            <div className="score-item">
              <div className="score-label">分辨率</div>
              <div className="score-value" style={{ color: getScoreColor(scores.resolution) }}>
                {scores.resolution}分
              </div>
              <div className="score-status">{getScoreLabel(scores.resolution)}</div>
            </div>
            
            <div className="score-item overall">
              <div className="score-label">综合评分</div>
              <div className="score-value" style={{ color: getScoreColor(scores.overall) }}>
                {scores.overall}分
              </div>
              <div className="score-status">{getScoreLabel(scores.overall)}</div>
            </div>
          </div>
        </div>
      )}

      {/* 增强建议和参数调节 */}
      {recommendations && (
        <div className="enhancement-recommendations">
          <div className="recommendations-header">
            <h4>增强建议</h4>
            <button
              className="expand-btn"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? '收起参数' : '展开参数'}
            </button>
          </div>

          <div className="priority-list">
            <div className="priority-label">处理顺序：</div>
            <div className="priority-items">
              {recommendations.priority.map((step, index) => (
                <span key={step} className="priority-item">
                  {index + 1}. {step === 'tone' ? '影调增强' : step === 'detail' ? '细节增强' : '超分辨率'}
                </span>
              ))}
            </div>
          </div>

          {isExpanded && (
            <div className="parameter-controls">
              {/* 影调增强参数 */}
              {recommendations.tone?.enabled && (
                <div className="parameter-group">
                  <h5>🎨 影调增强</h5>
                  <div className="parameter-row">
                    <label>类型：</label>
                    <select
                      value={recommendations.tone.type}
                      onChange={(e) => onParameterChange('tone', 'type', e.target.value)}
                    >
                      <option value="general">通用增强</option>
                      <option value="night">夜景增强</option>
                      <option value="landscape">风景增强</option>
                      <option value="hdr">高动态增强</option>
                    </select>
                  </div>
                  <div className="parameter-row">
                    <label>强度：</label>
                    <select
                      value={recommendations.tone.intensity}
                      onChange={(e) => onParameterChange('tone', 'intensity', Number(e.target.value))}
                    >
                      <option value={0.5}>轻微 (0.5x)</option>
                      <option value={1.0}>标准 (1.0x)</option>
                      <option value={1.5}>增强 (1.5x)</option>
                      <option value={2.0}>强烈 (2.0x)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* 细节增强参数 */}
              {recommendations.detail?.enabled && (
                <div className="parameter-group">
                  <h5>🔍 细节增强</h5>
                  <div className="parameter-row">
                    <label>类型：</label>
                    <select
                      value={recommendations.detail.type}
                      onChange={(e) => onParameterChange('detail', 'type', e.target.value)}
                    >
                      <option value="general">通用细节</option>
                      <option value="hair">发丝细节</option>
                      <option value="plant">植物细节</option>
                      <option value="text">文字清晰</option>
                    </select>
                  </div>
                  <div className="parameter-row">
                    <label>强度：</label>
                    <select
                      value={recommendations.detail.strength}
                      onChange={(e) => onParameterChange('detail', 'strength', Number(e.target.value))}
                    >
                      <option value={1}>轻微</option>
                      <option value={2}>标准</option>
                      <option value={3}>强烈</option>
                    </select>
                  </div>
                </div>
              )}

              {/* 超分辨率参数 */}
              {recommendations.upscale?.enabled && (
                <div className="parameter-group">
                  <h5>🚀 超分辨率</h5>
                  <div className="parameter-row">
                    <label>倍数：</label>
                    <select
                      value={recommendations.upscale.scale}
                      onChange={(e) => onParameterChange('upscale', 'scale', Number(e.target.value))}
                    >
                      <option value={2}>2x</option>
                      <option value={4}>4x</option>
                      <option value={8}>8x</option>
                    </select>
                  </div>
                  <div className="parameter-row">
                    <label>模型：</label>
                    <select
                      value={recommendations.upscale.model}
                      onChange={(e) => onParameterChange('upscale', 'model', e.target.value)}
                    >
                      <option value="real-esrgan">Real-ESRGAN (通用)</option>
                      <option value="aura-sr-v2">Aura SR v2 (高质量)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AutopilotPanel;
