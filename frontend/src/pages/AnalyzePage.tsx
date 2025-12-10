import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { analyzeSentences } from '@/lib/api';
import type { SentenceAnalysisResponse } from '@/lib/api';

interface HistoryItem {
  id: string;
  timestamp: number;
  text: string;
  result: SentenceAnalysisResponse;
}

export default function AnalyzePage() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SentenceAnalysisResponse | null>(null);
  const [error, setError] = useState('');
  const [animatedProb, setAnimatedProb] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const MAX_CHARS = 2000;

  // Load result from sessionStorage if coming from history page
  useEffect(() => {
    const viewResult = sessionStorage.getItem('view_result');
    if (viewResult) {
      try {
        const item: HistoryItem = JSON.parse(viewResult);
        setResult(item.result);
        sessionStorage.removeItem('view_result');
      } catch (e) {
        console.error('Failed to load result:', e);
      }
    }
  }, []);

  // Load history from LocalStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('analysis_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to load history:', e);
      }
    }
  }, []);

  // Animate probability countup
  useEffect(() => {
    if (result) {
      const targetProb = result.overall_analysis.full_text_probability;
      const duration = 1500; // 1.5초
      const steps = 60;
      const increment = targetProb / steps;
      let current = 0;
      let step = 0;

      const timer = setInterval(() => {
        step++;
        current = Math.min(current + increment, targetProb);
        setAnimatedProb(current);

        if (step >= steps || current >= targetProb) {
          clearInterval(timer);
          setAnimatedProb(targetProb);
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [result]);

  const charCount = text.length;
  const isOverLimit = charCount > MAX_CHARS;

  const saveToHistory = (text: string, result: SentenceAnalysisResponse) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      result,
    };

    const updatedHistory = [newItem, ...history].slice(0, 10); // Keep last 10
    setHistory(updatedHistory);
    localStorage.setItem('analysis_history', JSON.stringify(updatedHistory));
  };

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
      const data = await analyzeSentences(text);
      setResult(data);
      saveToHistory(text, data);
    } catch (err: any) {
      setError(err.response?.data?.detail || '분석 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const getHighlightClass = (probability: number) => {
    if (probability >= 0.8) return 'highlight-high';
    if (probability >= 0.5) return 'highlight-med';
    return 'highlight-low';
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 0.8) return 'text-[hsl(0,84%,60%)]';
    if (probability >= 0.5) return 'text-[hsl(45,100%,55%)]';
    return 'text-[hsl(140,70%,50%)]';
  };

  const getRiskLevel = (probability: number) => {
    if (probability >= 0.8) return { label: 'HIGH RISK', icon: '🔴', color: 'text-[hsl(0,84%,60%)]' };
    if (probability >= 0.5) return { label: 'MEDIUM RISK', icon: '🟡', color: 'text-[hsl(45,100%,55%)]' };
    return { label: 'LOW RISK', icon: '🟢', color: 'text-[hsl(140,70%,50%)]' };
  };

  const renderHighlightedText = () => {
    if (!result) return null;

    return (
      <div className="space-y-4 font-body text-lg leading-relaxed">
        {result.paragraph_analysis.map((para, index) => {
          const risk = getRiskLevel(para.ai_probability);
          const charCount = para.text.length;
          const wordCount = para.text.split(/\s+/).length;

          return (
            <div
              key={index}
              className={`p-4 rounded-lg ${getHighlightClass(para.ai_probability)} transition-all duration-300 hover:scale-[1.01]`}
              style={{
                animationDelay: `${index * 0.1}s`,
                animation: 'fadeIn 0.5s ease-out forwards',
              }}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-display">
                    [ PARAGRAPH {index + 1} ]
                  </span>
                  <span className={`text-xs font-bold font-display ${risk.color}`}>
                    {risk.icon} {risk.label}
                  </span>
                </div>
                <span className={`text-sm font-bold font-display ${getProbabilityColor(para.ai_probability)}`}>
                  {(para.ai_probability * 100).toFixed(1)}%
                </span>
              </div>

              {/* Text Content */}
              <p className="whitespace-pre-line leading-relaxed mb-3">{para.text}</p>

              {/* Stats Footer */}
              <div className="flex gap-4 text-xs text-muted-foreground font-display border-t border-border/30 pt-2">
                <span>📝 {charCount} chars</span>
                <span>💬 {wordCount} words</span>
                <span>
                  🎯 Confidence: {
                    para.ai_probability > 0.8 || para.ai_probability < 0.2 ? 'HIGH' :
                    para.ai_probability > 0.65 || para.ai_probability < 0.35 ? 'MEDIUM' : 'LOW'
                  }
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold font-display mb-4">
            <span className="text-[hsl(174,72%,56%)] text-glow">TEXT</span> ANALYZER
          </h1>
          <p className="text-lg text-muted-foreground">
            문단 단위로 AI 생성 확률을 분석하고 텍스트에 직접 하이라이팅합니다
          </p>
        </div>

        {!result ? (
          /* Input Mode */
          <Card className="bg-card border-border max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="font-display text-2xl flex items-center justify-between">
                <span>INPUT TEXT</span>
                <span className="text-sm text-muted-foreground font-normal">
                  {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Textarea
                placeholder="논문, 과제, 에세이를 입력하세요...

문단 구분은 빈 줄(Enter 두 번)로 하세요.

예시:
첫 번째 문단입니다. 이 문단은 여러 문장을 포함할 수 있습니다. 줄바꿈 한 번으로는 같은 문단으로 인식됩니다.

두 번째 문단입니다. 빈 줄을 넣으면 새로운 문단으로 분리됩니다."
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={16}
                className="resize-none bg-[hsl(220,20%,15%)] border-[hsl(220,20%,25%)] text-foreground placeholder:text-muted-foreground font-body text-base leading-relaxed focus:border-[hsl(174,72%,56%)] focus:ring-[hsl(174,72%,56%)] whitespace-pre-wrap"
              />

              {isOverLimit && (
                <Alert variant="destructive">
                  <AlertDescription className="font-display">
                    ⚠ {(charCount - MAX_CHARS).toLocaleString()}자 초과 - 텍스트를 줄여주세요
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription className="font-display">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleAnalyze}
                disabled={loading || isOverLimit || !text.trim()}
                size="lg"
                className="w-full text-lg py-7 bg-[hsl(174,72%,56%)] hover:bg-[hsl(174,72%,46%)] text-[hsl(220,26%,6%)] font-display font-bold shadow-[0_0_30px_hsla(174,72%,56%,0.3)] hover:shadow-[0_0_40px_hsla(174,72%,56%,0.5)] disabled:opacity-50 disabled:shadow-none transition-all relative overflow-hidden"
              >
                {loading && (
                  <div className="absolute inset-0 scan-line"></div>
                )}
                {loading ? (
                  <span className="flex items-center gap-3 relative z-10">
                    <span className="animate-spin">⚙</span>
                    ANALYZING...
                  </span>
                ) : (
                  'START ANALYSIS →'
                )}
              </Button>

              {/* Legend */}
              <div className="p-4 bg-[hsl(220,25%,9%)] rounded-lg border border-border">
                <div className="text-sm font-display text-muted-foreground mb-3">
                  COLOR LEGEND:
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[hsl(0,84%,60%)] rounded"></div>
                    <span>HIGH (80%+)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[hsl(45,100%,55%)] rounded"></div>
                    <span>MEDIUM (50-80%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[hsl(140,70%,50%)] rounded"></div>
                    <span>LOW (&lt;50%)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Result Mode */
          <div className="space-y-8">
            {/* Overall Analysis Card - 전체 텍스트 평가 */}
            <Card className="bg-card border-[hsl(174,72%,56%)] shadow-[0_0_30px_hsla(174,72%,56%,0.2)]">
              <CardHeader>
                <CardTitle className="font-display text-2xl flex items-center gap-3">
                  <span className="text-[hsl(174,72%,56%)]">⚡</span>
                  OVERALL TEXT ANALYSIS
                </CardTitle>
                <p className="text-sm text-muted-foreground font-body">
                  전체 텍스트를 한 번에 평가한 결과
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <div className="text-sm text-muted-foreground font-display mb-2">
                      FULL TEXT PROBABILITY
                    </div>
                    <div className="text-4xl font-bold font-display text-[hsl(174,72%,56%)] text-glow">
                      {(animatedProb * 100).toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground font-display mb-2">
                      VERDICT
                    </div>
                    <div className={`text-2xl font-bold font-display ${
                      result.overall_analysis.prediction === 'AI 생성'
                        ? 'text-[hsl(0,84%,60%)]'
                        : 'text-[hsl(140,70%,50%)]'
                    }`}>
                      {result.overall_analysis.prediction === 'AI 생성' ? '⚠ AI GENERATED' : '✓ HUMAN WRITTEN'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground font-display mb-2">
                      CONFIDENCE
                    </div>
                    <div className="text-2xl font-bold font-display text-[hsl(174,72%,56%)]">
                      {result.overall_analysis.confidence === '높음' ? '🔥 HIGH' :
                       result.overall_analysis.confidence === '중간' ? '⚡ MEDIUM' : '💫 LOW'}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <Progress
                    value={result.overall_analysis.full_text_probability * 100}
                    className="h-3"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Paragraph Analysis Summary Card - 문단별 평가 요약 */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-display text-2xl flex items-center gap-3">
                  <span className="text-[hsl(280,80%,60%)]">📊</span>
                  PARAGRAPH ANALYSIS SUMMARY
                </CardTitle>
                <p className="text-sm text-muted-foreground font-body">
                  문단별 평가 통계 (총 {result.paragraph_analysis.length}개 문단)
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <div className="text-sm text-muted-foreground font-display mb-2">
                      PARAGRAPH AVERAGE
                    </div>
                    <div className="text-4xl font-bold font-display">
                      {(result.paragraph_average * 100).toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground font-display mb-2">
                      TOTAL PARAGRAPHS
                    </div>
                    <div className="text-4xl font-bold font-display">
                      {result.paragraph_analysis.length}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground font-display mb-2">
                      DIFFERENCE
                    </div>
                    <div className={`text-2xl font-bold font-display ${
                      Math.abs(result.overall_analysis.full_text_probability - result.paragraph_average) > 0.1
                        ? 'text-[hsl(45,100%,55%)]'
                        : 'text-[hsl(140,70%,50%)]'
                    }`}>
                      {((result.overall_analysis.full_text_probability - result.paragraph_average) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Highlighted Text */}
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-display text-2xl">
                  HIGHLIGHTED TEXT
                </CardTitle>
                <Button
                  onClick={() => setResult(null)}
                  variant="outline"
                  className="font-display border-[hsl(174,72%,56%)] text-[hsl(174,72%,56%)] hover:bg-[hsl(174,72%,56%)]/10"
                >
                  ← NEW ANALYSIS
                </Button>
              </CardHeader>
              <CardContent>
                {renderHighlightedText()}
              </CardContent>
            </Card>

            {/* Paragraph Risk Stats */}
            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  label: 'HIGH RISK',
                  count: result.paragraph_analysis.filter(s => s.ai_probability >= 0.8).length,
                  color: 'text-[hsl(0,84%,60%)]',
                },
                {
                  label: 'MEDIUM RISK',
                  count: result.paragraph_analysis.filter(s => s.ai_probability >= 0.5 && s.ai_probability < 0.8).length,
                  color: 'text-[hsl(45,100%,55%)]',
                },
                {
                  label: 'LOW RISK',
                  count: result.paragraph_analysis.filter(s => s.ai_probability < 0.5).length,
                  color: 'text-[hsl(140,70%,50%)]',
                },
              ].map((stat, i) => (
                <Card key={i} className="bg-card border-border">
                  <CardContent className="p-6 text-center">
                    <div className={`text-4xl font-bold font-display mb-2 ${stat.color}`}>
                      {stat.count}
                    </div>
                    <div className="text-sm text-muted-foreground font-display">
                      {stat.label}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
