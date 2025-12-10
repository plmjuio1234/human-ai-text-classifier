import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Stage = 'original' | 'split' | 'sampled';

export default function DataPage() {
  const [currentStage, setCurrentStage] = useState<Stage>('original');
  const [isAnimating, setIsAnimating] = useState(false);

  // 데이터 (PDF 기반)
  const stages = {
    original: {
      title: 'ORIGINAL DATASET',
      description: 'Train 데이터 원본 (Full Text 단위)',
      human: 89177,
      ai: 7995,
      total: 97172,
      ratio: '11:1',
    },
    split: {
      title: 'AFTER PARAGRAPH SPLIT',
      description: '문단 단위로 분할 후',
      human: 1125599,
      ai: 100710,
      total: 1226309,
      ratio: '11:1',
    },
    sampled: {
      title: 'AFTER UNDER-SAMPLING',
      description: '클래스 균형 맞춤',
      human: 100710,
      ai: 100710,
      total: 201420,
      ratio: '1:1',
    },
  };

  const data = stages[currentStage];
  const humanPercent = (data.human / data.total) * 100;
  const aiPercent = (data.ai / data.total) * 100;

  const nextStage = () => {
    if (currentStage === 'original') {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStage('split');
        setIsAnimating(false);
      }, 500);
    } else if (currentStage === 'split') {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStage('sampled');
        setIsAnimating(false);
      }, 500);
    }
  };

  const prevStage = () => {
    if (currentStage === 'sampled') {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStage('split');
        setIsAnimating(false);
      }, 500);
    } else if (currentStage === 'split') {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStage('original');
        setIsAnimating(false);
      }, 500);
    }
  };

  const reset = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStage('original');
      setIsAnimating(false);
    }, 500);
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <style>{`
        @keyframes scaleIn {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes barGrow {
          from {
            width: 0%;
          }
        }

        .scale-in {
          animation: scaleIn 0.5s ease-out;
        }

        .bar-grow {
          animation: barGrow 1s ease-out;
        }

        .stage-indicator {
          position: relative;
          width: 100%;
          height: 4px;
          background: hsl(220, 20%, 25%);
          border-radius: 2px;
        }

        .stage-indicator-progress {
          height: 100%;
          background: linear-gradient(90deg, hsl(174, 72%, 56%), hsl(280, 80%, 60%));
          border-radius: 2px;
          transition: width 0.5s ease-out;
        }
      `}</style>

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold font-display mb-4">
            <span className="text-[hsl(174,72%,56%)] text-glow">DATA</span> PREPROCESSING
          </h1>
          <p className="text-lg text-muted-foreground">
            원본 데이터에서 학습 가능한 데이터셋으로 변환하는 과정
          </p>
        </div>

        {/* Stage Indicator */}
        <div className="mb-12">
          <div className="flex justify-between mb-2">
            <span className={`text-sm font-display ${currentStage === 'original' ? 'text-[hsl(174,72%,56%)]' : 'text-muted-foreground'}`}>
              1. ORIGINAL
            </span>
            <span className={`text-sm font-display ${currentStage === 'split' ? 'text-[hsl(174,72%,56%)]' : 'text-muted-foreground'}`}>
              2. SPLIT
            </span>
            <span className={`text-sm font-display ${currentStage === 'sampled' ? 'text-[hsl(174,72%,56%)]' : 'text-muted-foreground'}`}>
              3. BALANCED
            </span>
          </div>
          <div className="stage-indicator">
            <div
              className="stage-indicator-progress"
              style={{
                width: currentStage === 'original' ? '33.33%' : currentStage === 'split' ? '66.67%' : '100%'
              }}
            ></div>
          </div>
        </div>

        {/* Main Visualization */}
        <Card className={`bg-card border-[hsl(174,72%,56%)] shadow-[0_0_30px_hsla(174,72%,56%,0.2)] mb-8 ${!isAnimating ? 'scale-in' : ''}`}>
          <CardHeader>
            <CardTitle className="font-display text-3xl text-center">
              {data.title}
            </CardTitle>
            <p className="text-center text-muted-foreground font-body">
              {data.description}
            </p>
          </CardHeader>
          <CardContent>
            {/* Ratio Display */}
            <div className="text-center mb-8">
              <div className="text-6xl font-bold font-display mb-2">
                <span className="text-[hsl(140,70%,50%)]">0</span>
                <span className="text-muted-foreground">:</span>
                <span className="text-[hsl(0,84%,60%)]">1</span>
                <span className="text-muted-foreground mx-4">=</span>
                <span className="text-[hsl(174,72%,56%)] text-glow">{data.ratio}</span>
              </div>
              <p className="text-sm text-muted-foreground font-display">
                Human (0) : AI (1) Ratio
              </p>
            </div>

            {/* Visual Bars */}
            <div className="space-y-6 mb-8">
              {/* Human Bar */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-display text-[hsl(140,70%,50%)]">
                    🟢 HUMAN (0)
                  </span>
                  <span className="text-sm font-display">
                    {data.human.toLocaleString()} ({humanPercent.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-12 bg-[hsl(220,25%,9%)] rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[hsl(140,70%,50%)] to-[hsl(140,70%,40%)] bar-grow flex items-center justify-end pr-4"
                    style={{ width: `${humanPercent}%` }}
                  >
                    <span className="text-sm font-bold font-display text-white">
                      {humanPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* AI Bar */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-display text-[hsl(0,84%,60%)]">
                    🔴 AI (1)
                  </span>
                  <span className="text-sm font-display">
                    {data.ai.toLocaleString()} ({aiPercent.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-12 bg-[hsl(220,25%,9%)] rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[hsl(0,84%,60%)] to-[hsl(0,84%,50%)] bar-grow flex items-center justify-end pr-4"
                    style={{ width: `${aiPercent}%` }}
                  >
                    <span className="text-sm font-bold font-display text-white">
                      {aiPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid md:grid-cols-3 gap-4 p-6 bg-[hsl(220,25%,9%)] rounded-lg">
              <div className="text-center">
                <div className="text-sm text-muted-foreground font-display mb-1">
                  TOTAL SAMPLES
                </div>
                <div className="text-2xl font-bold font-display text-[hsl(174,72%,56%)]">
                  {data.total.toLocaleString()}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground font-display mb-1">
                  IMBALANCE RATIO
                </div>
                <div className="text-2xl font-bold font-display">
                  {data.ratio}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground font-display mb-1">
                  STATUS
                </div>
                <div className={`text-xl font-bold font-display ${
                  currentStage === 'sampled'
                    ? 'text-[hsl(140,70%,50%)]'
                    : 'text-[hsl(45,100%,55%)]'
                }`}>
                  {currentStage === 'sampled' ? '✓ BALANCED' : '⚠ IMBALANCED'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Explanation Card */}
        <Card className="bg-card border-border mb-8">
          <CardContent className="p-6">
            {currentStage === 'original' && (
              <div>
                <h3 className="text-xl font-bold font-display mb-3 text-[hsl(174,72%,56%)]">
                  📊 원본 데이터셋 (Full Text)
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground font-body">
                  <li>• 위키피디아 전체 글 단위로 구성</li>
                  <li>• Human (0): 89,177개 / AI (1): 7,995개</li>
                  <li>• <span className="text-[hsl(45,100%,55%)]">심각한 클래스 불균형 (11:1)</span></li>
                  <li>• 이대로 학습 시 모델이 0번으로 편향됨 (AUC 0.7285)</li>
                </ul>
              </div>
            )}
            {currentStage === 'split' && (
              <div>
                <h3 className="text-xl font-bold font-display mb-3 text-[hsl(174,72%,56%)]">
                  ✂️ 문단 단위 분할
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground font-body">
                  <li>• Full Text를 빈 줄 기준으로 문단 단위 분할</li>
                  <li>• Human: 1,125,599개 / AI: 100,710개</li>
                  <li>• <span className="text-[hsl(45,100%,55%)]">여전히 11:1 불균형 유지</span></li>
                  <li>• 데이터 수는 증가했지만 비율은 동일</li>
                </ul>
              </div>
            )}
            {currentStage === 'sampled' && (
              <div>
                <h3 className="text-xl font-bold font-display mb-3 text-[hsl(140,70%,50%)]">
                  ⚖️ Under Sampling (클래스 균형)
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground font-body">
                  <li>• Human 데이터를 AI 데이터 수준으로 Down Sampling</li>
                  <li>• Human: 100,710개 / AI: 100,710개</li>
                  <li>• <span className="text-[hsl(140,70%,50%)]">완벽한 1:1 균형</span></li>
                  <li>• 이제 모델이 편향 없이 학습 가능!</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Controls */}
        <div className="flex gap-4 justify-center mb-16">
          <Button
            onClick={prevStage}
            disabled={currentStage === 'original'}
            variant="outline"
            className="font-display border-[hsl(174,72%,56%)] text-[hsl(174,72%,56%)] hover:bg-[hsl(174,72%,56%)]/10"
          >
            ← PREVIOUS
          </Button>
          <Button
            onClick={reset}
            variant="outline"
            className="font-display"
          >
            🔄 RESET
          </Button>
          <Button
            onClick={nextStage}
            disabled={currentStage === 'sampled'}
            className="font-display bg-[hsl(174,72%,56%)] hover:bg-[hsl(174,72%,46%)] text-[hsl(220,26%,6%)]"
          >
            NEXT →
          </Button>
        </div>

        {/* Divider */}
        <div className="border-t border-[hsl(174,72%,56%)]/30 my-16"></div>

        {/* Text Length Distribution */}
        <div className="mb-16">
          <h2 className="text-4xl font-bold font-display text-center mb-4">
            <span className="text-[hsl(174,72%,56%)] text-glow">TEXT LENGTH</span> DISTRIBUTION
          </h2>
          <p className="text-center text-muted-foreground mb-12">
            문단 분할 전후 텍스트 길이 분포 비교
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Full Text Length */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-display text-xl">
                  📄 Full Text 길이 분포
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Human */}
                  <div>
                    <div className="flex justify-between mb-2 text-sm">
                      <span className="font-display text-[hsl(140,70%,50%)]">Human (0)</span>
                      <span className="font-display text-muted-foreground">평균: 2,325.40자</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-16 text-xs text-muted-foreground">Min</div>
                        <div className="flex-1 h-6 bg-[hsl(220,25%,9%)] rounded overflow-hidden">
                          <div className="h-full bg-[hsl(140,70%,50%)]/30 bar-grow" style={{ width: '6%' }}></div>
                        </div>
                        <div className="w-16 text-xs text-right">624</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 text-xs text-muted-foreground">25%</div>
                        <div className="flex-1 h-6 bg-[hsl(220,25%,9%)] rounded overflow-hidden">
                          <div className="h-full bg-[hsl(140,70%,50%)]/50 bar-grow" style={{ width: '9%' }}></div>
                        </div>
                        <div className="w-16 text-xs text-right">926</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 text-xs text-muted-foreground">50%</div>
                        <div className="flex-1 h-6 bg-[hsl(220,25%,9%)] rounded overflow-hidden">
                          <div className="h-full bg-[hsl(140,70%,50%)]/70 bar-grow" style={{ width: '14%' }}></div>
                        </div>
                        <div className="w-16 text-xs text-right">1,331</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 text-xs text-muted-foreground">75%</div>
                        <div className="flex-1 h-6 bg-[hsl(220,25%,9%)] rounded overflow-hidden">
                          <div className="h-full bg-[hsl(140,70%,50%)] bar-grow" style={{ width: '24%' }}></div>
                        </div>
                        <div className="w-16 text-xs text-right">2,339</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 text-xs text-muted-foreground">Max</div>
                        <div className="flex-1 h-6 bg-[hsl(220,25%,9%)] rounded overflow-hidden">
                          <div className="h-full bg-[hsl(140,70%,50%)] bar-grow" style={{ width: '100%' }}></div>
                        </div>
                        <div className="w-16 text-xs text-right">98,549</div>
                      </div>
                    </div>
                  </div>

                  {/* AI */}
                  <div className="pt-4 border-t border-border/30">
                    <div className="flex justify-between mb-2 text-sm">
                      <span className="font-display text-[hsl(0,84%,60%)]">AI (1)</span>
                      <span className="font-display text-muted-foreground">평균: 2,298.66자</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-16 text-xs text-muted-foreground">Min</div>
                        <div className="flex-1 h-6 bg-[hsl(220,25%,9%)] rounded overflow-hidden">
                          <div className="h-full bg-[hsl(0,84%,60%)]/30 bar-grow" style={{ width: '4%' }}></div>
                        </div>
                        <div className="w-16 text-xs text-right">393</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 text-xs text-muted-foreground">25%</div>
                        <div className="flex-1 h-6 bg-[hsl(220,25%,9%)] rounded overflow-hidden">
                          <div className="h-full bg-[hsl(0,84%,60%)]/50 bar-grow" style={{ width: '9%' }}></div>
                        </div>
                        <div className="w-16 text-xs text-right">918</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 text-xs text-muted-foreground">50%</div>
                        <div className="flex-1 h-6 bg-[hsl(220,25%,9%)] rounded overflow-hidden">
                          <div className="h-full bg-[hsl(0,84%,60%)]/70 bar-grow" style={{ width: '13%' }}></div>
                        </div>
                        <div className="w-16 text-xs text-right">1,334</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 text-xs text-muted-foreground">75%</div>
                        <div className="flex-1 h-6 bg-[hsl(220,25%,9%)] rounded overflow-hidden">
                          <div className="h-full bg-[hsl(0,84%,60%)] bar-grow" style={{ width: '23%' }}></div>
                        </div>
                        <div className="w-16 text-xs text-right">2,301</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 text-xs text-muted-foreground">Max</div>
                        <div className="flex-1 h-6 bg-[hsl(220,25%,9%)] rounded overflow-hidden">
                          <div className="h-full bg-[hsl(0,84%,60%)] bar-grow" style={{ width: '47%' }}></div>
                        </div>
                        <div className="w-16 text-xs text-right">46,814</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Paragraph Length */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-display text-xl">
                  ✂️ Paragraph 길이 분포
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Human */}
                  <div>
                    <div className="flex justify-between mb-2 text-sm">
                      <span className="font-display text-[hsl(140,70%,50%)]">Human (0)</span>
                      <span className="font-display text-muted-foreground">평균: 179.6자</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-16 text-xs text-muted-foreground">Min</div>
                        <div className="flex-1 h-6 bg-[hsl(220,25%,9%)] rounded overflow-hidden">
                          <div className="h-full bg-[hsl(140,70%,50%)]/30 bar-grow" style={{ width: '0.3%' }}></div>
                        </div>
                        <div className="w-16 text-xs text-right">3</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 text-xs text-muted-foreground">25%</div>
                        <div className="flex-1 h-6 bg-[hsl(220,25%,9%)] rounded overflow-hidden">
                          <div className="h-full bg-[hsl(140,70%,50%)]/50 bar-grow" style={{ width: '7.5%' }}></div>
                        </div>
                        <div className="w-16 text-xs text-right">75</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 text-xs text-muted-foreground">50%</div>
                        <div className="flex-1 h-6 bg-[hsl(220,25%,9%)] rounded overflow-hidden">
                          <div className="h-full bg-[hsl(140,70%,50%)]/70 bar-grow" style={{ width: '14.6%' }}></div>
                        </div>
                        <div className="w-16 text-xs text-right">146</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 text-xs text-muted-foreground">75%</div>
                        <div className="flex-1 h-6 bg-[hsl(220,25%,9%)] rounded overflow-hidden">
                          <div className="h-full bg-[hsl(140,70%,50%)] bar-grow" style={{ width: '24.3%' }}></div>
                        </div>
                        <div className="w-16 text-xs text-right">243</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 text-xs text-muted-foreground">Max</div>
                        <div className="flex-1 h-6 bg-[hsl(220,25%,9%)] rounded overflow-hidden">
                          <div className="h-full bg-[hsl(140,70%,50%)] bar-grow" style={{ width: '100%' }}></div>
                        </div>
                        <div className="w-16 text-xs text-right">19,114</div>
                      </div>
                    </div>
                  </div>

                  {/* AI */}
                  <div className="pt-4 border-t border-border/30">
                    <div className="flex justify-between mb-2 text-sm">
                      <span className="font-display text-[hsl(0,84%,60%)]">AI (1)</span>
                      <span className="font-display text-muted-foreground">평균: 180.4자</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-16 text-xs text-muted-foreground">Min</div>
                        <div className="flex-1 h-6 bg-[hsl(220,25%,9%)] rounded overflow-hidden">
                          <div className="h-full bg-[hsl(0,84%,60%)]/30 bar-grow" style={{ width: '0.7%' }}></div>
                        </div>
                        <div className="w-16 text-xs text-right">7</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 text-xs text-muted-foreground">25%</div>
                        <div className="flex-1 h-6 bg-[hsl(220,25%,9%)] rounded overflow-hidden">
                          <div className="h-full bg-[hsl(0,84%,60%)]/50 bar-grow" style={{ width: '8.4%' }}></div>
                        </div>
                        <div className="w-16 text-xs text-right">84</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 text-xs text-muted-foreground">50%</div>
                        <div className="flex-1 h-6 bg-[hsl(220,25%,9%)] rounded overflow-hidden">
                          <div className="h-full bg-[hsl(0,84%,60%)]/70 bar-grow" style={{ width: '15%' }}></div>
                        </div>
                        <div className="w-16 text-xs text-right">150</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 text-xs text-muted-foreground">75%</div>
                        <div className="flex-1 h-6 bg-[hsl(220,25%,9%)] rounded overflow-hidden">
                          <div className="h-full bg-[hsl(0,84%,60%)] bar-grow" style={{ width: '24.1%' }}></div>
                        </div>
                        <div className="w-16 text-xs text-right">241</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 text-xs text-muted-foreground">Max</div>
                        <div className="flex-1 h-6 bg-[hsl(220,25%,9%)] rounded overflow-hidden">
                          <div className="h-full bg-[hsl(0,84%,60%)] bar-grow" style={{ width: '40%' }}></div>
                        </div>
                        <div className="w-16 text-xs text-right">4,001</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card border-[hsl(174,72%,56%)] shadow-[0_0_20px_hsla(174,72%,56%,0.2)] mt-8">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="text-4xl">💡</div>
                <div>
                  <h3 className="text-lg font-bold font-display mb-1 text-[hsl(174,72%,56%)]">
                    Key Insight
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    문단 분할 후 평균 길이가 <strong>2,325.40자 → 179.6자</strong>로 감소하여
                    모델이 더 효율적으로 학습할 수 있습니다. Human과 AI의 길이 분포가 유사하여
                    텍스트 길이만으로는 판별이 어려움을 확인할 수 있습니다.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Divider */}
        <div className="border-t border-[hsl(174,72%,56%)]/30 my-16"></div>

        {/* Noise Robustness */}
        <div className="mb-16">
          <h2 className="text-4xl font-bold font-display text-center mb-4">
            <span className="text-[hsl(174,72%,56%)] text-glow">NOISE</span> ROBUSTNESS
          </h2>
          <p className="text-center text-muted-foreground mb-12">
            Transformer의 노이즈 내성 검증 (BERT 기반 실험)
          </p>

          <Card className="bg-card border-border max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="font-display text-2xl">
                🛡️ 노이즈 레벨별 성능 변화
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                IMDB 데이터셋, single-flip 노이즈 (ACL Insights 2022)
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Clean Data */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-display">
                      <span className="text-[hsl(140,70%,50%)]">●</span> Clean Data (0% noise)
                    </span>
                    <span className="text-sm font-display font-bold text-[hsl(140,70%,50%)]">
                      96.5%
                    </span>
                  </div>
                  <div className="h-10 bg-[hsl(220,25%,9%)] rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[hsl(140,70%,50%)] to-[hsl(140,70%,40%)] bar-grow flex items-center justify-end pr-4"
                      style={{ width: '96.5%' }}
                    >
                      <span className="text-sm font-bold text-white">96.5%</span>
                    </div>
                  </div>
                </div>

                {/* 20% Noise */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-display">
                      <span className="text-[hsl(45,100%,55%)]">●</span> 20% Noise
                    </span>
                    <span className="text-sm font-display font-bold text-[hsl(45,100%,55%)]">
                      94.8%
                    </span>
                  </div>
                  <div className="h-10 bg-[hsl(220,25%,9%)] rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[hsl(45,100%,55%)] to-[hsl(45,100%,45%)] bar-grow flex items-center justify-end pr-4"
                      style={{ width: '94.8%' }}
                    >
                      <span className="text-sm font-bold text-[hsl(220,26%,6%)]">94.8%</span>
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    ⚠ -1.7%p 감소
                  </div>
                </div>

                {/* 40% Noise */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-display">
                      <span className="text-[hsl(0,84%,60%)]">●</span> 40% Noise
                    </span>
                    <span className="text-sm font-display font-bold text-[hsl(0,84%,60%)]">
                      92.3%
                    </span>
                  </div>
                  <div className="h-10 bg-[hsl(220,25%,9%)] rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[hsl(0,84%,60%)] to-[hsl(0,84%,50%)] bar-grow flex items-center justify-end pr-4"
                      style={{ width: '92.3%' }}
                    >
                      <span className="text-sm font-bold text-white">92.3%</span>
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    ⚠ -4.2%p 감소 (Clean 대비)
                  </div>
                </div>
              </div>

              <div className="mt-8 p-4 bg-[hsl(220,25%,9%)] rounded-lg">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-xs text-muted-foreground font-display mb-2">
                      MAXIMUM NOISE TESTED
                    </div>
                    <div className="text-3xl font-bold font-display text-[hsl(0,84%,60%)]">
                      40%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-display mb-2">
                      PERFORMANCE DROP
                    </div>
                    <div className="text-3xl font-bold font-display text-[hsl(45,100%,55%)]">
                      &lt; 4%p
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-[hsl(174,72%,56%)] shadow-[0_0_20px_hsla(174,72%,56%,0.2)] mt-8 max-w-4xl mx-auto">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="text-4xl">💪</div>
                <div>
                  <h3 className="text-lg font-bold font-display mb-1 text-[hsl(174,72%,56%)]">
                    Key Insight
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Transformer 모델은 <strong>40% 노이즈</strong>에서도 성능 저하가 <strong>4%p 이내</strong>로
                    매우 강건합니다. 우리 대회 데이터(문단 라벨 부재)도 노이즈로 간주할 수 있지만,
                    복잡한 노이즈 교정 기법 없이도 충분한 성능을 기대할 수 있습니다.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
