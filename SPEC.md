# AI vs 인간 텍스트 판별 웹 시스템 - 공식 스펙

**문서 버전**: 1.0
**마지막 업데이트**: 2025-10-23
**상태**: 활성화 중

---

## 📋 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [기술 요구사항](#기술-요구사항)
3. [기능 사양](#기능-사양)
4. [시스템 아키텍처](#시스템-아키텍처)
5. [데이터 모델](#데이터-모델)
6. [API 명세](#api-명세)
7. [성능 요구사항](#성능-요구사항)
8. [테스트 요구사항](#테스트-요구사항)

---

## 프로젝트 개요

### 목표
학교 Bigdata 수업을 위한 AI vs 인간 텍스트 판별 웹 시스템 구축
- **사용자**: 학교 교직원, 학생 (교육용)
- **주요 기능**: 텍스트 입력 → AI/인간 판별 + 상세 분석
- **핵심 강점**: 시각화, 배치 분석, 실시간 모니터링

### 프로젝트 제약
- **개발 기간**: 5주
- **배포 범위**: 데모 수준 (실제 서비스 수준의 완성도)
- **대상 사용자**: 최대 5-10명 동시 접속
- **운영 환경**: 학교 리눅스 서버 (RTX A6000 48GB × 2)

### 성공 기준
- ✅ 모든 핵심 기능 작동 (기본 판별, 상세 분석, 배치 분석)
- ✅ UI/UX 반응성 < 100ms
- ✅ 추론 속도 < 3초 (단일 텍스트)
- ✅ 정확도 > 90% (원본 프로젝트 기준)
- ✅ 데모 발표 시 모든 기능 정상 시연

---

## 기술 요구사항

### 운영 환경
```
OS: Ubuntu 22.04 (Linux)
Python: 3.11
GPU: NVIDIA RTX A6000 48GB × 2개 (CUDA 13.0)
RAM: 126GB (118GB 가용)
CPU: Intel Xeon Silver 4210R (20 threads)
Disk: 219GB 여유 공간
```

### 백엔드 스택
- **프레임워크**: FastAPI 0.110+
- **서버**: Uvicorn (비동기)
- **패키지 매니저**: pip
- **핵심 라이브러리**:
  - torch 2.2+ (GPU)
  - transformers 4.40+
  - bitsandbytes 0.43+ (8-bit 양자화)
  - peft (LoRA 파라미터 로딩)
  - python-multipart (파일 업로드)
  - pydantic 2.0+ (데이터 검증)

### 프론트엔드 스택
- **프레임워크**: React 18+
- **언어**: TypeScript 5+
- **빌드 도구**: Vite
- **UI 라이브러리**:
  - Recharts (데이터 시각화)
  - TailwindCSS (스타일링)
  - Axios (HTTP 클라이언트)
  - React Query (상태 관리)

### 모델 스택
```
사용 모델 (3개):
1. Kanana 1.5 8B (Kakao) - 8-bit 양자화 (8GB)
2. Gemma 3 12B (Google) - 8-bit 양자화 (12GB)
3. Qwen3 14B (Alibaba) - 8-bit 양자화 (14GB)

제외 모델:
- EXAONE 32B (메모리 제약: 32GB > 48GB 불가능)

배포 전략:
- GPU 0: Kanana + Gemma (20GB)
- GPU 1: Qwen3 (14GB)
```

---

## 기능 사양

### 1️⃣ 핵심 기능: 텍스트 AI 판별

#### 1.1 단일 텍스트 판별
**사용자 입력**
```
입력: 문장 또는 단락 (최소 50자, 최대 5000자)
형식: 평문 텍스트
```

**처리 과정**
```
1. 텍스트 전처리 (정규화, 토크나이징)
2. 3개 모델 동시 추론 (병렬 처리)
3. 개별 모델 판정 (AI 확률 0-100%)
4. 앙상블 통합 (가중 평균)
5. 신뢰도 점수 계산
```

**출력 (JSON)**
```json
{
  "text": "입력 텍스트",
  "ensemble_score": 85,  // 최종 AI 확률 (0-100)
  "confidence": 0.95,     // 신뢰도 (0-1)
  "models": {
    "kanana": { "score": 80, "confidence": 0.92 },
    "gemma": { "score": 88, "confidence": 0.96 },
    "qwen3": { "score": 87, "confidence": 0.94 }
  },
  "label": "AI_GENERATED",  // 최종 판정 (threshold: 50%)
  "inference_time_ms": 2450
}
```

#### 1.2 문장별 상세 분석
**목표**: 어느 부분이 AI스러운지 시각화

**입력**: 전체 텍스트

**처리**
```
1. 텍스트를 문장 단위로 분할
2. 각 문장마다 독립적으로 판별
3. 문장별 AI 확률 계산
4. 히트맵 데이터 생성
```

**출력**
```json
{
  "sentences": [
    {
      "index": 0,
      "text": "이것은 첫 번째 문장입니다.",
      "score": 72,
      "is_ai": false
    },
    {
      "index": 1,
      "text": "이 부분은 AI가 생성한 것으로 보입니다.",
      "score": 92,
      "is_ai": true
    }
  ],
  "heatmap": [72, 92, 65, 88, ...]  // 시각화용
}
```

### 2️⃣ 배치 분석 기능

#### 2.1 다중 파일 분석
**입력 형식**
- TXT, PDF, DOCX 파일
- 최대 10개 파일, 각 파일 최대 50MB
- 최대 총 용량: 200MB

**처리**
```
1. 파일 파싱 및 텍스트 추출
2. 문서별 텍스트 판별
3. 결과 집계
```

**출력**
```json
{
  "batch_id": "batch_20251023_001",
  "timestamp": "2025-10-23T14:40:00Z",
  "files": [
    {
      "filename": "report1.txt",
      "ai_score": 85,
      "status": "success",
      "summary": "AI 생성 가능성 높음 (85%)"
    }
  ],
  "export_url": "/api/batch/{batch_id}/download"
}
```

#### 2.2 리포트 생성 및 다운로드
**형식**
- CSV (엑셀)
- 포함 항목: 파일명, AI 확률, 판정, 분석 일시

**다운로드 URL**
```
GET /api/batch/{batch_id}/download?format=csv
```

### 3️⃣ 실시간 타이핑 모니터링

#### 3.1 기능 명세
**목표**: 사용자가 타이핑하면서 실시간으로 AI 확률 변화 표시

**동작**
```
1. 사용자가 텍스트 입력
2. 750ms 디바운싱 후 자동 전송
3. 백엔드에서 즉시 판별
4. 결과 실시간 표시
```

**메시지 형식**
```json
{
  "event": "analysis_update",
  "score": 72,
  "text_length": 150,
  "message": "이 표현을 추가하니 AI 확률이 +5% 증가했습니다."
}
```

### 4️⃣ 모델 비교 시각화

#### 4.1 모델별 판단 비교
**표시 항목**
- 3개 모델의 개별 점수
- 신뢰도 분포 (신뢰도 높음/낮음)
- 모델 간 합의도 (Consensus Score)

**시각화**
```
레이더 차트: 3개 모델 점수
막대 차트: 신뢰도 비교
히스토그램: 점수 분포
```

---

## 시스템 아키텍처

### 전체 구조
```
┌─────────────────────────────────┐
│   React Frontend (Port 3000)     │
│  - 단일 판별 페이지             │
│  - 배치 분석 페이지             │
│  - 실시간 모니터링 페이지       │
│  - 모델 비교 페이지             │
└──────────────┬──────────────────┘
               │ REST API (JSON)
┌──────────────┴──────────────────┐
│   FastAPI Server (Port 8000)     │
│  - 모델 로딩 및 관리             │
│  - 추론 엔드포인트              │
│  - 배치 처리 큐                 │
│  - 파일 처리                    │
└──────────────┬──────────────────┘
               │
┌──────────────┴──────────────────┐
│   GPU Memory Management         │
│  GPU0: Kanana (8GB)            │
│        Gemma (12GB)            │
│  GPU1: Qwen3 (14GB)            │
└────────────────────────────────┘
```

---

## 데이터 모델

### 요청/응답 스키마

#### TextAnalysisRequest
```python
{
  "text": str,           # 분석할 텍스트 (50-5000자)
  "include_sentences": bool,  # 문장별 분석 포함 여부
  "model_names": List[str]    # 특정 모델만 사용 (선택사항)
}
```

#### TextAnalysisResponse
```python
{
  "ensemble_score": int,       # 0-100
  "confidence": float,         # 0-1
  "label": Literal["AI_GENERATED", "HUMAN_WRITTEN"],
  "models": Dict[str, ModelResult],
  "sentences": List[SentenceAnalysis],  # 선택사항
  "inference_time_ms": int
}
```

### 데이터베이스 (선택사항)
**저장 항목** (추후 확장)
- 분석 이력
- 사용자 피드백
- 성능 메트릭

**현재**: 메모리 저장 (영구 저장 불필요)

---

## API 명세

### 엔드포인트 목록

#### 1. 단일 텍스트 판별
```
POST /api/predict
Content-Type: application/json

Request:
{
  "text": "분석할 텍스트입니다."
}

Response (200):
{
  "ensemble_score": 75,
  "confidence": 0.92,
  "label": "HUMAN_WRITTEN",
  "models": {...},
  "inference_time_ms": 2345
}
```

#### 2. 문장별 상세 분석
```
POST /api/analyze
Content-Type: application/json

Request:
{
  "text": "분석할 텍스트입니다."
}

Response (200):
{
  "sentences": [...],
  "heatmap": [...],
  "overall_score": 75
}
```

#### 3. 배치 분석 시작
```
POST /api/batch/upload
Content-Type: multipart/form-data

Request:
- files: [파일들]

Response (202):
{
  "batch_id": "batch_20251023_001",
  "status": "PROCESSING",
  "estimated_time_seconds": 30
}
```

#### 4. 배치 결과 조회
```
GET /api/batch/{batch_id}

Response (200):
{
  "batch_id": "batch_20251023_001",
  "status": "COMPLETED",
  "results": [...]
}
```

#### 5. 리포트 다운로드
```
GET /api/batch/{batch_id}/download?format=csv

Response (200):
[Binary CSV File]
```

#### 6. 모델 상태 조회
```
GET /api/models/status

Response (200):
{
  "models": [
    {
      "name": "kanana",
      "loaded": true,
      "gpu_memory_mb": 8192,
      "status": "ready"
    }
  ],
  "gpu_status": [...]
}
```

---

## 성능 요구사항

### 응답 시간 (SLA)
```
- 단일 판별:        < 3초
- 배치 시작:        < 1초
- API 응답:         < 100ms
- 프론트엔드 렌더링: < 100ms
```

### 동시성
```
- 동시 API 요청: 5개
- 배치 큐 크기: 10개
- 작업 타임아웃: 60초
```

### GPU 메모리
```
최대 사용량: 34GB (합계 96GB 중)
메모리 여유: 62GB (충분한 마진)
```

### 정확도
```
목표: > 90% (원본 프로젝트 벤치마크)
단일 모델: 87-91%
3-모델 앙상블: 90-93%
```

---

## 테스트 요구사항

### 단위 테스트 (Unit Tests)
```
✅ 각 모델의 추론 정확성
✅ 데이터 전처리 함수
✅ 앙상블 로직
✅ 파일 파싱 (PDF, DOCX, TXT)
```

### 통합 테스트 (Integration Tests)
```
✅ API 엔드포인트 정상 작동
✅ 백엔드-프론트엔드 통신
✅ 배치 분석 전체 흐름
✅ 파일 업로드 및 처리
```

### 성능 테스트 (Performance Tests)
```
✅ 단일 판별 < 3초
✅ 동시 5개 요청 처리
✅ GPU 메모리 사용량 모니터링
```

### E2E 테스트 (End-to-End Tests)
```
✅ 텍스트 입력 → 판별 결과 표시
✅ 파일 업로드 → 리포트 다운로드
✅ 실시간 모니터링 동작
```

---

## 개발 마일스톤

| 주차 | 마일스톤 | 상태 |
|------|---------|------|
| 1 | 환경 구축 & 모델 검증 | 📅 대기 |
| 2 | 백엔드 API 구현 | 📅 대기 |
| 3 | 프론트엔드 개발 | 📅 대기 |
| 4 | 고급 기능 구현 | 📅 대기 |
| 5 | 마무리 & 데모 준비 | 📅 대기 |

---

## 승인 및 변경 로그

| 버전 | 날짜 | 변경 사항 | 승인자 |
|------|------|---------|--------|
| 1.0 | 2025-10-23 | 초본 작성 | 프로젝트 리더 |
