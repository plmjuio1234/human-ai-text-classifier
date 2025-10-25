/**
 * Predict Page
 * Single text analysis with AI detection
 * Integrates: TextInput, ResultDisplay, ModelComparison, SentenceHeatmap
 */

import { useState } from 'react';
import { useMutation } from 'react-query';
import apiClient from '../services/api';
import type { PredictResponse } from '../services/types';
import TextInput from '../components/TextInput';
import ResultDisplay from '../components/ResultDisplay';
import ModelComparison from '../components/ModelComparison';
import SentenceHeatmap from '../components/SentenceHeatmap';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';

export default function PredictPage() {
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mutation for text prediction
  const { mutate: predictText, isLoading } = useMutation({
    mutationFn: async (text: string) => {
      setError(null);
      const response = await apiClient.predict({ text });
      return response;
    },
    onSuccess: (data) => {
      setResult(data);
      setError(null);
    },
    onError: (err: any) => {
      const errorMessage =
        err?.error?.message || (err instanceof Error ? err.message : '분석 실패');
      setError(errorMessage);
      setResult(null);
    },
  });

  const handleSubmit = async (text: string) => {
    predictText(text);
  };

  return (
    <div className="container-main">
      {/* Header with Gradient */}
      <div className="mb-12 animate-fade-in">
        <div className="inline-block mb-4 px-4 py-2 bg-sky-100 text-sky-700 rounded-full text-sm font-semibold">
          🚀 AI vs Human Text Detection
        </div>
        <h1 className="text-5xl font-black mb-4 text-slate-900 tracking-tight">
          텍스트 분석기
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl leading-relaxed">
          입력하신 텍스트를 3개의 최신 AI 모델로 분석하여 AI가 작성했을 가능성을 판단합니다.
          실시간으로 정확한 결과를 받아보세요.
        </p>
      </div>

      {/* Main Input Card */}
      <div className="mb-8 animate-fade-in">
        <Card className="card-body">
          <div className="mb-6">
            <h2 className="section-title">분석할 텍스트 입력</h2>
          </div>
          <TextInput onSubmit={handleSubmit} isLoading={isLoading} />
        </Card>
      </div>

      {/* Error Display */}
      {error && !isLoading && (
        <div className="mb-8 animate-fade-in">
          <div className="card bg-red-50 border-red-200 p-6">
            <div className="flex items-start gap-4">
              <div className="text-3xl">⚠️</div>
              <div className="flex-1">
                <h3 className="font-bold text-red-700 mb-2">분석 오류 발생</h3>
                <p className="text-red-600 mb-2">{error}</p>
                <p className="text-sm text-red-500">서버가 실행 중인지 확인해주세요 (http://localhost:8000)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="mb-8 animate-fade-in">
          <Card className="card-body text-center py-12">
            <div className="mb-6">
              <div className="text-6xl mb-4 animate-spin inline-block">⟳</div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">분석 중입니다</h3>
            <p className="text-slate-600 mb-8">3개 모델이 병렬로 텍스트를 분석하고 있습니다</p>
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
              <div className="badge-processing justify-center">
                🤖 Kanana 8B
              </div>
              <div className="badge-processing justify-center">
                🤖 Gemma 12B
              </div>
              <div className="badge-processing justify-center">
                🤖 Qwen3 14B
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Results Section */}
      {result && !isLoading && (
        <div className="animate-fade-in space-y-8">
          {/* Main Result */}
          <ResultDisplay result={result} />

          {/* Model Comparison */}
          {result.model_scores && result.model_scores.length > 0 && (
            <ModelComparison modelScores={result.model_scores} />
          )}

          {/* Sentence Analysis */}
          {result && (
            <div>
              <SentenceHeatmap sentences={[]} />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6">
            <Button
              onClick={() => setResult(null)}
              variant="secondary"
              className="flex-1 py-4 text-base font-semibold"
            >
              🔄 다시 분석하기
            </Button>
            <Button
              onClick={() => {
                const text = result.text || '';
                if (text) {
                  const element = document.createElement('a');
                  element.setAttribute(
                    'href',
                    'data:text/plain;charset=utf-8,' + encodeURIComponent(text)
                  );
                  element.setAttribute('download', 'analysis_result.txt');
                  element.style.display = 'none';
                  document.body.appendChild(element);
                  element.click();
                  document.body.removeChild(element);
                }
              }}
              variant="secondary"
              className="flex-1 py-4 text-base font-semibold"
            >
              💾 결과 저장
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && !isLoading && !error && (
        <div className="animate-fade-in">
          <Card className="card-body text-center py-16 border-2 border-dashed border-sky-200">
            <div className="text-7xl mb-6">🎯</div>
            <h3 className="text-3xl font-bold text-slate-900 mb-3">시작할 준비가 되셨나요?</h3>
            <p className="text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
              위의 입력 상자에 분석할 텍스트를 입력하고 "분석하기" 버튼을 클릭하세요.
              최대 5000자까지 분석할 수 있습니다.
            </p>
            <div className="mt-8 flex items-center justify-center gap-2 text-slate-500">
              <span>↓</span>
              <span className="text-sm">텍스트를 입력하고 시작하세요</span>
              <span>↓</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
