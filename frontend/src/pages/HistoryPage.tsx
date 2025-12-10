import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SentenceAnalysisResponse } from '@/lib/api';

interface HistoryItem {
  id: string;
  timestamp: number;
  text: string;
  result: SentenceAnalysisResponse;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const navigate = useNavigate();

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

  const clearHistory = () => {
    if (confirm('정말로 모든 히스토리를 삭제하시겠습니까?')) {
      setHistory([]);
      localStorage.removeItem('analysis_history');
    }
  };

  const viewResult = (item: HistoryItem) => {
    // 결과를 sessionStorage에 저장하고 analyze 페이지로 이동
    sessionStorage.setItem('view_result', JSON.stringify(item));
    navigate('/analyze');
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold font-display mb-4">
            <span className="text-[hsl(174,72%,56%)] text-glow">ANALYSIS</span> HISTORY
          </h1>
          <p className="text-lg text-muted-foreground">
            과거 분석 기록을 확인하고 다시 볼 수 있습니다
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mb-8">
          <Button
            onClick={() => navigate('/analyze')}
            variant="outline"
            className="font-display border-[hsl(174,72%,56%)] text-[hsl(174,72%,56%)] hover:bg-[hsl(174,72%,56%)]/10"
          >
            ← BACK TO ANALYZE
          </Button>

          {history.length > 0 && (
            <Button
              onClick={clearHistory}
              variant="outline"
              className="font-display border-[hsl(0,84%,60%)] text-[hsl(0,84%,60%)] hover:bg-[hsl(0,84%,60%)]/10"
            >
              🗑️ CLEAR ALL
            </Button>
          )}
        </div>

        {/* History List */}
        {history.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-16 text-center">
              <div className="text-6xl mb-4">📜</div>
              <p className="text-xl text-muted-foreground font-display mb-6">
                분석 기록이 없습니다
              </p>
              <Button
                onClick={() => navigate('/analyze')}
                className="bg-[hsl(174,72%,56%)] hover:bg-[hsl(174,72%,46%)] text-[hsl(220,26%,6%)] font-display"
              >
                첫 분석 시작하기 →
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {history.map((item) => (
              <Card
                key={item.id}
                className="bg-card border-border hover:border-[hsl(174,72%,56%)] transition-all cursor-pointer"
                onClick={() => viewResult(item)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="font-display text-xl mb-2 flex items-center gap-3">
                        <span className="text-[hsl(174,72%,56%)]">📄</span>
                        {new Date(item.timestamp).toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.text}
                      </p>
                    </div>

                    <div className="ml-6 text-right">
                      <div className="text-sm text-muted-foreground font-display mb-1">
                        AI PROBABILITY
                      </div>
                      <div className={`text-3xl font-bold font-display ${
                        item.result.overall_analysis.full_text_probability > 0.5
                          ? 'text-[hsl(0,84%,60%)]'
                          : 'text-[hsl(140,70%,50%)]'
                      }`}>
                        {(item.result.overall_analysis.full_text_probability * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-xs text-muted-foreground font-display mb-1">
                        VERDICT
                      </div>
                      <div className={`text-sm font-bold font-display ${
                        item.result.overall_analysis.prediction === 'AI 생성'
                          ? 'text-[hsl(0,84%,60%)]'
                          : 'text-[hsl(140,70%,50%)]'
                      }`}>
                        {item.result.overall_analysis.prediction === 'AI 생성' ? '⚠ AI GENERATED' : '✓ HUMAN WRITTEN'}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground font-display mb-1">
                        PARAGRAPHS
                      </div>
                      <div className="text-sm font-bold font-display">
                        {item.result.paragraph_analysis.length}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground font-display mb-1">
                        CONFIDENCE
                      </div>
                      <div className="text-sm font-bold font-display text-[hsl(174,72%,56%)]">
                        {item.result.overall_analysis.confidence === '높음' ? '🔥 HIGH' :
                         item.result.overall_analysis.confidence === '중간' ? '⚡ MEDIUM' : '💫 LOW'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border/30">
                    <Button
                      className="w-full bg-[hsl(174,72%,56%)] hover:bg-[hsl(174,72%,46%)] text-[hsl(220,26%,6%)] font-display"
                      onClick={(e) => {
                        e.stopPropagation();
                        viewResult(item);
                      }}
                    >
                      VIEW FULL RESULT →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
