/**
 * ProgressBar Component
 * Shows batch processing progress with polling
 */

import { useState, useEffect } from 'react';
import apiClient from '../services/api';
import type { BatchStatusResponse } from '../services/types';

interface ProgressBarProps {
  batchId: string;
  onComplete?: (result: BatchStatusResponse) => void;
  onError?: (error: string) => void;
}

export default function ProgressBar({ batchId, onComplete, onError }: ProgressBarProps) {
  const [status, setStatus] = useState<BatchStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Polling effect
  useEffect(() => {
    let isMounted = true;
    let pollInterval: ReturnType<typeof setInterval>;

    const pollStatus = async () => {
      try {
        const result = await apiClient.getBatchStatus(batchId);
        if (!isMounted) return;

        setStatus(result);
        setError(null);

        if (result.status === 'COMPLETED' || result.status === 'FAILED') {
          if (result.status === 'COMPLETED' && onComplete) {
            onComplete(result);
          } else if (result.status === 'FAILED' && onError) {
            onError(result.error_message || '배치 처리 실패');
          }
          clearInterval(pollInterval);
        }
      } catch (err) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : '상태 확인 실패';
        setError(message);
        if (onError) onError(message);
        clearInterval(pollInterval);
      }
    };

    // Initial poll
    pollStatus();

    // Set up polling interval
    pollInterval = setInterval(pollStatus, 1000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [batchId, onComplete, onError]);

  // Elapsed time effect
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
        <div className="flex items-start gap-4">
          <span className="text-2xl">❌</span>
          <div>
            <h3 className="font-semibold mb-1">배치 처리 오류</h3>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="card p-8 text-center">
        <div className="inline-block">
          <div className="text-5xl mb-4 animate-spin">⟳</div>
          <p className="text-gray-700 font-semibold">상태 확인 중...</p>
        </div>
      </div>
    );
  }

  const progress = status.progress || { completed: 0, total: 1, percentage: 0 };
  const percentage = progress.percentage || 0;
  const isCompleted = status.status === 'COMPLETED';
  const isFailed = status.status === 'FAILED';

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get status color
  const getStatusColor = (): string => {
    if (isFailed) return 'text-red-700';
    if (isCompleted) return 'text-green-700';
    return 'text-blue-700';
  };

  // Get status icon
  const getStatusIcon = (): string => {
    if (isFailed) return '❌';
    if (isCompleted) return '✅';
    return '🔄';
  };

  return (
    <div className="card p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className={`text-2xl font-bold ${getStatusColor()}`}>
            {getStatusIcon()} {
              isFailed
                ? '실패'
                : isCompleted
                  ? '완료'
                  : '처리 중'
            }
          </h2>
          <p className="text-sm text-gray-600">배치 ID: {batchId}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-gray-900">{percentage}%</p>
          <p className="text-sm text-gray-600">{formatTime(elapsedTime)}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isFailed ? 'bg-red-500' : isCompleted ? 'bg-green-500' : 'bg-ai-600'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-600">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* File Progress */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-900">파일 진행 상황</span>
          <span className="text-lg font-bold text-gray-900">
            {progress.completed} / {progress.total}
          </span>
        </div>
        <div className="space-y-1">
          {Array.from({ length: progress.total }).map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index < progress.completed ? 'bg-green-500' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Status Messages */}
      <div className="space-y-2">
        {!isCompleted && !isFailed && (
          <>
            <div className="flex items-center gap-2 text-blue-700 text-sm">
              <span className="animate-spin text-lg">⟳</span>
              <span>파일을 분석하고 있습니다...</span>
            </div>
            <div className="text-xs text-gray-600">
              예상 남은 시간: ~{Math.ceil((progress.total - progress.completed) * 2)}초
            </div>
          </>
        )}

        {isCompleted && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
            ✅ 배치 분석이 완료되었습니다! 결과를 확인하세요.
          </div>
        )}

        {isFailed && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            ❌ {status.error_message || '배치 처리 중 오류가 발생했습니다'}
          </div>
        )}
      </div>

      {/* Summary (if completed) */}
      {isCompleted && status.summary && (
        <div className="grid grid-cols-4 gap-3 pt-4 border-t border-gray-200">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 text-center">
            <p className="text-xs text-blue-700 font-medium">총 파일</p>
            <p className="text-2xl font-bold text-blue-900">{status.summary.total_files}</p>
          </div>

          <div className="bg-gradient-to-br from-ai-50 to-ai-100 rounded-lg p-3 text-center">
            <p className="text-xs text-ai-700 font-medium">AI</p>
            <p className="text-2xl font-bold text-ai-900">{status.summary.ai_files}</p>
          </div>

          <div className="bg-gradient-to-br from-human-50 to-human-100 rounded-lg p-3 text-center">
            <p className="text-xs text-human-700 font-medium">인간</p>
            <p className="text-2xl font-bold text-human-900">{status.summary.human_files}</p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-3 text-center">
            <p className="text-xs text-amber-700 font-medium">평균 점수</p>
            <p className="text-2xl font-bold text-amber-900">
              {Math.round(status.summary.average_score)}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
