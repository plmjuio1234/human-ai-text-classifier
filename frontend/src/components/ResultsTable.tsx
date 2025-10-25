/**
 * ResultsTable Component
 * Shows batch analysis results with sorting and filtering
 */

import { useState } from 'react';
import type { FileResultData, BatchStatusResponse } from '../services/types';

interface ResultsTableProps {
  batchStatus: BatchStatusResponse;
  onDownload?: (format: 'csv' | 'xlsx') => Promise<void>;
  isDownloading?: boolean;
}

type SortField = 'filename' | 'ai_score' | 'confidence';
type SortOrder = 'asc' | 'desc';
type FilterType = 'all' | 'ai' | 'human';

export default function ResultsTable({
  batchStatus,
  onDownload,
  isDownloading = false,
}: ResultsTableProps) {
  const [sortField, setSortField] = useState<SortField>('ai_score');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const results = batchStatus.results || [];

  // Filter results
  const filteredResults = results.filter((result) => {
    if (result.error) return false;
    if (filterType === 'ai') return result.label === 'AI_GENERATED';
    if (filterType === 'human') return result.label === 'HUMAN_WRITTEN';
    return true;
  });

  // Sort results
  const sortedResults = [...filteredResults].sort((a, b) => {
    let aVal: string | number = '';
    let bVal: string | number = '';

    if (sortField === 'filename') {
      aVal = a.filename.toLowerCase();
      bVal = b.filename.toLowerCase();
    } else if (sortField === 'ai_score') {
      aVal = a.ai_score;
      bVal = b.ai_score;
    } else if (sortField === 'confidence') {
      aVal = a.confidence;
      bVal = b.confidence;
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Get sort icon
  const getSortIcon = (field: SortField): string => {
    if (sortField !== field) return '·';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  // Get badge
  const getBadge = (result: FileResultData) => {
    if (result.error) {
      return { color: 'bg-red-100 text-red-700', label: '❌ 오류' };
    }
    if (result.label === 'AI_GENERATED') {
      return { color: 'badge-ai', label: '🤖 AI' };
    }
    return { color: 'badge-human', label: '👤 인간' };
  };

  // Statistics
  const totalFiles = results.length;
  const successFiles = results.filter((r) => !r.error).length;
  const errorFiles = results.filter((r) => r.error).length;
  const aiFiles = results.filter((r) => r.label === 'AI_GENERATED').length;
  const humanFiles = results.filter((r) => r.label === 'HUMAN_WRITTEN').length;

  return (
    <div className="card p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">📋 분석 결과</h2>
        <p className="text-gray-600">
          {sortedResults.length}개 파일 ({filterType === 'all' ? '전체' : filterType === 'ai' ? 'AI만' : '인간만'})
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <p className="text-xs text-blue-700 font-medium mb-1">총 파일</p>
          <p className="text-2xl font-bold text-blue-900">{totalFiles}</p>
        </div>

        <div className="bg-green-50 rounded-lg p-4 text-center">
          <p className="text-xs text-green-700 font-medium mb-1">성공</p>
          <p className="text-2xl font-bold text-green-900">{successFiles}</p>
        </div>

        <div className="bg-red-50 rounded-lg p-4 text-center">
          <p className="text-xs text-red-700 font-medium mb-1">오류</p>
          <p className="text-2xl font-bold text-red-900">{errorFiles}</p>
        </div>

        <div className="bg-ai-50 rounded-lg p-4 text-center">
          <p className="text-xs text-ai-700 font-medium mb-1">AI</p>
          <p className="text-2xl font-bold text-ai-900">{aiFiles}</p>
        </div>

        <div className="bg-human-50 rounded-lg p-4 text-center">
          <p className="text-xs text-human-700 font-medium mb-1">인간</p>
          <p className="text-2xl font-bold text-human-900">{humanFiles}</p>
        </div>
      </div>

      {/* Filter & Download */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        {/* Filter */}
        <div className="flex gap-2">
          {(['all', 'ai', 'human'] as FilterType[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setFilterType(filter)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                filterType === filter
                  ? 'bg-ai-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter === 'all' ? '전체' : filter === 'ai' ? 'AI만' : '인간만'}
            </button>
          ))}
        </div>

        {/* Download */}
        <div className="flex gap-2">
          {['csv', 'xlsx'].map((format) => (
            <button
              key={format}
              onClick={() => onDownload?.(format as 'csv' | 'xlsx')}
              disabled={isDownloading || successFiles === 0}
              className="btn-secondary px-4 py-2 text-sm font-medium disabled:opacity-50 uppercase"
            >
              {isDownloading ? '다운로드 중...' : `${format} 다운로드`}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th
                className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('filename')}
              >
                파일명 {getSortIcon('filename')}
              </th>
              <th
                className="px-4 py-3 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('ai_score')}
              >
                AI 점수 {getSortIcon('ai_score')}
              </th>
              <th
                className="px-4 py-3 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('confidence')}
              >
                신뢰도 {getSortIcon('confidence')}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">판정</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">시간</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">상세</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedResults.map((result, index) => {
              const badge = getBadge(result);
              const isExpanded = expandedRow === result.filename;

              return (
                <tr key={`${result.filename}-${index}`}  className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 truncate">
                    {result.filename}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`font-bold ${
                        result.ai_score >= 50 ? 'text-ai-600' : 'text-human-600'
                      }`}
                    >
                      {result.ai_score}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-medium text-gray-900">
                      {Math.round(result.confidence * 100)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {result.processing_time_ms}ms
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() =>
                        setExpandedRow(isExpanded ? null : result.filename)
                      }
                      className="text-ai-600 hover:text-ai-700 font-medium"
                    >
                      {isExpanded ? '▼' : '▶'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Expanded Details */}
      {expandedRow && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          {sortedResults
            .filter((r) => r.filename === expandedRow)
            .map((result) => (
              <div key={result.filename} className="space-y-2">
                <p className="font-semibold text-gray-900">{result.filename}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <p className="text-xs text-gray-600">AI 점수</p>
                    <p className="font-bold text-gray-900">{result.ai_score}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">신뢰도</p>
                    <p className="font-bold text-gray-900">
                      {Math.round(result.confidence * 100)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">분석된 문장</p>
                    <p className="font-bold text-gray-900">
                      {result.sentences_analyzed}개
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">처리 시간</p>
                    <p className="font-bold text-gray-900">
                      {result.processing_time_ms}ms
                    </p>
                  </div>
                </div>

                {result.error && (
                  <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-700">
                    ⚠️ {result.error}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Empty State */}
      {sortedResults.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 text-lg">분석 결과가 없습니다</p>
          <p className="text-gray-400 text-sm mt-1">필터를 변경하거나 다시 시도해보세요</p>
        </div>
      )}
    </div>
  );
}
