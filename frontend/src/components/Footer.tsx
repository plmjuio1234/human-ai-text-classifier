export default function Footer() {
  return (
    <footer className="border-t border-border bg-[hsl(220,25%,9%)] mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-[hsl(174,72%,56%)] to-[hsl(280,80%,60%)] rounded-lg flex items-center justify-center font-display font-bold text-xs text-[hsl(220,26%,6%)]">
                AI
              </div>
              <span className="text-lg font-bold font-display">
                DETECT<span className="text-[hsl(174,72%,56%)]">TEXT</span>
              </span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
              AI 생성 텍스트를 정밀하게 판별하는 전문 분석 서비스.
              <br />
              KANANA-1.5-8B 모델 기반 고성능 시스템.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 font-display text-sm tracking-wider">
              FEATURES
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="hover:text-[hsl(174,72%,56%)] transition-colors cursor-pointer">
                문단별 분석
              </li>
              <li className="hover:text-[hsl(174,72%,56%)] transition-colors cursor-pointer">
                실시간 하이라이팅
              </li>
              <li className="hover:text-[hsl(174,72%,56%)] transition-colors cursor-pointer">
                배치 처리
              </li>
              <li className="hover:text-[hsl(174,72%,56%)] transition-colors cursor-pointer">
                확률 측정
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 font-display text-sm tracking-wider">
              TECHNOLOGY
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <span className="text-[hsl(174,72%,56%)]">▸</span> KANANA-1.5-8B
              </li>
              <li>
                <span className="text-[hsl(174,72%,56%)]">▸</span> LoRA Fine-tuning
              </li>
              <li>
                <span className="text-[hsl(174,72%,56%)]">▸</span> GPU Acceleration
              </li>
              <li>
                <span className="text-[hsl(174,72%,56%)]">▸</span> 94.15% AUC
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground font-display">
            © 2025 DetectText. All rights reserved.
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <span className="hover:text-[hsl(174,72%,56%)] transition-colors cursor-pointer">
              Privacy
            </span>
            <span className="hover:text-[hsl(174,72%,56%)] transition-colors cursor-pointer">
              Terms
            </span>
            <span className="hover:text-[hsl(174,72%,56%)] transition-colors cursor-pointer">
              Contact
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
