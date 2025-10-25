/**
 * Batch Page
 * Multiple file analysis with progress tracking and results download
 * Integrates: FileUpload, ProgressBar, ResultsTable
 */

import { useState } from 'react';
import { useMutation } from 'react-query';
import apiClient from '../services/api';
import type { BatchStatusResponse } from '../services/types';
import FileUpload from '../components/FileUpload';
import ProgressBar from '../components/ProgressBar';
import ResultsTable from '../components/ResultsTable';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';

type PageState = 'upload' | 'processing' | 'complete';

export default function BatchPage() {
  const [pageState, setPageState] = useState<PageState>('upload');
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batchStatus, setBatchStatus] = useState<BatchStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Upload batch mutation
  const { mutate: uploadBatch, isLoading: isUploading } = useMutation({
    mutationFn: async (files: File[]) => {
      setError(null);
      const response = await apiClient.uploadBatch(files);
      return response;
    },
    onSuccess: (data) => {
      setBatchId(data.batch_id);
      setPageState('processing');
    },
    onError: (err: any) => {
      const message = err?.error?.message || (err instanceof Error ? err.message : '파일 업로드 실패');
      setError(message);
    },
  });

  // Download results mutation
  const { mutate: downloadResults, isLoading: isDownloading } = useMutation({
    mutationFn: async (format: 'csv' | 'xlsx') => {
      if (!batchId) throw new Error('배치 ID 없음');
      const blob = await apiClient.downloadBatchResults(batchId, format);
      return blob;
    },
    onSuccess: (blob, format) => {
      const fileName = `batch_results_${batchId}.${format}`;
      apiClient.downloadFile(blob, fileName);
    },
    onError: (err: any) => {
      const message = err instanceof Error ? err.message : '다운로드 실패';
      setError(message);
    },
  });

  const handleBatchComplete = (result: BatchStatusResponse) => {
    setBatchStatus(result);
    setPageState('complete');
  };

  const handleBatchError = (errorMsg: string) => {
    setError(errorMsg);
  };

  const handleReset = () => {
    setPageState('upload');
    setBatchId(null);
    setBatchStatus(null);
    setError(null);
  };

  const handleUploadBatch = async (files: File[]) => {
    return new Promise<void>((resolve) => {
      uploadBatch(files, {
        onSettled: () => resolve(),
      });
    });
  };

  const handleDownloadResults = async (format: 'csv' | 'xlsx') => {
    return new Promise<void>((resolve) => {
      downloadResults(format, {
        onSettled: () => resolve(),
      });
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900">📦 배치 분석</h1>
        <p className="text-gray-600 mt-2">여러 파일을 한 번에 분석하고 결과를 다운로드하세요</p>
      </div>

      {/* Error Display */}
      {error && pageState !== 'upload' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
          <div className="flex items-start gap-4">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">오류 발생</h3>
              <p>{error}</p>
              <Button
                onClick={handleReset}
                variant="secondary"
                className="mt-3 text-sm px-4 py-2"
              >
                다시 시작
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upload State */}
      {pageState === 'upload' && (
        <Card className="p-8">
          <FileUpload onSubmit={handleUploadBatch} isLoading={isUploading} />
        </Card>
      )}

      {/* Processing State */}
      {pageState === 'processing' && batchId && (
        <ProgressBar
          batchId={batchId}
          onComplete={handleBatchComplete}
          onError={handleBatchError}
        />
      )}

      {/* Complete State */}
      {pageState === 'complete' && batchStatus && (
        <>
          {/* Success Message */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-green-700">
            <div className="flex items-start gap-4">
              <span className="text-2xl">✅</span>
              <div>
                <h3 className="font-semibold mb-1">배치 분석 완료!</h3>
                <p>총 {batchStatus.summary?.total_files || 0}개 파일의 분석이 완료되었습니다.</p>
              </div>
            </div>
          </div>

          {/* Results Table */}
          <ResultsTable
            batchStatus={batchStatus}
            onDownload={handleDownloadResults}
            isDownloading={isDownloading}
          />

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              onClick={handleReset}
              variant="secondary"
              className="flex-1 py-6 text-lg font-semibold"
            >
              새로운 배치 분석
            </Button>
            <Button
              onClick={() => {
                const data = JSON.stringify(batchStatus, null, 2);
                const element = document.createElement('a');
                element.setAttribute(
                  'href',
                  'data:application/json;charset=utf-8,' + encodeURIComponent(data)
                );
                element.setAttribute('download', `batch_${batchId}_results.json`);
                element.style.display = 'none';
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
              }}
              variant="secondary"
              className="flex-1 py-6 text-lg font-semibold"
            >
              JSON 저장
            </Button>
          </div>
        </>
      )}

      {/* Info Section */}
      {pageState === 'upload' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">💡 배치 분석 가이드</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>✓ 한 번에 최대 10개의 파일을 분석할 수 있습니다</li>
            <li>✓ 지원 형식: .txt, .pdf, .docx (최대 50MB)</li>
            <li>✓ 각 파일은 약 2초 정도 소요됩니다</li>
            <li>✓ 분석 완료 후 CSV/Excel 형식으로 결과를 다운로드할 수 있습니다</li>
            <li>✓ 문장별 상세 분석도 함께 제공됩니다</li>
          </ul>
        </div>
      )}
    </div>
  );
}
