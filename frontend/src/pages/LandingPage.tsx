import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      {/* Animated grid background */}
      <div className="fixed inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(hsla(174, 72%, 56%, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, hsla(174, 72%, 56%, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }} />
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 py-20">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[hsl(174,72%,56%)] rounded-full blur-[150px] opacity-20 animate-pulse" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-[hsl(280,80%,60%)] rounded-full blur-[150px] opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <div className="mb-6 inline-block">
            <span className="px-4 py-2 rounded-full bg-[hsl(174,72%,56%)]/10 border border-[hsl(174,72%,56%)]/30 text-[hsl(174,72%,56%)] text-sm font-display">
              [ KANANA-1.5-8B | AUC 94.46% ]
            </span>
          </div>

          <h1 className="text-7xl md:text-8xl font-bold mb-6 font-display leading-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(174,72%,56%)] via-[hsl(200,72%,56%)] to-[hsl(280,80%,60%)]">
              AI TEXT
            </span>
            <br />
            <span className="text-glow">DETECTOR</span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-4xl mx-auto font-light leading-relaxed break-keep">
            실시간 문단 분석으로 논문, 과제, 에세이의 AI 생성 여부를 정밀하게 판별합니다.
            <br />
            <span className="text-[hsl(174,72%,56%)]">입력한 텍스트에 직접 하이라이팅</span>되어 의심 구간을 즉시 확인하세요.
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              asChild
              size="lg"
              className="text-lg px-8 py-7 bg-[hsl(174,72%,56%)] hover:bg-[hsl(174,72%,46%)] text-[hsl(220,26%,6%)] font-display font-bold shadow-[0_0_30px_hsla(174,72%,56%,0.5)] hover:shadow-[0_0_40px_hsla(174,72%,56%,0.7)] transition-all"
            >
              <Link to="/analyze">START ANALYSIS →</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="text-lg px-8 py-7 border-2 border-[hsl(174,72%,56%)] text-[hsl(174,72%,56%)] hover:bg-[hsl(174,72%,56%)]/10 font-display font-bold"
            >
              <Link to="/analyze">VIEW DEMO</Link>
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-4xl mx-auto">
            {[
              { value: '94.46%', label: 'ACCURACY' },
              { value: '8B', label: 'PARAMETERS' },
              { value: '<2s', label: 'ANALYSIS' },
              { value: '∞', label: 'PARAGRAPHS' },
            ].map((stat, i) => (
              <div
                key={i}
                className="p-6 rounded-xl bg-card border border-border backdrop-blur-sm hover:border-[hsl(174,72%,56%)] transition-colors group"
              >
                <div className="text-4xl font-bold font-display text-[hsl(174,72%,56%)] mb-2 group-hover:text-glow transition-all">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground font-display tracking-wider">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl font-bold text-center mb-4 font-display">
            ANALYSIS <span className="text-[hsl(174,72%,56%)]">FEATURES</span>
          </h2>
          <p className="text-center text-muted-foreground mb-16 text-lg">
            고급 AI 모델 기반의 정밀한 텍스트 분석 시스템
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: '🎯',
                title: 'PARAGRAPH ANALYSIS',
                desc: '문단 단위로 세밀하게 분석하여 각 구간의 AI 생성 확률을 측정합니다',
              },
              {
                icon: '🔍',
                title: 'LIVE HIGHLIGHTING',
                desc: '입력 텍스트에 직접 형광펜 효과로 하이라이팅하여 의심 구간을 시각화합니다',
              },
              {
                icon: '⚡',
                title: 'BATCH PROCESSING',
                desc: 'GPU 가속 배치 처리로 여러 문단을 동시에 빠르게 분석합니다',
              },
              {
                icon: '📊',
                title: 'PROBABILITY METRICS',
                desc: '각 문단의 AI 확률(0-100%)과 전체 평균 확률을 제공합니다',
              },
              {
                icon: '🎨',
                title: 'COLOR CODING',
                desc: '확률에 따라 빨강(높음), 노랑(중간), 초록(낮음)으로 구분합니다',
              },
              {
                icon: '🚀',
                title: 'REAL-TIME RESULTS',
                desc: '분석 완료 즉시 결과를 확인할 수 있는 반응형 인터페이스',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group p-8 rounded-2xl bg-card border border-border hover:border-[hsl(174,72%,56%)] hover:shadow-[0_0_30px_hsla(174,72%,56%,0.2)] transition-all duration-300"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-3 font-display text-[hsl(174,72%,56%)] group-hover:text-glow transition-all">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="relative py-32 px-4 bg-[hsl(220,25%,9%)]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl font-bold text-center mb-16 font-display">
            USE <span className="text-[hsl(280,80%,60%)]">CASES</span>
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: '📄 학술 논문',
                items: ['연구 논문 검증', '참고문헌 확인', '학술지 심사'],
              },
              {
                title: '✍️ 학생 과제',
                items: ['리포트 진위 확인', '에세이 검사', '제출물 심사'],
              },
              {
                title: '📰 뉴스 기사',
                items: ['기사 진위 판별', '출처 검증', '콘텐츠 분석'],
              },
              {
                title: '📝 일반 텍스트',
                items: ['블로그 글 검증', 'SNS 콘텐츠', '온라인 리뷰'],
              },
            ].map((useCase, i) => (
              <div
                key={i}
                className="p-8 rounded-2xl bg-card border border-border hover:border-[hsl(280,80%,60%)] transition-all"
              >
                <h3 className="text-2xl font-bold mb-4 font-display">
                  {useCase.title}
                </h3>
                <ul className="space-y-3">
                  {useCase.items.map((item, j) => (
                    <li key={j} className="flex items-center gap-3">
                      <span className="text-[hsl(280,80%,60%)]">▸</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-bold mb-6 font-display">
            READY TO <span className="text-[hsl(174,72%,56%)] text-glow">ANALYZE</span>?
          </h2>
          <p className="text-xl text-muted-foreground mb-12">
            지금 바로 텍스트 분석을 시작하세요. 회원가입 불필요.
          </p>
          <Button
            asChild
            size="lg"
            className="text-xl px-12 py-8 bg-gradient-to-r from-[hsl(174,72%,56%)] to-[hsl(280,80%,60%)] hover:from-[hsl(174,72%,46%)] hover:to-[hsl(280,80%,50%)] text-[hsl(220,26%,6%)] font-display font-bold shadow-[0_0_40px_hsla(174,72%,56%,0.5)] hover:shadow-[0_0_60px_hsla(174,72%,56%,0.7)] transition-all"
          >
            <Link to="/analyze">LAUNCH ANALYZER →</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
