/**
 * ModelComparison Component
 * Shows comparison of all 3 models using a radar chart
 */

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { ModelScore } from '../services/types';

interface ModelComparisonProps {
  modelScores: ModelScore[];
}

export default function ModelComparison({ modelScores }: ModelComparisonProps) {
  // Transform data for Radar chart
  const data = modelScores.map((score) => ({
    name: score.model_name.charAt(0).toUpperCase() + score.model_name.slice(1),
    'AI Score': score.ai_score,
    'Confidence': Math.round(score.confidence * 100),
  }));

  // Define colors for each model
  const colors = {
    Kanana: '#0ea5e9',     // AI blue
    Gemma: '#a855f7',      // Human purple
    Qwen3: '#f59e0b',      // Amber
  };

  return (
    <div className="card p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">📊 모델 비교</h2>
        <p className="text-gray-600">3개 모델의 분석 결과 비교</p>
      </div>

      {/* Radar Chart */}
      <div className="mb-8">
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="name" tick={{ fontSize: 12 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} />
            <Radar
              name="AI Score"
              dataKey="AI Score"
              stroke={colors.Kanana}
              fill={colors.Kanana}
              fillOpacity={0.25}
            />
            <Radar
              name="Confidence"
              dataKey="Confidence"
              stroke={colors.Gemma}
              fill={colors.Gemma}
              fillOpacity={0.25}
            />
            <Tooltip formatter={(value) => `${value}%`} />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">모델</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">AI 스코어</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">신뢰도</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">처리 시간</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {modelScores.map((score) => {
              const modelName = score.model_name.charAt(0).toUpperCase() + score.model_name.slice(1);
              const color = (colors as Record<string, string>)[modelName] || '#6b7280';

              return (
                <tr key={score.model_name} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                    <span
                      className="inline-block w-3 h-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    {modelName}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${score.ai_score > 50 ? 'text-ai-600' : 'text-human-600'}`}>
                      {score.ai_score}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-gray-900">
                      {Math.round(score.confidence * 100)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {score.processing_time_ms}ms
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Statistics */}
      <div className="mt-8 grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-ai-50 to-ai-100 rounded-lg p-4">
          <p className="text-sm text-ai-700 font-medium mb-1">평균 AI 스코어</p>
          <p className="text-3xl font-bold text-ai-700">
            {Math.round(modelScores.reduce((sum, s) => sum + s.ai_score, 0) / modelScores.length)}%
          </p>
        </div>

        <div className="bg-gradient-to-br from-human-50 to-human-100 rounded-lg p-4">
          <p className="text-sm text-human-700 font-medium mb-1">평균 신뢰도</p>
          <p className="text-3xl font-bold text-human-700">
            {Math.round(
              (modelScores.reduce((sum, s) => sum + s.confidence, 0) / modelScores.length) * 100
            )}%
          </p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4">
          <p className="text-sm text-amber-700 font-medium mb-1">총 처리 시간</p>
          <p className="text-3xl font-bold text-amber-700">
            {modelScores.reduce((sum, s) => sum + s.processing_time_ms, 0)}ms
          </p>
        </div>
      </div>

      {/* Notes */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          <strong>📝 참고:</strong> 세 모델의 결과를 종합적으로 고려하면 더 정확한 판단이 가능합니다.
          모델마다 학습 데이터와 특성이 다르기 때문에 약간의 편차가 있을 수 있습니다.
        </p>
      </div>
    </div>
  );
}
