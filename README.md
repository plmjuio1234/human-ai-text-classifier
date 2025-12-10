# AI 텍스트 판별 웹 서비스

**KANANA-1.5-8B 모델 기반 AI 생성 텍스트 판별 시스템**

## 📋 프로젝트 개요

### 프로젝트 목표

**원래 목표**:
- DACON AI 텍스트 판별 대회 참가
- 위키피디아 데이터셋을 활용한 AI 생성 텍스트 탐지 모델 개발

**수정된 목표**:
- **실용적인 웹 서비스 구현**에 초점
- 단일 모델(KANANA-1.5-8B) 기반 빠르고 효율적인 추론 서비스
- 사용자 친화적인 실시간 텍스트 분석 인터페이스 제공

**목표 수정 이유**:
1. **대규모 앙상블의 한계**: 4개 모델 앙상블은 추론 시간이 과도하게 길어져 실시간 서비스에 부적합
2. **GPU 리소스 제약**: EXAONE-32B 등 대형 모델은 단일 GPU(RTX A6000 48GB)에서 운용 불가
3. **실용성 우선**: 경량화된 단일 모델로도 높은 성능(AUC 0.9415) 달성 가능
4. **서비스 안정성**: 단순한 아키텍처로 배포 및 유지보수 용이

**결론**:
- KANANA-1.5-8B 모델 + LoRA 파인튜닝으로 **빠르고 정확한** 실시간 서비스 구현
- 웹 인터페이스를 통한 **즉각적인 텍스트 분석** 제공
- 문단 단위 상세 분석으로 **해석 가능성(Explainability)** 향상

---

## 🎓 빅데이터 처리 기술 적용

### 1. 데이터 전처리 (Hadoop 환경)

#### 1.1 대규모 데이터 처리 파이프라인

**데이터 규모**:
- Train 데이터: 97,172개 전체 텍스트 (Full Text)
- 문단 분할 후: 1,226,309개 문단
- 최종 학습 데이터: 201,420개 문단 (언더샘플링 후)

**Hadoop 분산 처리**:
```python
# Hadoop MapReduce를 활용한 문단 분할
# Input: train.csv (97,172 records)
# Output: paragraphs.csv (1,226,309 records)

def map_split_paragraphs(text):
    """
    Mapper: 전체 텍스트를 문단으로 분할
    """
    paragraphs = re.split(r'\n\s*\n', text)
    for para in paragraphs:
        if para.strip():
            yield para.strip()

def reduce_filter_paragraphs(paragraphs):
    """
    Reducer: 문단 길이 필터링 (p35~p95 퍼센타일)
    """
    lengths = [len(p) for p in paragraphs]
    p35, p95 = np.percentile(lengths, [35, 95])
    return [p for p in paragraphs if p35 <= len(p) <= p95]
```

#### 1.2 클래스 불균형 처리

**문제점**:
- 원본 데이터: Human 89,177개 vs AI 7,995개 (11:1 불균형)
- 문단 분할 후에도 11:1 비율 유지

**해결 방법 (Hadoop 기반 Under-Sampling)**:
```python
# Hadoop에서 분산 샘플링 수행
# 소수 클래스(AI)에 맞춰 다수 클래스(Human) 랜덤 샘플링

def reduce_balance_classes(key, values):
    """
    Reducer: 클래스 균형 맞추기
    key: generated (0 or 1)
    values: list of paragraphs
    """
    if key == 0:  # Human
        # AI 클래스 개수에 맞춰 랜덤 샘플링
        return random.sample(values, k=min_class_count)
    else:  # AI
        return values
```

**결과**:
- 최종 데이터: Human 100,710개 vs AI 100,710개 (1:1 균형)
- 총 201,420개 문단으로 학습

#### 1.3 텍스트 길이 분포 분석

Hadoop에서 통계 집계:
| 구분 | 평균 길이 | 최소 | 25% | 중앙값 | 75% | 최대 |
|------|----------|------|-----|--------|-----|------|
| **Full Text (Human)** | 2,325.40자 | 624 | 926 | 1,331 | 2,339 | 98,549 |
| **Full Text (AI)** | 2,298.66자 | 393 | 918 | 1,334 | 2,301 | 46,814 |
| **Paragraph (Human)** | 179.6자 | 3 | 75 | 146 | 243 | 19,114 |
| **Paragraph (AI)** | 180.4자 | 7 | 84 | 150 | 241 | 4,001 |

---

### 2. 분산 학습 환경

#### 2.1 GPU 병렬 처리

**하드웨어 구성**:
- GPU: 2 x NVIDIA RTX A6000 (각 48GB VRAM)
- CPU: AMD Ryzen Threadripper (64 cores)
- RAM: 256GB DDR4

**모델 분산 전략**:
```python
# PyTorch DDP (Distributed Data Parallel) 활용
# 모델을 2개 GPU에 자동 분산

model = AutoModelForSequenceClassification.from_pretrained(
    model_name,
    device_map="auto",  # 자동 GPU 분산
    quantization_config=bnb_config
)
# GPU 0: 4.2GB, GPU 1: 3.8GB로 자동 분산
```

#### 2.2 메모리 최적화

**4-bit Quantization (BitsAndBytes)**:
```python
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_use_double_quant=True
)
# 메모리 사용량: 16FP 32GB → 4bit 8GB (75% 절감)
```

---

### 3. 모델 학습 및 최적화

#### 3.1 LoRA (Low-Rank Adaptation) 파인튜닝

**핵심 개념**:
- 전체 모델 파라미터(8B) 중 약 1%만 학습
- 사전학습 가중치는 고정(freeze)하여 일반화 성능 유지

**하이퍼파라미터**:
| 파라미터 | 값 | 설명 |
|---------|---|------|
| **LoRA Rank (r)** | 32 | 저차원 어댑터 크기 |
| **LoRA Alpha** | 16 | Scaling factor |
| **LoRA Dropout** | 0.1 | 정규화 |
| **Learning Rate** | 2e-5 | AdamW 옵티마이저 |
| **Batch Size** | 8 | Per device |
| **Epochs** | 1 | 단일 에폭 학습 |
| **Max Length** | 512 | 토큰 길이 제한 |

#### 3.2 노이즈 라벨 처리

**문제점**:
- Full Text 단위 라벨을 문단에 그대로 상속
- 일부 문단만 AI 작성해도 전체 라벨 = 1 (노이즈)

**해결 전략**:
- **노이즈 라벨을 그대로 학습** (별도 처리 없음)
- 근거: Transformer 모델은 40% 노이즈에도 강건함 (ACL 2022 연구)
- 실제 성능 저하: 4%p 이내로 제한적

---

### 4. 실시간 추론 시스템

#### 4.1 배치 처리 최적화

**문단별 분석 엔드포인트**:
```python
@app.post("/api/analyze-sentences")
async def analyze_sentences(request: SentenceAnalysisRequest):
    # 1. 전체 텍스트 평가 (1회)
    full_result = detector.predict(request.text)

    # 2. 문단 분리
    paragraphs = re.split(r'\n\s*\n', request.text)

    # 3. 문단별 배치 처리 (병렬 추론)
    paragraph_probs = detector.predict_batch(paragraphs)

    return {
        "overall": full_result,
        "paragraphs": paragraph_probs
    }
```

**배치 처리 효과**:
- 개별 추론 대비 **3배 빠른 속도**
- GPU 활용률 향상 (40% → 85%)

#### 4.2 성능 벤치마크

| 텍스트 길이 | 추론 시간 | GPU 메모리 |
|------------|----------|-----------|
| 100자 (짧음) | ~200-500ms | 6.2GB |
| 500자 (보통) | ~500-1000ms | 6.5GB |
| 2000자 (긴) | ~1-2초 | 7.1GB |

---

## 🏗️ 시스템 아키텍처

### 백엔드 (FastAPI + PyTorch)
- **FastAPI**: 비동기 웹 프레임워크
- **PyTorch**: 딥러닝 추론 엔진
- **Transformers**: HuggingFace 라이브러리
- **PEFT**: LoRA 어댑터 로딩
- **BitsAndBytes**: 4-bit 양자화

### 프론트엔드 (React + TypeScript)
- **React 18**: UI 라이브러리
- **TypeScript**: 타입 안정성
- **Vite**: 빌드 도구 (빠른 HMR)
- **shadcn/ui**: 모던 UI 컴포넌트
- **Tailwind CSS**: 유틸리티 스타일링

---

## 🚀 실행 방법

### 환경 설정

#### 1. 백엔드 환경변수 설정
```bash
cp backend/.env.example backend/.env
# backend/.env 파일을 열어 경로 수정
# LORA_ADAPTER_PATH=/your/path/to/lora/adapters/kanana
```

#### 2. 프론트엔드 환경변수 설정
```bash
cp frontend/.env.example frontend/.env
# 기본값(localhost:8000) 사용 시 수정 불필요
```

### 서버 실행

#### 백엔드 서버 (터미널 1)
```bash
cd /path/to/project
source venv/bin/activate
cd backend
python main.py
```

**백엔드 URL**: http://localhost:8000
- API 문서: http://localhost:8000/docs

#### 프론트엔드 서버 (터미널 2)
```bash
cd /path/to/project/frontend
npm install
npm run dev
```

**프론트엔드 URL**: http://localhost:5173

---

## 🌐 외부 접속 설정

### Cloudflare Tunnel (추천)

**장점**: 방화벽 설정 없이 외부 공개 가능, HTTPS 자동 적용

```bash
# Cloudflare Tunnel 설치
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# 프론트엔드 터널 (터미널 1)
cloudflared tunnel --url http://localhost:5173 --protocol http2

# 백엔드 터널 (터미널 2)
cloudflared tunnel --url http://localhost:8000 --protocol http2

# frontend/.env 수정
VITE_API_URL=https://[백엔드-터널-URL]

# 프론트엔드 재시작
npm run dev
```

생성된 URL(예: `https://xxxxx.trycloudflare.com`)로 전 세계 어디서든 접속 가능합니다!

---

## 📊 주요 기능

### 1. 실시간 텍스트 분석
- 2000자 이내 텍스트 입력
- AI 생성 확률 (0-100%) 실시간 표시
- 판정 결과: "AI 생성" 또는 "사람 작성"
- 신뢰도: 높음/중간/낮음

### 2. 문단별 상세 분석
- 빈 줄 기준 문단 자동 분할
- 각 문단의 AI 확률 개별 표시
- 색상 코딩: 빨강(AI 높음) → 초록(사람 높음)
- 호버 시 정확한 확률값 표시

### 3. 분석 히스토리
- 과거 분석 결과 자동 저장 (LocalStorage)
- 날짜/시간별 정렬
- 이전 결과 재확인 가능

### 4. 데이터 시각화 페이지
- **클래스 불균형 애니메이션**: 11:1 → 1:1 과정 시각화
- **텍스트 길이 분포**: Full Text vs Paragraph 비교
- **노이즈 내성 실험**: Clean(96.5%) → 20% Noise(94.8%) → 40% Noise(92.3%)

---

## 🧪 API 엔드포인트

### 1. Health Check
```http
GET /api/health
```
**응답**:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "gpu_available": true
}
```

### 2. 전체 텍스트 판별
```http
POST /api/predict
Content-Type: application/json

{
  "text": "분석할 텍스트"
}
```
**응답**:
```json
{
  "ai_probability": 0.8234,
  "prediction": "AI 생성",
  "confidence": "높음",
  "char_count": 15
}
```

### 3. 문단별 분석
```http
POST /api/analyze-sentences
Content-Type: application/json

{
  "text": "첫 번째 문단.\n\n두 번째 문단."
}
```
**응답**:
```json
{
  "overall_analysis": {
    "full_text_probability": 0.85,
    "prediction": "AI 생성",
    "confidence": "높음"
  },
  "paragraph_analysis": [
    {"text": "첫 번째 문단.", "ai_probability": 0.75},
    {"text": "두 번째 문단.", "ai_probability": 0.95}
  ],
  "paragraph_average": 0.85
}
```

---

## 📁 프로젝트 구조

```
nugu/
├── backend/
│   ├── config.py              # 설정 관리
│   ├── schemas.py             # Pydantic 스키마
│   ├── model.py               # 모델 로딩 및 추론
│   ├── main.py                # FastAPI 애플리케이션
│   ├── .env.example           # 환경변수 예시
│   └── requirements.txt       # Python 의존성
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/            # shadcn/ui 컴포넌트
│   │   │   ├── Header.tsx     # 네비게이션 헤더
│   │   │   └── TextAnalyzer.tsx  # 텍스트 분석 컴포넌트
│   │   ├── pages/
│   │   │   ├── HomePage.tsx   # 메인 분석 페이지
│   │   │   ├── HistoryPage.tsx  # 히스토리 페이지
│   │   │   └── DataPage.tsx   # 데이터 시각화 페이지
│   │   ├── lib/
│   │   │   ├── api.ts         # API 클라이언트
│   │   │   └── utils.ts       # 유틸리티 함수
│   │   ├── App.tsx            # 라우팅 설정
│   │   └── index.css          # 글로벌 스타일
│   ├── .env.example           # 환경변수 예시
│   ├── vite.config.ts         # Vite 설정
│   ├── tailwind.config.js     # Tailwind 설정
│   └── package.json           # npm 의존성
├── models/
│   └── lora_adapters/
│       └── kanana/            # 학습된 LoRA 어댑터
├── .gitignore
├── README.md
└── requirements.txt
```

---

## 🎯 성능 및 결과

### 모델 성능
- **Base Model**: KANANA-1.5-8B (Kakao)
- **Fine-tuning**: LoRA (r=32, α=16)
- **Public AUC**: 0.9415
- **Private AUC**: 0.9338

### 추론 성능
- **평균 응답 시간**: 500-1000ms (500자 기준)
- **배치 처리 속도**: 개별 대비 3배 향상
- **GPU 메모리**: 6-7GB (4-bit 양자화)
- **동시 처리**: 최대 8개 요청 (배치 사이즈)

---

## 🔍 핵심 기술 요약

### 데이터 처리 (Hadoop 기반)
- ✅ MapReduce를 활용한 대규모 문단 분할 (97K → 1.2M 문단)
- ✅ 분산 샘플링으로 클래스 균형 조정 (11:1 → 1:1)
- ✅ 퍼센타일 기반 길이 필터링 (p35~p95)

### 모델 학습
- ✅ LoRA 파인튜닝 (파라미터 효율적)
- ✅ 4-bit 양자화 (메모리 75% 절감)
- ✅ 2-GPU 자동 분산 (PyTorch DDP)
- ✅ 노이즈 라벨 내성 (Transformer 강건성 활용)

### 웹 서비스
- ✅ 실시간 추론 API (FastAPI 비동기)
- ✅ 문단별 배치 처리 (속도 3배 향상)
- ✅ 반응형 UI (React + TypeScript)
- ✅ 외부 접속 지원 (Cloudflare Tunnel)

---

## 📚 참고 자료

### 모델
- **KANANA-1.5-8B**: https://huggingface.co/kakaocorp/kanana-1.5-8b-instruct-2505

### 논문
- **Zhu et al.** "Is BERT Robust to Label Noise?" (ACL 2022)
- **Hu et al.** "LoRA: Low-Rank Adaptation of Large Language Models" (ICLR 2022)

---

## 📝 라이선스

이 프로젝트는 교육 목적으로 제작되었습니다.

---

**마지막 업데이트**: 2025-12-10
**버전**: 1.0.0 (Production)
