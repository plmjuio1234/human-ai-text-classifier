# AI vs Human Text Detection System

웹 기반 AI 텍스트 판별 시스템 | AI vs Human Text Detection Web Application

**프로젝트 개요**: 3개의 Fine-tuned LLM(Kanana 8B, Gemma 12B, Qwen3 14B)를 앙상블로 사용하여 주어진 텍스트가 AI가 생성한 것인지, 인간이 작성한 것인지를 판별하는 시스템입니다.

---

## 📋 목차
- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [시스템 요구사항](#시스템-요구사항)
- [설치 방법](#설치-방법)
- [실행 방법](#실행-방법)
- [API 문서](#api-문서)
- [사용 예제](#사용-예제)
- [프로젝트 구조](#프로젝트-구조)
- [주요 특징](#주요-특징)

---

## 🎯 주요 기능

### Phase 1: 단일 텍스트 분석 (Predict)
```
사용자가 텍스트를 입력 → 3개 모델 병렬 분석 → 앙상블 점수 계산 → AI/Human 판별
```
- ✅ 3-모델 앙상블 추론 (병렬 처리)
- ✅ AI 점수 (0-100) + 신뢰도 (0-1)
- ✅ 3개 모델별 점수 비교 가능
- ✅ 처리 시간: ~836ms

### Phase 2: 상세 분석 (Analyze)
```
텍스트 입력 → 문장별 분석 → 단어별 확률 계산 → 시각화
```
- ✅ 문장 레벨 AI 확률 분석
- ✅ 단어별 AI 생성 확률
- ✅ 전체 점수 및 신뢰도
- ✅ 상세한 분석 결과 제공

### Phase 3: 배치 파일 분석 (Batch)
```
여러 파일 선택 → 드래그앤드롭 업로드 → 실시간 진행률 모니터링 → CSV/Excel 다운로드
```
- ✅ TXT, PDF, DOCX 파일 지원
- ✅ 최대 10개 파일, 각 50MB
- ✅ 실시간 진행률 폴링 (1초 간격)
- ✅ 결과를 CSV/Excel로 내보내기
- ✅ 정렬 및 필터링 기능

### Phase 4: 실시간 모니터링 & 시스템 상태
```
실시간 타이핑 분석 + 신뢰도 변화 추이 + 백엔드 헬스 모니터링
```
- ✅ 타이핑하면서 실시간 분석 (500ms 디바운싱)
- ✅ 신뢰도 변화 시간 그래프 (Recharts)
- ✅ 백엔드 헬스 체크 + 모델 상태
- ✅ 시스템 정보 및 성능 지표

---

## 🛠️ 기술 스택

### 백엔드
```
FastAPI + Uvicorn              API 서버
PyTorch + Transformers         모델 추론
BitsAndBytes                   8-bit 양자화 (메모리 최적화)
python-docx + PyPDF2           파일 파싱
SQLAlchemy                     배치 상태 관리
```

### 프론트엔드
```
React 18 + TypeScript          UI 프레임워크
Vite                           번들러
TailwindCSS v3                 스타일링
React Query                    서버 상태 관리
Recharts                       데이터 시각화
Axios                          HTTP 클라이언트
```

### 모델 (Fine-tuned LLM)
```
Kanana 8B         HuggingFace Hub
Gemma 12B         HuggingFace Hub
Qwen3 14B         HuggingFace Hub
```

### 하드웨어
```
GPU: RTX A6000 × 2 (48GB × 2 = 96GB)
CPU: 충분한 CPU 코어
RAM: 최소 64GB
```

---

## 📦 시스템 요구사항

### 필수 사항
- **GPU**: NVIDIA RTX A6000 이상 (48GB 이상 VRAM)
- **CUDA**: CUDA 11.8 이상
- **Python**: 3.9+
- **Node.js**: 18+ (프론트엔드용)

### 선택 사항
- Docker & Docker Compose
- GPU 드라이버: 최신 버전 권장

### 디스크 공간
- 모델 가중치: ~40GB (3개 모델)
- 소스 코드 & 환경: ~10GB
- **총 필요 공간: 최소 60GB**

---

## 🚀 설치 방법

### 1단계: 저장소 클론 (2가지 방법)

#### 방법 1️⃣: 원본 프로젝트에서 클론 (읽기만 가능)
```bash
# 원본 저장소에서 직접 클론
git clone https://github.com/AI-IDLE/2025-digital-aigt-detection.git
cd 2025-digital-aigt-detection
```

#### 방법 2️⃣: 자신의 개인 저장소로 설정 (권장)
```bash
# 원본에서 먼저 클론
git clone https://github.com/AI-IDLE/2025-digital-aigt-detection.git
cd 2025-digital-aigt-detection

# 원본 저장소 제거
git remote remove origin

# 자신의 개인 저장소 주소로 설정 (GitHub에서 생성 후)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# 자신의 저장소로 push
git branch -M main
git push -u origin main
```

> **💡 팁**: GitHub에 새 저장소를 생성한 후 위의 YOUR_USERNAME과 YOUR_REPO를 자신의 정보로 변경하세요.

### 2단계: 백엔드 설정

#### Python 가상 환경 생성
```bash
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# 또는
venv\Scripts\activate  # Windows
```

#### 의존성 설치
```bash
pip install --upgrade pip
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
pip install -r requirements.txt
```

#### 모델 자동 다운로드
```bash
# 첫 실행 시 자동으로 HuggingFace Hub에서 모델 다운로드됨
# 약 40GB, 시간: 5-10분
```

### 3단계: 프론트엔드 설정

#### 의존성 설치
```bash
cd frontend
npm install --legacy-peer-deps
# React 19와 React Query 호환성 이슈로 --legacy-peer-deps 필요
```

#### 프로덕션 빌드 (선택사항)
```bash
npm run build
# dist/ 폴더에 프로덕션 번들 생성
```

---

## ▶️ 실행 방법

### 🔥 빠른 시작 (권장)

#### 단일 터미널에서 모두 실행
```bash
# 프로젝트 루트에서
source venv/bin/activate

# 백엔드 시작 (포트 8000)
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 &

# 프론트엔드 시작 (포트 5173)
cd frontend && npm run dev &

# 또는 개별 터미널에서 실행 (권장)
```

### 📍 개별 터미널에서 실행 (권장)

#### 터미널 1: 백엔드 시작
```bash
source venv/bin/activate
cd /path/to/project
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

예상 출력:
```
2025-10-23 19:14:05 - [kanana] 로드 중...
2025-10-23 19:14:26 - ✅ [kanana] 로드 완료 (21초)
2025-10-23 19:14:26 - [gemma] 로드 중...
2025-10-23 19:14:58 - ✅ [gemma] 로드 완료 (31초)
2025-10-23 19:14:58 - [qwen3] 로드 중...
2025-10-23 19:15:33 - ✅ [qwen3] 로드 완료 (36초)
2025-10-23 19:15:33 - ✅ 서버 시작 완료
INFO:     Uvicorn running on http://0.0.0.0:8000
```

#### 터미널 2: 프론트엔드 시작
```bash
cd frontend
npm run dev
```

예상 출력:
```
  VITE v7.1.12  ready in 223 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 3️⃣ 웹브라우저에서 접속

| 구성요소 | URL | 설명 |
|---------|-----|------|
| **프론트엔드** | http://localhost:5173 | 메인 웹 애플리케이션 |
| **API 문서** | http://localhost:8000/docs | Swagger UI |
| **백엔드 상태** | http://localhost:8000 | API 정보 |

---

## 📚 API 문서

### API 엔드포인트 목록

#### 1️⃣ 건강 상태 확인
```bash
GET /health
```

**응답 예:**
```json
{
  "status": "healthy",
  "models": {
    "kanana": "ready",
    "gemma": "ready",
    "qwen3": "ready"
  },
  "gpu": {
    "available": true,
    "memory_usage": {
      "gpu_0": "22883MB / 52118MB",
      "gpu_1": "16737MB / 52118MB"
    }
  }
}
```

#### 2️⃣ 단일 텍스트 분석 (Predict)
```bash
POST /api/predict
Content-Type: application/json

{
  "text": "분석할 텍스트..."
}
```

**응답 예:**
```json
{
  "status": "success",
  "data": {
    "text": "분석할 텍스트...",
    "ensemble_score": 45,
    "confidence": 0.612,
    "label": "AI_GENERATED",
    "models": {
      "kanana": {"score": 32, "confidence": 0.264},
      "gemma": {"score": 50, "confidence": 0.500},
      "qwen3": {"score": 52, "confidence": 0.785}
    },
    "inference_time_ms": 836
  }
}
```

#### 3️⃣ 상세 분석 (Analyze)
```bash
POST /api/analyze
Content-Type: application/json

{
  "text": "분석할 텍스트..."
}
```

**응답 예:**
```json
{
  "status": "success",
  "data": {
    "overall_score": 45,
    "sentences": [
      {
        "text": "첫 번째 문장...",
        "score": 60,
        "confidence": 0.731,
        "is_ai": true
      }
    ]
  }
}
```

#### 4️⃣ 배치 파일 업로드
```bash
POST /api/batch/upload
Content-Type: multipart/form-data

files: [file1.txt, file2.pdf, ...]
```

**응답:**
```json
{
  "batch_id": "batch_20251023_101900_08b1fdf7",
  "status": "PROCESSING",
  "file_count": 2
}
```

#### 5️⃣ 배치 상태 조회
```bash
GET /api/batch/{batch_id}
```

**응답:**
```json
{
  "batch_id": "batch_20251023_101900_08b1fdf7",
  "status": "COMPLETED",
  "progress": {"completed": 2, "total": 2, "percentage": 100},
  "results": [
    {
      "filename": "test1.txt",
      "ai_score": 45,
      "confidence": 0.612,
      "label": "AI_GENERATED"
    }
  ]
}
```

#### 6️⃣ 배치 결과 다운로드
```bash
GET /api/batch/{batch_id}/download?format=csv
```

---

## 💡 사용 예제

### 예제 1: 단일 텍스트 분석 (curl)
```bash
curl -X POST http://localhost:8000/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "text": "The rapid advancement of artificial intelligence has transformed numerous industries. Machine learning algorithms process vast amounts of data to generate insights and predictions."
  }' | python3 -m json.tool
```

### 예제 2: Python에서 사용
```python
import requests
import json

# API 요청
response = requests.post(
    "http://localhost:8000/api/predict",
    json={"text": "Your text here..."}
)

result = response.json()
data = result['data']

print(f"AI Score: {data['ensemble_score']}/100")
print(f"Confidence: {data['confidence']:.1%}")
print(f"Label: {data['label']}")
print(f"Time: {data['inference_time_ms']}ms")
```

### 예제 3: JavaScript/React에서 사용
```javascript
const response = await fetch('http://localhost:8000/api/predict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'Your text here...' })
});

const result = await response.json();
console.log(`Score: ${result.data.ensemble_score}/100`);
console.log(`Label: ${result.data.label}`);
```

---

## 📁 프로젝트 구조

```
bigdata/
├── backend/                          # FastAPI 백엔드
│   ├── main.py                      # 메인 애플리케이션
│   ├── config.py                    # 설정
│   ├── utils/
│   │   ├── model_loader.py         # 모델 로드 & 추론
│   │   ├── file_parser.py          # 파일 파싱 (TXT/PDF/DOCX)
│   │   └── batch_manager.py        # 배치 상태 관리
│   ├── routes/
│   │   ├── predict.py              # 단일 분석 엔드포인트
│   │   ├── analyze.py              # 상세 분석 엔드포인트
│   │   └── batch.py                # 배치 처리 엔드포인트
│   └── logs/                        # 로그 파일
│
├── frontend/                         # React 프론트엔드
│   ├── src/
│   │   ├── pages/
│   │   │   ├── PredictPage.tsx     # Phase 2: 단일 분석
│   │   │   ├── BatchPage.tsx       # Phase 3: 배치 분석
│   │   │   ├── MonitoringPage.tsx  # Phase 4: 실시간 모니터링
│   │   │   └── StatusPage.tsx      # Phase 4: 시스템 상태
│   │   ├── components/
│   │   │   ├── TextInput.tsx       # 텍스트 입력 컴포넌트
│   │   │   ├── ResultDisplay.tsx   # 결과 표시
│   │   │   ├── ModelComparison.tsx # 모델 비교 (Recharts)
│   │   │   ├── FileUpload.tsx      # 파일 업로드 (드래그&드롭)
│   │   │   ├── ProgressBar.tsx     # 진행률 표시
│   │   │   └── ResultsTable.tsx    # 결과 테이블
│   │   ├── services/
│   │   │   ├── api.ts             # API 클라이언트
│   │   │   └── types.ts           # TypeScript 타입
│   │   └── App.tsx                # 메인 컴포넌트
│   ├── package.json
│   └── tailwind.config.ts
│
├── data/
│   └── original_data/              # 원본 데이터셋
│
├── requirements.txt                 # Python 의존성
├── SPEC.md                         # 프로젝트 명세
├── ARCHITECTURE.md                 # 아키텍처 설명
├── API_SPEC.md                     # API 스펙
├── FRONTEND_SPEC.md                # 프론트엔드 스펙
└── README.md                       # 이 파일
```

---

## ✨ 주요 특징

### 1️⃣ 3-모델 앙상블
```
Kanana 8B → )
Gemma 12B → ) Ensemble → 최종 점수 (평균)
Qwen3 14B → )
```
- 3개 모델을 병렬로 실행하여 robust한 결과 도출
- 각 모델의 점수 차이를 통해 신뢰도 판단

### 2️⃣ 8-bit 양자화로 메모리 최적화
```
원본: 64GB VRAM 필요
양자화 후: 34GB VRAM 필요 (약 47% 절감)
```
- BitsAndBytes 라이브러리 사용
- 추론 정확도는 유지하면서 메모리 사용량 감소

### 3️⃣ 실시간 배치 처리
```
파일 업로드 → 백그라운드 처리 → 실시간 진행률 폴링 → 결과 다운로드
```
- AsyncIO로 비동기 처리
- 최대 10개 파일까지 동시 처리 가능

### 4️⃣ 다양한 파일 형식 지원
```
.txt    → chardet로 인코딩 자동 감지
.pdf    → PyPDF2로 텍스트 추출
.docx   → python-docx로 문서 파싱
```

### 5️⃣ 반응형 웹 디자인
```
데스크톱 (1920px)     → 4 컬럼 레이아웃
태블릿 (768px)       → 2 컬럼 레이아웃
모바일 (480px)       → 1 컬럼 레이아웃
```
- TailwindCSS를 사용한 완전한 반응형 지원

### 6️⃣ 실시간 모니터링
```
사용자 타이핑 → 500ms 디바운싱 → 자동 분석 → 결과 표시 + 그래프 추가
```
- Recharts로 신뢰도 변화 시간 그래프 표시
- 최근 20개 데이터 포인트 유지

---

## 🔍 성능 특성

### 처리 속도
```
단일 텍스트 분석:   ~836ms (3개 모델 병렬)
문장 분석:         ~1000ms (추가 단어별 분석)
배치 처리 (2파일):  ~2000ms
```

### 메모리 사용
```
GPU 메모리:  33GB (3개 모델 로드)
시스템 메모리: 16GB 권장
```

### 정확도
```
프로젝트팀 테스트 결과: >90% 정확도
(97,172개 샘플 기반: 89,177 human, 7,995 AI)
```

---

## 🐛 문제 해결

### GPU 메모리 부족
```bash
# 1. GPU 상태 확인
nvidia-smi

# 2. 다른 프로세스 종료
fuser -k 8000/tcp  # 포트 8000의 프로세스 종료

# 3. 양자화 비활성화 (권장하지 않음)
# backend/utils/model_loader.py의 quantization 비활성화
```

### 모델 다운로드 실패
```bash
# HuggingFace 토큰 필요 시
huggingface-cli login

# 또는 환경 변수로 토큰 설정
export HF_TOKEN=your_token_here
```

### 프론트엔드 빌드 오류
```bash
# React 19와의 호환성 문제
npm install --legacy-peer-deps

# 또는 node_modules 초기화
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### CORS 오류
```javascript
// 프론트엔드에서 API 호출 시 CORS 오류 발생
// 백엔드의 CORS 설정 확인 필요
// backend/main.py의 CORSMiddleware 설정 확인
```

---

## 📊 기술 스펙

| 항목 | 사양 |
|------|------|
| **백엔드 프레임워크** | FastAPI |
| **프론트엔드 프레임워크** | React 18 |
| **타입 안정성** | TypeScript |
| **데이터 시각화** | Recharts |
| **스타일링** | TailwindCSS v3 |
| **HTTP 클라이언트** | Axios |
| **상태 관리** | React Query |
| **번들러** | Vite |
| **모델** | Kanana 8B, Gemma 12B, Qwen3 14B |
| **양자화** | 8-bit (BitsAndBytes) |
| **GPU** | NVIDIA RTX A6000 × 2 |

---

## 📞 지원 및 문의

- **GitHub Issues**: 자신의 개인 저장소 Issues 탭에서 문제 보고 및 기능 요청
  - 참고: `YOUR_USERNAME` 부분을 자신의 GitHub 사용자명으로 변경하세요
  - https://github.com/YOUR_USERNAME/YOUR_REPO/issues
- **API Documentation**: http://localhost:8000/docs (Swagger UI - 로컬 실행 시)
- **API 스펙**: [API_SPEC.md](API_SPEC.md)
- **원본 프로젝트**: [AI-IDLE/2025-digital-aigt-detection](https://github.com/AI-IDLE/2025-digital-aigt-detection.git)

---

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

---

## 🎓 참고 자료

### 모델 정보
- **Kanana 8B**: [HuggingFace](https://huggingface.co/LDCC/Kanana-8B)
- **Gemma 12B**: [HuggingFace](https://huggingface.co/google/gemma-3-12b-it)
- **Qwen3 14B**: [HuggingFace](https://huggingface.co/Qwen/Qwen3-14B)

### 참고 문서
- [PyTorch 공식 문서](https://pytorch.org/docs)
- [FastAPI 공식 문서](https://fastapi.tiangolo.com)
- [React 공식 문서](https://react.dev)
- [TailwindCSS 공식 문서](https://tailwindcss.com)

---

## 🚀 개선 계획

- [ ] 모델 재학습 파이프라인 추가
- [ ] 실시간 데이터 대시보드
- [ ] 사용자 인증 및 권한 관리
- [ ] 분석 결과 히스토리 저장
- [ ] 고급 필터링 및 검색 기능
- [ ] API 레이트 리미팅
- [ ] 배포 자동화 (Docker)

---

**마지막 업데이트**: 2025-10-23
**버전**: 1.0.0 (Production Ready)
