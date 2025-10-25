/**
 * Monitoring Page
 * Real-time input monitoring with live typing and feedback
 * Analyzes text as user types with time-series confidence tracking
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import apiClient from '../services/api';
import type { AnalyzeResponse } from '../services/types';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';

interface TimeSeriesData {
  time: string;
  confidence: number;
  aiScore: number;
}

export default function MonitoringPage() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const analysisTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const startTimeRef = useRef<Date>(new Date());

  // Auto-analyze on text change with debouncing
  const handleTextChange = useCallback(
    (newText: string) => {
      setText(newText);
      setError(null);

      // Clear previous timeout
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }

      // Set new timeout for analysis
      if (newText.trim().length > 0) {
        setLoading(true);
        analysisTimeoutRef.current = setTimeout(async () => {
          try {
            const response = await apiClient.analyze({ text: newText });
            setResult(response);
            setError(null);

            // Add to time series
            const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000);
            const newDataPoint: TimeSeriesData = {
              time: `${elapsedSeconds}s`,
              confidence: response.confidence * 100,
              aiScore: response.ai_score,
            };

            setTimeSeries((prev) => {
              // Keep only last 20 data points
              const updated = [...prev, newDataPoint];
              return updated.length > 20 ? updated.slice(-20) : updated;
            });
          } catch (err) {
            const message = err instanceof Error ? err.message : '분석 실패';
            setError(message);
          } finally {
            setLoading(false);
          }
        }, 500); // Wait 500ms after user stops typing
      } else {
        setResult(null);
        setLoading(false);
      }
    },
    []
  );

  const handleClear = () => {
    setText('');
    setResult(null);
    setTimeSeries([]);
    setError(null);
    startTimeRef.current = new Date();
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, []);

  const confidence = result ? Math.round(result.confidence * 100) : 0;
  const isAI = result?.label === 'AI_GENERATED';
  const displayLabel = isAI ? '🤖 AI가 작성한 것으로 보입니다' : '👤 인간이 작성한 것으로 보입니다';
  const displayColor = isAI ? 'text-ai-600' : 'text-human-600';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900">⚡ 실시간 모니터링</h1>
        <p className="text-gray-600 mt-2">타이핑하면서 실시간으로 AI 감지 결과를 확인하세요</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          ❌ {error}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Input */}
        <Card className="lg:col-span-2 p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">✍️ 입력 텍스트</h2>
            <span className="text-sm text-gray-600">{text.length} / 1000 글자</span>
          </div>

          <textarea
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="여기에 텍스트를 입력하세요... 자동으로 분석됩니다"
            maxLength={1000}
            className="w-full h-64 p-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
          />

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((text.length / 1000) * 100, 100)}%` }}
            ></div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              onClick={handleClear}
              variant="secondary"
              className="flex-1"
            >
              🗑️ 초기화
            </Button>
            {loading && (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-sm text-gray-600">분석 중...</span>
              </div>
            )}
          </div>
        </Card>

        {/* Live Score Display */}
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">📊 라이브 스코어</h2>

          {result ? (
            <div className="space-y-4">
              {/* AI/Human Label */}
              <div className={`p-4 rounded-lg border-2 ${isAI ? 'border-ai-300 bg-ai-50' : 'border-human-300 bg-human-50'}`}>
                <p className={`text-center font-bold text-lg ${displayColor}`}>{displayLabel}</p>
              </div>

              {/* Confidence Gauge */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-700">신뢰도</span>
                  <span className="text-2xl font-bold text-blue-600">{confidence}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-300 ${
                      confidence > 70 ? 'bg-red-500' : confidence > 40 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${confidence}%` }}
                  ></div>
                </div>
              </div>

              {/* AI Score */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-700">AI 점수</span>
                  <span className="text-xl font-bold text-purple-600">{result.ai_score}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full"
                    style={{ width: `${result.ai_score}%` }}
                  ></div>
                </div>
              </div>

              {/* Statistics */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-700">분석 문장</span>
                  <span className="font-semibold">{result.sentences_analyzed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-700">처리 시간</span>
                  <span className="font-semibold">{result.processing_time_ms}ms</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500 text-center">
              <p>텍스트를 입력하면 여기에 분석 결과가 표시됩니다</p>
            </div>
          )}
        </Card>
      </div>

      {/* Time Series Chart */}
      {timeSeries.length > 0 && (
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">📈 신뢰도 변화 추이</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeSeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip
                formatter={(value: any) => {
                  if (typeof value === 'number') {
                    return value.toFixed(1);
                  }
                  return value;
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="confidence"
                stroke="#3b82f6"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name="신뢰도 (%)"
              />
              <Line
                type="monotone"
                dataKey="aiScore"
                stroke="#a855f7"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name="AI 점수"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Feedback Section */}
      {result && (
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">💡 분석 피드백</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            {isAI ? (
              <>
                <p className="font-semibold text-blue-900">🤖 AI 생성 텍스트일 가능성이 높습니다</p>
                <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
                  <li>문맥이 일관되고 매끄러움</li>
                  <li>단어 선택이 정확하고 다양함</li>
                  <li>문법적 오류가 거의 없음</li>
                </ul>
              </>
            ) : (
              <>
                <p className="font-semibold text-blue-900">👤 인간이 작성한 텍스트일 가능성이 높습니다</p>
                <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
                  <li>자연스러운 표현과 개인적 스타일</li>
                  <li>간단한 구조와 실수가 있을 수 있음</li>
                  <li>인간적인 감정과 의견이 드러남</li>
                </ul>
              </>
            )}
          </div>

          {/* Confidence Interpretation */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">신뢰도 {confidence}%:</span>{' '}
              {confidence > 80
                ? '매우 높은 신뢰도로 분류됩니다'
                : confidence > 60
                  ? '높은 신뢰도로 분류됩니다'
                  : confidence > 40
                    ? '중간 수준의 신뢰도로 분류됩니다'
                    : '낮은 신뢰도로 분류됩니다'}
            </p>
          </div>
        </Card>
      )}

      {/* Info Box */}
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm space-y-1">
        <p>⚠️ <span className="font-semibold">참고:</span> 실시간 분석 결과는 참고만 하세요</p>
        <p>• 문장이 길어질수록 분석 정확도가 높아집니다</p>
        <p>• 최소 50글자 이상일 때 더 정확한 결과를 얻을 수 있습니다</p>
      </div>
    </div>
  );
}
