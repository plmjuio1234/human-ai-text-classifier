/**
 * ResultDisplay Component
 * Shows prediction results with AI/Human indicator and confidence gauge
 */

import type { PredictResponse } from '../services/types';

interface ResultDisplayProps {
  result: PredictResponse;
}

export default function ResultDisplay({ result }: ResultDisplayProps) {
  const { ai_score, confidence, label, processing_time_ms, sentences_analyzed } = result;

  const isAI = label === 'AI_GENERATED';
  const displayLabel = isAI ? '🤖 AI가 작성한 것으로 보입니다' : '👤 인간이 작성한 것으로 보입니다';
  const displayLabelEn = isAI ? 'AI Generated' : 'Human Written';
  const backgroundColor = isAI ? 'bg-ai-50' : 'bg-human-50';
  const borderColor = isAI ? 'border-ai-300' : 'border-human-300';
  const textColor = isAI ? 'text-ai-700' : 'text-human-700';
  const badgeClass = isAI ? 'badge-ai' : 'badge-human';
  const gaugeFillColor = isAI ? 'bg-ai-600' : 'bg-human-600';

  const confidencePercent = Math.round(confidence * 100);

  return (
    <div className={`rounded-lg border-2 p-8 ${backgroundColor} ${borderColor}`}>
      {/* Main Result */}
      <div className="text-center mb-8">
        <div className={`text-6xl ${textColor} mb-4`}>{isAI ? '🤖' : '👤'}</div>
        <h2 className={`text-3xl font-bold ${textColor} mb-2`}>{displayLabel}</h2>
        <p className={`text-lg ${textColor.replace('700', '600')}`}>{displayLabelEn}</p>
      </div>

      {/* AI Score Display */}
      <div className="bg-white rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <span className="font-semibold text-gray-900">AI 스코어</span>
          <span className={badgeClass}>{ai_score}%</span>
        </div>

        {/* Score Bar */}
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${gaugeFillColor}`}
            style={{ width: `${ai_score}%` }}
          />
        </div>

        {/* Score Range */}
        <div className="flex justify-between mt-2 text-xs text-gray-600">
          <span>0% (확실한 인간)</span>
          <span>50% (불확실)</span>
          <span>100% (확실한 AI)</span>
        </div>
      </div>

      {/* Confidence */}
      <div className="bg-white rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <span className="font-semibold text-gray-900">신뢰도</span>
          <span className="text-2xl font-bold text-ai-600">{confidencePercent}%</span>
        </div>

        {/* Confidence Bar */}
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className="h-full bg-ai-600 transition-all duration-500"
            style={{ width: `${confidencePercent}%` }}
          />
        </div>

        {/* Confidence Description */}
        <p className={`mt-3 text-sm ${textColor.replace('700', '600')}`}>
          {confidencePercent >= 80
            ? '✓ 매우 높은 신뢰도'
            : confidencePercent >= 60
              ? '△ 보통 신뢰도'
              : '○ 낮은 신뢰도'}
        </p>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-4 bg-white rounded-lg p-6">
        <div>
          <p className="text-sm text-gray-600 mb-1">분석된 문장</p>
          <p className="text-2xl font-bold text-gray-900">{sentences_analyzed}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-1">처리 시간</p>
          <p className="text-2xl font-bold text-gray-900">{processing_time_ms}ms</p>
        </div>
      </div>

      {/* Interpretation */}
      <div className="mt-8 bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-3">💡 해석</h3>
        <p className="text-gray-700 leading-relaxed">
          {isAI ? (
            <>
              이 텍스트는 <strong>AI가 생성했을 가능성이 높습니다</strong>. AI 텍스트의 특징은 일반적으로
              구조적이고 체계적이며, 자연스러운 인간 문장의 비일관성과 개성이 부족할 수 있습니다. 다만 이
              판단은 확률적 분석에 기반한 것이므로 절대적이지 않습니다.
            </>
          ) : (
            <>
              이 텍스트는 <strong>인간이 작성했을 가능성이 높습니다</strong>. 인간 텍스트는 일반적으로
              개인적인 표현 방식, 자연스러운 실수, 그리고 독특한 문체를 포함합니다. 이는 분석 기반 판단이므로
              항상 정확할 수는 없습니다.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
