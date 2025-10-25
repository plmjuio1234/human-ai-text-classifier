# 시스템 아키텍처 상세 설명서

**문서 버전**: 1.0
**마지막 업데이트**: 2025-10-23

---

## 📋 목차

1. [시스템 개요](#시스템-개요)
2. [컴포넌트 아키텍처](#컴포넌트-아키텍처)
3. [데이터 흐름](#데이터-흐름)
4. [모델 로드 및 추론](#모델-로드-및-추론)
5. [GPU 메모리 관리](#gpu-메모리-관리)
6. [배포 구조](#배포-구조)
7. [확장성 고려사항](#확장성-고려사항)

---

## 시스템 개요

### 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────┐
│                    사용자 (브라우저)                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓ HTTP/REST
┌─────────────────────────────────────────────────────────┐
│              React Frontend (Port 3000)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ 판별 페이지   │  │ 배치 페이지   │  │ 모니터링 페이지│ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│         ↓                ↓                  ↓           │
│  ┌──────────────────────────────────────────────────┐ │
│  │         API Client (Axios + React Query)         │ │
│  └──────────────┬───────────────────────────────────┘ │
└─────────────────┼───────────────────────────────────┘
                  │
                  ↓ JSON over HTTP
┌─────────────────────────────────────────────────────────┐
│         FastAPI Backend (Port 8000, Uvicorn)            │
│  ┌──────────────────────────────────────────────────┐ │
│  │         API Router & Request Handler             │ │
│  │   ┌──────────────┐  ┌──────────────┐           │ │
│  │   │ /api/predict │  │ /api/batch   │           │ │
│  │   └──────────────┘  └──────────────┘           │ │
│  └────────────────┬─────────────────────────────────┘ │
│                   │                                     │
│  ┌────────────────┴─────────────────────────────────┐ │
│  │    Model Manager & Inference Engine             │ │
│  │  ┌──────────────────────────────────────────┐   │ │
│  │  │ Model Pool:                              │   │ │
│  │  │ - Kanana (GPU 0)                         │   │ │
│  │  │ - Gemma (GPU 0)                          │   │ │
│  │  │ - Qwen3 (GPU 1)                          │   │ │
│  │  └──────────────────────────────────────────┘   │ │
│  └────────────────┬─────────────────────────────────┘ │
│                   │                                     │
│  ┌────────────────┴─────────────────────────────────┐ │
│  │      Task Queue & Batch Processor               │ │
│  │  ┌──────────────────────────────────────────┐   │ │
│  │  │ Job Queue (RQ or Celery 선택)           │   │ │
│  │  │ Batch Worker Threads                    │   │ │
│  │  └──────────────────────────────────────────┘   │ │
│  └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                     │
        ┌────────────┴─────────────┐
        ↓                          ↓
┌──────────────────┐       ┌──────────────────┐
│ GPU 0 (48GB)     │       │ GPU 1 (48GB)     │
│ - Kanana 8B      │       │ - Qwen3 14B      │
│ - Gemma 12B      │       │                  │
│ (20GB 총 사용)   │       │ (14GB 사용)      │
└──────────────────┘       └──────────────────┘

        ↓                          ↓
┌────────────────────────────────────────┐
│      Storage (파일시스템)               │
│ - 모델 가중치 (/models)                │
│ - 배치 결과 (/data/batches)           │
│ - 임시 파일 (/data/temp)              │
└────────────────────────────────────────┘
```

---

## 컴포넌트 아키텍처

### 1. Frontend Layer (React)

#### 주요 컴포넌트
```
App.tsx (루트)
├── PredictPage.tsx
│   ├── TextInput.tsx (사용자 입력)
│   ├── ResultDisplay.tsx (결과 표시)
│   ├── SentenceHeatmap.tsx (문장별 분석)
│   └── ModelComparison.tsx (모델 비교)
├── BatchPage.tsx
│   ├── FileUpload.tsx
│   ├── ProgressMonitor.tsx
│   └── ReportDownload.tsx
├── MonitoringPage.tsx
│   ├── RealTimeInput.tsx
│   └── LiveChart.tsx
└── StatusPage.tsx
    └── ModelStatus.tsx
```

#### 상태 관리
```
React Query를 통한 서버 상태 관리:
- useQuery: API 데이터 조회
- useMutation: API 데이터 변경
- useInfiniteQuery: 배치 결과 페이징
```

### 2. Backend Layer (FastAPI)

#### 라우터 구조
```
app.py (Main Application)
├── routers/
│   ├── predict.py
│   │   ├── POST /api/predict
│   │   └── POST /api/analyze
│   ├── batch.py
│   │   ├── POST /api/batch/upload
│   │   ├── GET /api/batch/{batch_id}
│   │   └── GET /api/batch/{batch_id}/download
│   ├── models.py
│   │   └── GET /api/models/status
│   └── health.py
│       └── GET /health
├── models/
│   ├── schemas.py (Pydantic 스키마)
│   ├── requests.py (요청 모델)
│   └── responses.py (응답 모델)
├── services/
│   ├── inference.py (추론 로직)
│   ├── model_manager.py (모델 관리)
│   ├── batch_processor.py (배치 처리)
│   └── file_handler.py (파일 처리)
├── utils/
│   ├── text_processor.py
│   ├── gpu_manager.py
│   └── logger.py
└── config.py
```

#### 핵심 서비스

**inference.py**
```python
class InferenceEngine:
    - load_models()          # 모델 초기화
    - predict_single()       # 단일 텍스트 판별
    - predict_sentence()     # 문장별 판별
    - unload_models()        # 모델 언로드
```

**model_manager.py**
```python
class ModelManager:
    - get_model(name)        # 모델 획득
    - list_models()          # 모델 목록
    - get_gpu_status()       # GPU 상태 조회
```

**batch_processor.py**
```python
class BatchProcessor:
    - process_batch()        # 배치 처리
    - extract_text()         # 텍스트 추출
    - generate_report()      # 리포트 생성
```

### 3. Model Layer (PyTorch + Transformers)

#### 모델 로드 전략

**초기화 시점**
```
Application Startup
    ↓
1. GPU 메모리 확인
2. Kanana + Gemma 로드 (GPU 0, 20GB)
3. Qwen3 로드 (GPU 1, 14GB)
4. LoRA 파라미터 병합
5. 8-bit 양자화 적용
6. Inference 모드 설정
```

**메모리 할당**
```
GPU 0:
  - Kanana (8GB, device_map="cuda:0")
  - Gemma (12GB, device_map="cuda:0")
  - 총 20GB 사용

GPU 1:
  - Qwen3 (14GB, device_map="cuda:1")
  - 총 14GB 사용
```

#### 추론 파이프라인

```
입력 텍스트
    ↓
텍스트 전처리
├── 정규화
├── 토크나이징
└── 길이 제한 (5000자)
    ↓
병렬 추론 (3개 모델)
├── GPU 0: [Kanana, Gemma]
└── GPU 1: [Qwen3]
    ↓
점수 수집
├── Kanana: [0-100]
├── Gemma: [0-100]
└── Qwen3: [0-100]
    ↓
앙상블 통합
├── 가중 평균: (s1*w1 + s2*w2 + s3*w3)
├── 신뢰도: min(confidence 점수)
└── 최종 판정: threshold 50% 적용
    ↓
응답 반환
```

---

## 데이터 흐름

### 1. 단일 텍스트 판별 흐름

```
User Input (Frontend)
    │
    ↓ HTTP POST /api/predict
┌─────────────────────────────────┐
│  Request Handler (FastAPI)       │
│  - 입력 검증                     │
│  - 길이 체크 (50-5000자)        │
└──────────────┬──────────────────┘
               ↓
┌─────────────────────────────────┐
│  Text Preprocessor              │
│  - 정규화                       │
│  - 토크나이징                   │
└──────────────┬──────────────────┘
               ↓
┌─────────────────────────────────┐
│  Inference Engine               │
│  ├─ GPU 0: Kanana predict       │
│  ├─ GPU 0: Gemma predict        │
│  └─ GPU 1: Qwen3 predict        │
└──────────────┬──────────────────┘
               ↓
┌─────────────────────────────────┐
│  Ensemble Aggregator            │
│  - 점수 통합                    │
│  - 신뢰도 계산                  │
│  - 최종 판정                    │
└──────────────┬──────────────────┘
               ↓
┌─────────────────────────────────┐
│  Response Builder               │
│  - JSON 응답 생성               │
└──────────────┬──────────────────┘
               ↓
          JSON Response
               ↓
         Frontend Display
```

### 2. 배치 분석 흐름

```
File Upload (Frontend)
    │
    ↓ HTTP POST /api/batch/upload (multipart)
┌─────────────────────────────────┐
│  Request Handler                 │
│  - 파일 검증                    │
│  - 임시 저장                    │
│  - Batch ID 생성                │
└──────────────┬──────────────────┘
               ↓
    ✅ Response with Batch ID
               ↓
┌─────────────────────────────────┐
│  Background Job (Task Queue)     │
│  ├─ 각 파일 처리                │
│  ├─ 텍스트 추출                │
│  ├─ 개별 판별                  │
│  └─ 결과 저장                  │
└──────────────┬──────────────────┘
               ↓
┌─────────────────────────────────┐
│  Report Generator               │
│  - CSV/Excel 생성              │
│  - 다운로드 URL 생성            │
└──────────────┬──────────────────┘
               ↓
    Frontend Polling
    GET /api/batch/{batch_id}
```

---

## 모델 로드 및 추론

### 모델 초기화

```python
# 의사코드: 모델 로드 과정
async def initialize_models():
    """
    1. 모델 가중치 다운로드 (Hugging Face Hub)
    2. 8-bit 양자화 적용
    3. LoRA 파라미터 병합
    4. GPU에 할당
    """

    # GPU 0
    model_kanana = load_model(
        "kakaocorp/kanana-1.5-8b-instruct-2505",
        device_map="cuda:0",
        quantization_config=bitsandbytes_8bit,
        lora_adapter=path_to_lora_weights
    )

    # GPU 1
    model_qwen3 = load_model(
        "Qwen/Qwen3-14B",
        device_map="cuda:1",
        quantization_config=bitsandbytes_8bit
    )

    # 모델 풀 저장
    model_pool = {
        "kanana": model_kanana,
        "gemma": model_gemma,
        "qwen3": model_qwen3
    }
```

### 추론 실행

```python
# 의사코드: 추론 과정
async def run_inference(text: str) -> Dict:
    """
    텍스트를 입력받아 3개 모델에서 동시에 추론
    """

    # 병렬 실행 (asyncio)
    tasks = [
        model_kanana.generate(tokens),
        model_gemma.generate(tokens),
        model_qwen3.generate(tokens)
    ]

    results = await asyncio.gather(*tasks)

    # 결과 처리
    scores = extract_scores(results)
    ensemble = weighted_average(scores)

    return {
        "ensemble_score": ensemble,
        "individual_scores": scores
    }
```

---

## GPU 메모리 관리

### 메모리 할당 전략

```
총 GPU 메모리: 96GB (48GB × 2)

GPU 0 (48GB):
├── Kanana 8B: 8GB
├── Gemma 12B: 12GB
├── 입력 배치: 2GB
├── 임시 버퍼: 3GB
└── 여유: 23GB (안전 마진)

GPU 1 (48GB):
├── Qwen3 14B: 14GB
├── 입력 배치: 2GB
├── 임시 버퍼: 2GB
└── 여유: 30GB (안전 마진)

총 사용: 34GB
총 여유: 62GB
```

### 메모리 모니터링

```python
# GPU 사용량 추적
class GPUMonitor:
    - get_usage()      # 현재 사용량
    - get_temperature() # GPU 온도
    - alert_if_high()  # 임계값 초과 시 경고
```

### 최적화 기법

```
1. 8-bit 양자화: 75% 메모리 절감
   FP16 (64GB) → INT8 (16GB)

2. 그래디언트 체크포인팅: 메모리 절감
   (추론에서는 불필요, 학습용)

3. 배치 크기 조정:
   - 최대 배치: 32개 (메모리 여유 시)
   - 일반적: 16개
   - 안전: 8개

4. 메모리 캐싱:
   - 최근 추론 결과 캐시
   - 반복 요청 빠른 응답
```

---

## 배포 구조

### 로컬 개발 환경

```
linux_server/
├── backend/
│   ├── venv/
│   ├── requirements.txt
│   ├── main.py
│   └── .env
├── frontend/
│   ├── node_modules/
│   ├── package.json
│   └── src/
└── models/
    ├── kanana_lora/
    ├── gemma_lora/
    └── qwen3/
```

### 프로세스 관리

```
프로세스 1: FastAPI 서버
  - 포트: 8000
  - 프로세스: Uvicorn 4개 worker
  - 관리: PM2

프로세스 2: React 개발 서버
  - 포트: 3000
  - 프로세스: Vite dev server
  - 관리: npm

프로세스 3: 배치 작업 워커
  - 프로세스: RQ Worker (Redis 큐)
  - 워커 수: 2개
```

### 포트 할당

```
3000: React Frontend (Vite)
8000: FastAPI Backend (Uvicorn)
6379: Redis (배치 큐)
```

---

## 확장성 고려사항

### 향후 개선 (우선순위 낮음, 현재 불필요)

1. **마이크로서비스 아키텍처**
   ```
   모델 서빙 → 별도 서비스 분리
   배치 처리 → 별도 워커 서비스
   ```

2. **데이터베이스 통합**
   ```
   분석 이력 저장
   사용자별 결과 추적
   피드백 수집
   ```

3. **모델 추가**
   ```
   현재: 3개 모델
   향후: 더 많은 모델 지원 가능
   (메모리 충분하면)
   ```

4. **캐싱 개선**
   ```
   Redis 캐시 도입
   자주 묻는 텍스트 빠른 응답
   ```

5. **모니터링 & 로깅**
   ```
   Prometheus 메트릭
   ELK 스택 로깅
   ```

---

## 보안 고려사항

### 입력 검증
```
- 텍스트 길이 제한: 50-5000자
- SQL Injection 방지 (ORM 사용)
- 파일 타입 검증: TXT, PDF, DOCX만
- 파일 크기 제한: 각 50MB, 총 200MB
```

### API 보안
```
- CORS 설정: 필요한 도메인만
- Rate Limiting: IP당 10 req/min
- HTTPS: 프로덕션 필수 (현재 HTTP OK)
```

---

## 성능 최적화

### 추론 성능
```
목표: < 3초

최적화:
1. 배치 처리: 여러 요청 통합
2. 캐싱: 중복 요청 스킵
3. 비동기: I/O 논블로킹
4. GPU 활용률: 최대화
```

### 네트워크 성능
```
1. 응답 압축: gzip
2. 이미지 최적화: Recharts
3. 코드 분할: React 코드 분할
4. CDN: 프로덕션용 (현재 불필요)
```

---

## 마치며

이 아키텍처는 다음을 목표로 설계되었습니다:
- ✅ **단순성**: 이해하기 쉬운 구조
- ✅ **확장성**: 향후 개선 용이
- ✅ **성능**: < 3초 응답 시간
- ✅ **안정성**: 적절한 에러 처리
