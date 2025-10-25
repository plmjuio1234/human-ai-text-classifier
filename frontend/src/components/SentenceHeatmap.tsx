/**
 * SentenceHeatmap Component
 * Shows sentence-level analysis with AI probability heatmap
 */

import type { SentenceAnalysis } from '../services/types';

interface SentenceHeatmapProps {
  sentences: SentenceAnalysis[];
}

export default function SentenceHeatmap({ sentences }: SentenceHeatmapProps) {
  // Get color based on probability
  const getHeatmapColor = (probability: number): string => {
    if (probability >= 0.7) return 'bg-ai-500';      // Red - AI (70-100%)
    if (probability >= 0.5) return 'bg-amber-400';   // Orange - Uncertain (50-70%)
    return 'bg-human-500';                            // Blue - Human (0-50%)
  };

  // Get text color for contrast
  const getTextColor = (probability: number): string => {
    if (probability >= 0.5) return 'text-white';
    return 'text-white';
  };

  // Get label for probability
  const getLabel = (probability: number): string => {
    if (probability >= 0.7) return 'AI 확률 높음';
    if (probability >= 0.5) return '불확실';
    return 'AI 확률 낮음';
  };

  return (
    <div className="card p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">🌡️ 문장별 분석</h2>
        <p className="text-gray-600">각 문장의 AI 확률을 시각화했습니다</p>
      </div>

      {/* Legend */}
      <div className="mb-6 bg-gray-50 rounded-lg p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">범례:</p>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-human-500" />
            <span className="text-sm text-gray-700">0-50%: 인간이 쓴 가능성</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-400" />
            <span className="text-sm text-gray-700">50-70%: 불확실</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-ai-500" />
            <span className="text-sm text-gray-700">70-100%: AI가 쓴 가능성</span>
          </div>
        </div>
      </div>

      {/* Sentences */}
      <div className="space-y-4">
        {sentences.map((sentence, index) => {
          const probability = sentence.ai_probability;
          const percentDisplay = Math.round(probability * 100);

          return (
            <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Header with probability */}
              <div
                className={`${getHeatmapColor(probability)} ${getTextColor(probability)} px-4 py-3 flex items-center justify-between`}
              >
                <span className="font-medium">문장 {index + 1}</span>
                <div className="text-right">
                  <div className="font-bold text-lg">{percentDisplay}%</div>
                  <div className="text-xs opacity-90">{getLabel(probability)}</div>
                </div>
              </div>

              {/* Sentence Text */}
              <div className="bg-white px-4 py-4">
                <p className="text-gray-800 leading-relaxed mb-4">{sentence.sentence}</p>

                {/* Word-level analysis (if available) */}
                {sentence.words && sentence.words.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-600 mb-3">단어 분석:</p>
                    <div className="flex flex-wrap gap-2">
                      {sentence.words.slice(0, 10).map((word, wordIndex) => {
                        const wordProb = word.probability;
                        const wordColor = getHeatmapColor(wordProb);
                        const wordPercent = Math.round(wordProb * 100);

                        return (
                          <span
                            key={wordIndex}
                            className={`${wordColor} ${getTextColor(wordProb)} px-2 py-1 rounded text-xs font-medium whitespace-nowrap cursor-help`}
                            title={`${word.word}: ${wordPercent}%`}
                          >
                            {word.word} <span className="opacity-75">({wordPercent}%)</span>
                          </span>
                        );
                      })}
                      {sentence.words.length > 10 && (
                        <span className="text-xs text-gray-500 px-2 py-1">
                          +{sentence.words.length - 10} 더 보기
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              <div className="bg-gray-100 h-1">
                <div
                  className={getHeatmapColor(probability)}
                  style={{ width: `${probability * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Statistics */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">📊 통계</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">분석된 문장</p>
            <p className="text-2xl font-bold text-gray-900">{sentences.length}</p>
          </div>

          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">평균 AI 확률</p>
            <p className="text-2xl font-bold text-ai-600">
              {Math.round(
                (sentences.reduce((sum, s) => sum + s.ai_probability, 0) / sentences.length) * 100
              )}%
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">AI 확률 높은 문장</p>
            <p className="text-2xl font-bold text-ai-600">
              {sentences.filter((s) => s.ai_probability >= 0.7).length}개
            </p>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          <strong>💡 참고:</strong> 문장별 분석은 각 문장의 특성에 따라 AI 생성 확률을 나타냅니다.
          문체, 어휘 선택, 문법 구조 등이 분석에 영향을 미칩니다.
        </p>
      </div>
    </div>
  );
}
