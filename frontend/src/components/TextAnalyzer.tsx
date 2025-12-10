import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { predictText } from '@/lib/api';
import type { PredictResponse } from '@/lib/api';

export default function TextAnalyzer() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [error, setError] = useState('');
  const MAX_CHARS = 2000;

  const charCount = text.length;
  const isOverLimit = charCount > MAX_CHARS;

  const handleAnalyze = async () => {
    if (!text.trim()) {
      setError('텍스트를 입력해주세요');
      return;
    }

    if (isOverLimit) {
      setError(`최대 ${MAX_CHARS}자까지 입력 가능합니다`);
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await predictText(text);
      setResult(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || '분석 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case '높음': return 'bg-green-500';
      case '중간': return 'bg-yellow-500';
      case '낮음': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>AI 텍스트 판별 서비스</CardTitle>
          <CardDescription>
            텍스트를 입력하면 AI가 생성한 확률을 분석합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder="분석할 텍스트를 입력하세요..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              className="resize-none"
            />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {charCount} / {MAX_CHARS} 글자
              </span>
              {isOverLimit && (
                <span className="text-destructive">
                  {charCount - MAX_CHARS}자 초과
                </span>
              )}
            </div>
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={loading || isOverLimit}
            className="w-full"
          >
            {loading ? '분석 중...' : '분석하기'}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">분석 결과</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold">AI 생성 확률</span>
                    <span className="text-2xl font-bold">
                      {(result.ai_probability * 100).toFixed(2)}%
                    </span>
                  </div>
                  <Progress value={result.ai_probability * 100} />
                </div>

                <div className="flex justify-between items-center">
                  <span className="font-semibold">판정</span>
                  <Badge variant={result.prediction === 'AI 생성' ? 'destructive' : 'default'}>
                    {result.prediction}
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="font-semibold">신뢰도</span>
                  <Badge className={getConfidenceColor(result.confidence)}>
                    {result.confidence}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
