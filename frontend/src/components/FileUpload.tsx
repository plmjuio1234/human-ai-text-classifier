/**
 * FileUpload Component
 * Drag & drop file upload with validation and preview
 */

import { useState, useRef } from 'react';
import type { ChangeEvent, DragEvent } from 'react';

interface FileItem {
  file: File;
  id: string;
  size: string;
  isValid: boolean;
  error?: string;
}

interface FileUploadProps {
  onSubmit: (files: File[]) => Promise<void>;
  isLoading?: boolean;
}

export default function FileUpload({ onSubmit, isLoading = false }: FileUploadProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const SUPPORTED_FORMATS = ['.txt', '.pdf', '.docx'];
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const MAX_FILES = 10;

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Validate file
  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    const fileName = file.name.toLowerCase();
    const hasValidExtension = SUPPORTED_FORMATS.some((fmt) => fileName.endsWith(fmt));

    if (!hasValidExtension) {
      return {
        isValid: false,
        error: `지원하지 않는 형식입니다. (${SUPPORTED_FORMATS.join(', ')})`,
      };
    }

    if (file.size > MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `파일 크기가 너무 큽니다 (최대 50MB)`,
      };
    }

    return { isValid: true };
  };

  // Add files
  const addFiles = (newFiles: FileList) => {
    setError(null);

    if (files.length + newFiles.length > MAX_FILES) {
      setError(`최대 ${MAX_FILES}개의 파일만 업로드 가능합니다`);
      return;
    }

    const fileItems: FileItem[] = Array.from(newFiles).map((file) => {
      const validation = validateFile(file);
      return {
        file,
        id: `${file.name}-${Date.now()}`,
        size: formatFileSize(file.size),
        isValid: validation.isValid,
        error: validation.error,
      };
    });

    setFiles((prev) => [...prev, ...fileItems]);

    // Check if any file has error
    const hasError = fileItems.some((item) => !item.isValid);
    if (hasError) {
      setError('일부 파일에 오류가 있습니다. 아래를 확인하세요.');
    }
  };

  // Remove file
  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((item) => item.id !== id));
  };

  // Handle drag events
  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      addFiles(e.dataTransfer.files);
    }
  };

  // Handle file input change
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    const validFiles = files.filter((item) => item.isValid).map((item) => item.file);

    if (validFiles.length === 0) {
      setError('유효한 파일을 선택해주세요');
      return;
    }

    try {
      setError(null);
      await onSubmit(validFiles);
      setFiles([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : '파일 업로드 실패';
      setError(message);
    }
  };

  const validFileCount = files.filter((item) => item.isValid).length;
  const totalSize = files.reduce((sum, item) => sum + item.file.size, 0);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-lg font-semibold text-gray-900 mb-2">📂 파일 선택</label>
        <p className="text-sm text-gray-600">분석할 파일들을 선택하세요 (최대 {MAX_FILES}개)</p>
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? 'border-ai-500 bg-ai-50' : 'border-gray-300 bg-gray-50'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-ai-400'}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={SUPPORTED_FORMATS.join(',')}
          onChange={handleChange}
          disabled={isLoading}
          className="hidden"
        />

        <div className="space-y-3">
          <div className="text-4xl">📄</div>
          <div>
            <p className="text-gray-900 font-semibold">파일을 드래그하여 놓으세요</p>
            <p className="text-gray-600 text-sm mt-1">또는 클릭하여 파일을 선택하세요</p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="btn-primary mt-4 inline-block disabled:opacity-50 disabled:cursor-not-allowed"
          >
            파일 선택
          </button>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">선택된 파일 ({validFileCount}/{files.length})</h3>
            {files.length > 0 && (
              <button
                type="button"
                onClick={() => setFiles([])}
                disabled={isLoading}
                className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                모두 제거
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {files.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  item.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-lg">
                    {item.file.name.endsWith('.pdf')
                      ? '📕'
                      : item.file.name.endsWith('.docx')
                        ? '📗'
                        : '📄'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.file.name}</p>
                    <p className="text-xs text-gray-600">{item.size}</p>
                    {item.error && <p className="text-xs text-red-600 mt-1">⚠️ {item.error}</p>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(item.id)}
                  disabled={isLoading}
                  className="ml-3 text-gray-400 hover:text-red-600 disabled:opacity-50 transition-colors"
                  title="제거"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {files.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-blue-600 font-medium">선택된 파일</p>
              <p className="text-lg font-bold text-blue-900">{validFileCount}</p>
            </div>
            <div>
              <p className="text-blue-600 font-medium">총 크기</p>
              <p className="text-lg font-bold text-blue-900">{formatFileSize(totalSize)}</p>
            </div>
            <div>
              <p className="text-blue-600 font-medium">예상 시간</p>
              <p className="text-lg font-bold text-blue-900">~{validFileCount * 2}초</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-3">
          <span className="text-lg">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Upload Button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isLoading || validFileCount === 0}
        className="btn-primary w-full py-3 text-lg font-semibold disabled:opacity-50"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block animate-spin">⟳</span>
            업로드 중...
          </span>
        ) : (
          `분석 시작 (${validFileCount}개 파일)`
        )}
      </button>

      {/* Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
        <p className="font-semibold mb-2">📋 지원 형식:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>.txt (텍스트 파일)</li>
          <li>.pdf (PDF 파일)</li>
          <li>.docx (Word 문서)</li>
          <li>최대 파일 크기: 50MB</li>
          <li>최대 파일 개수: {MAX_FILES}개</li>
        </ul>
      </div>
    </div>
  );
}
