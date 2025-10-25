/**
 * TextInput Component
 * Large textarea for text input with character counter and validation
 */

import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

interface TextInputProps {
  onSubmit: (text: string) => Promise<void>;
  isLoading?: boolean;
  maxCharacters?: number;
}

export default function TextInput({
  onSubmit,
  isLoading = false,
  maxCharacters = 5000,
}: TextInputProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    if (newText.length <= maxCharacters) {
      setText(newText);
      setError(null);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validation
    if (!text.trim()) {
      setError('텍스트를 입력해주세요');
      return;
    }

    if (text.length < 10) {
      setError('최소 10글자 이상 입력해주세요');
      return;
    }

    try {
      setError(null);
      await onSubmit(text);
    } catch (err) {
      const message = err instanceof Error ? err.message : '분석 중 오류가 발생했습니다';
      setError(message);
    }
  };

  const charCount = text.length;
  const percentage = (charCount / maxCharacters) * 100;
  const isNearLimit = percentage > 80;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label htmlFor="text-input" className="block text-lg font-semibold text-gray-900 mb-2">
          텍스트 입력
        </label>
        <p className="text-sm text-gray-600">
          분석할 텍스트를 입력하세요 (최소 10글자)
        </p>
      </div>

      {/* Textarea */}
      <textarea
        id="text-input"
        value={text}
        onChange={handleChange}
        disabled={isLoading}
        placeholder="여기에 텍스트를 붙여넣으세요... 또는 입력하세요"
        className="input-base w-full h-48 resize-none disabled:bg-gray-50 disabled:cursor-not-allowed"
      />

      {/* Character Count */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {charCount.toLocaleString()} / {maxCharacters.toLocaleString()} 글자
        </div>
        {percentage > 0 && (
          <div className="w-48">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  isNearLimit ? 'bg-red-500' : 'bg-ai-600'
                }`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-3">
          <span className="text-lg">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading || !text.trim() || text.length < 10}
        className="btn-primary w-full py-3 text-lg font-semibold disabled:opacity-50"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block animate-spin">⟳</span>
            분석 중...
          </span>
        ) : (
          '분석하기'
        )}
      </button>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
        <p className="font-semibold mb-1">💡 팁:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>최소 10글자 이상의 텍스트를 입력해주세요</li>
          <li>단락이나 여러 문장을 포함하면 더 정확한 분석이 됩니다</li>
          <li>분석에는 약 1-2초가 소요됩니다</li>
        </ul>
      </div>
    </form>
  );
}
