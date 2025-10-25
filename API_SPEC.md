# FastAPI 엔드포인트 상세 스펙

**문서 버전**: 1.0
**마지막 업데이트**: 2025-10-23

---

## 📋 목차

1. [API 개요](#api-개요)
2. [공통 사항](#공통-사항)
3. [엔드포인트 상세](#엔드포인트-상세)
4. [에러 처리](#에러-처리)
5. [성능 고려사항](#성능-고려사항)

---

## API 개요

### 기본 정보
- **Base URL**: `http://localhost:8000`
- **API 버전**: v1
- **Content-Type**: application/json
- **인증**: 현재 없음 (학교 내부망, 보안은 나중에)

### 성능 SLA
```
- 응답 시간: < 100ms (API 로직)
- 추론 시간: < 3초 (모델)
- 가용성: 99% (데모 수준)
```

---

## 공통 사항

### 성공 응답 형식
```json
{
  "status": "success",
  "data": { /* 실제 데이터 */ },
  "timestamp": "2025-10-23T14:40:00Z"
}
```

### 에러 응답 형식
```json
{
  "status": "error",
  "error": {
    "code": "INVALID_INPUT",
    "message": "텍스트는 최소 50자 이상이어야 합니다.",
    "details": { /* 추가 정보 */ }
  },
  "timestamp": "2025-10-23T14:40:00Z"
}
```

### 공통 헤더
```
Request Headers:
- Content-Type: application/json (또는 multipart/form-data)
- User-Agent: 클라이언트 이름

Response Headers:
- Content-Type: application/json
- X-Process-Time: 처리 시간 (ms)
```

---

## 엔드포인트 상세

### 1️⃣ 건강 체크

#### `GET /health`

**목적**: 서버 상태 확인

**요청**
```http
GET /health HTTP/1.1
Host: localhost:8000
```

**응답 (200 OK)**
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
      "gpu_0": "20GB / 48GB",
      "gpu_1": "14GB / 48GB"
    }
  }
}
```

---

### 2️⃣ 단일 텍스트 판별

#### `POST /api/predict`

**목적**: 입력 텍스트가 AI 생성인지 판별

**요청**
```http
POST /api/predict HTTP/1.1
Host: localhost:8000
Content-Type: application/json

{
  "text": "이 텍스트는 인간이 작성한 것일까요 AI가 작성한 것일까요?",
  "include_metadata": true
}
```

**요청 스키마**
```python
{
  "text": str,                    # 필수, 50-5000자
  "include_metadata": bool = False # 선택사항, 추가 정보 포함 여부
}
```

**응답 (200 OK)**
```json
{
  "status": "success",
  "data": {
    "text": "이 텍스트는 인간이 작성한 것일까요 AI가 작성한 것일까요?",
    "ensemble_score": 35,
    "confidence": 0.89,
    "label": "HUMAN_WRITTEN",
    "models": {
      "kanana": {
        "score": 32,
        "confidence": 0.87,
        "raw_output": "..."
      },
      "gemma": {
        "score": 38,
        "confidence": 0.91,
        "raw_output": "..."
      },
      "qwen3": {
        "score": 35,
        "confidence": 0.89,
        "raw_output": "..."
      }
    },
    "inference_time_ms": 2456,
    "timestamp": "2025-10-23T14:40:00Z"
  }
}
```

**응답 필드 설명**
| 필드 | 타입 | 설명 |
|------|------|------|
| ensemble_score | int (0-100) | 최종 AI 확률 (높을수록 AI 생성) |
| confidence | float (0-1) | 판정의 신뢰도 |
| label | "AI_GENERATED" \| "HUMAN_WRITTEN" | 최종 판정 (threshold: 50%) |
| models.{name}.score | int | 개별 모델의 판정 (0-100) |
| inference_time_ms | int | 추론 소요 시간 |

**에러 응답 (400 Bad Request)**
```json
{
  "status": "error",
  "error": {
    "code": "INVALID_TEXT_LENGTH",
    "message": "텍스트는 50자 이상 5000자 이하여야 합니다.",
    "details": {
      "min_length": 50,
      "max_length": 5000,
      "provided_length": 30
    }
  }
}
```

**에러 케이스**
```
400: 텍스트 길이 부적절
400: 빈 텍스트
500: 모델 추론 실패
503: GPU 메모리 부족
```

---

### 3️⃣ 문장별 상세 분석

#### `POST /api/analyze`

**목적**: 입력 텍스트를 문장 단위로 분석, 어느 부분이 AI스러운지 표시

**요청**
```http
POST /api/analyze HTTP/1.1
Host: localhost:8000
Content-Type: application/json

{
  "text": "첫 번째 문장입니다. 두 번째 문장입니다. 세 번째 문장입니다.",
  "threshold": 50
}
```

**요청 스키마**
```python
{
  "text": str,              # 필수, 50-5000자
  "threshold": int = 50     # 선택사항, AI 판정 임계값 (0-100)
}
```

**응답 (200 OK)**
```json
{
  "status": "success",
  "data": {
    "text": "첫 번째 문장입니다. 두 번째 문장입니다.",
    "overall_score": 62,
    "sentences": [
      {
        "index": 0,
        "text": "첫 번째 문장입니다.",
        "score": 45,
        "confidence": 0.85,
        "is_ai": false,
        "char_range": { "start": 0, "end": 9 }
      },
      {
        "index": 1,
        "text": "두 번째 문장입니다.",
        "score": 79,
        "confidence": 0.92,
        "is_ai": true,
        "char_range": { "start": 10, "end": 19 }
      }
    ],
    "heatmap": [45, 79],  # 시각화용
    "ai_sentence_count": 1,
    "ai_sentence_percentage": 50.0,
    "inference_time_ms": 3200
  }
}
```

**응답 필드 설명**
| 필드 | 설명 |
|------|------|
| overall_score | 전체 텍스트의 AI 확률 |
| sentences[] | 문장 배열 |
| sentences[].is_ai | 해당 문장이 AI 생성인지 여부 |
| heatmap | 시각화용 점수 배열 |

---

### 4️⃣ 배치 분석 - 파일 업로드

#### `POST /api/batch/upload`

**목적**: 여러 파일을 업로드하여 일괄 분석

**요청**
```http
POST /api/batch/upload HTTP/1.1
Host: localhost:8000
Content-Type: multipart/form-data

--boundary
Content-Disposition: form-data; name="files"; filename="document1.txt"
Content-Type: text/plain

[파일 내용]
--boundary
Content-Disposition: form-data; name="files"; filename="document2.pdf"
Content-Type: application/pdf

[PDF 바이너리]
--boundary--
```

**요청 스키마**
```python
{
  "files": List[UploadFile],    # 필수, 최대 10개
  # 최대 각 50MB, 총 200MB
}
```

**응답 (202 Accepted)**
```json
{
  "status": "accepted",
  "data": {
    "batch_id": "batch_20251023_001",
    "status": "PROCESSING",
    "file_count": 2,
    "estimated_time_seconds": 45,
    "status_url": "/api/batch/batch_20251023_001",
    "timestamp": "2025-10-23T14:40:00Z"
  }
}
```

**에러 응답 (400 Bad Request)**
```json
{
  "status": "error",
  "error": {
    "code": "INVALID_FILE",
    "message": "지원하지 않는 파일 형식입니다.",
    "details": {
      "allowed_formats": ["txt", "pdf", "docx"],
      "provided_format": "xlsx"
    }
  }
}
```

---

### 5️⃣ 배치 분석 - 상태 조회

#### `GET /api/batch/{batch_id}`

**목적**: 배치 처리 상태 조회

**요청**
```http
GET /api/batch/batch_20251023_001 HTTP/1.1
Host: localhost:8000
```

**응답 - 처리 중 (200 OK)**
```json
{
  "status": "success",
  "data": {
    "batch_id": "batch_20251023_001",
    "status": "PROCESSING",
    "progress": {
      "completed": 1,
      "total": 2,
      "percentage": 50
    },
    "started_at": "2025-10-23T14:40:00Z",
    "estimated_completion": "2025-10-23T14:40:45Z"
  }
}
```

**응답 - 완료됨 (200 OK)**
```json
{
  "status": "success",
  "data": {
    "batch_id": "batch_20251023_001",
    "status": "COMPLETED",
    "results": [
      {
        "filename": "document1.txt",
        "ai_score": 65,
        "confidence": 0.88,
        "label": "AI_GENERATED",
        "sentences_analyzed": 10,
        "processing_time_ms": 1234
      },
      {
        "filename": "document2.pdf",
        "ai_score": 35,
        "confidence": 0.91,
        "label": "HUMAN_WRITTEN",
        "sentences_analyzed": 15,
        "processing_time_ms": 1567
      }
    ],
    "summary": {
      "total_files": 2,
      "ai_files": 1,
      "human_files": 1,
      "average_score": 50,
      "total_time_ms": 2801
    },
    "download_url": "/api/batch/batch_20251023_001/download",
    "completed_at": "2025-10-23T14:40:45Z"
  }
}
```

---

### 6️⃣ 배치 분석 - 리포트 다운로드

#### `GET /api/batch/{batch_id}/download`

**목적**: 배치 분석 결과를 CSV/Excel로 다운로드

**요청**
```http
GET /api/batch/batch_20251023_001/download?format=csv HTTP/1.1
Host: localhost:8000
```

**쿼리 파라미터**
```
format: 'csv' (기본) | 'xlsx'
```

**응답 (200 OK)**
```
Content-Type: text/csv (또는 application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
Content-Disposition: attachment; filename="batch_20251023_001.csv"

[CSV 내용]
파일명,AI확률,판정,신뢰도,분석문장,처리시간(ms),분석일시
document1.txt,65,AI_GENERATED,0.88,10,1234,2025-10-23T14:40:00Z
document2.pdf,35,HUMAN_WRITTEN,0.91,15,1567,2025-10-23T14:40:20Z
```

---

### 7️⃣ 모델 상태 조회

#### `GET /api/models/status`

**목적**: 현재 로드된 모델들의 상태 및 GPU 정보 확인

**요청**
```http
GET /api/models/status HTTP/1.1
Host: localhost:8000
```

**응답 (200 OK)**
```json
{
  "status": "success",
  "data": {
    "models": [
      {
        "name": "kanana",
        "model_id": "kakaocorp/kanana-1.5-8b-instruct-2505",
        "parameters": 8000000000,
        "loaded": true,
        "device": "cuda:0",
        "quantization": "8bit",
        "memory_mb": 8192,
        "status": "ready",
        "last_inference_ms": 234,
        "inference_count": 1523
      },
      {
        "name": "gemma",
        "model_id": "google/gemma-3-12b-it",
        "parameters": 12000000000,
        "loaded": true,
        "device": "cuda:0",
        "quantization": "8bit",
        "memory_mb": 12288,
        "status": "ready",
        "last_inference_ms": 198,
        "inference_count": 1523
      },
      {
        "name": "qwen3",
        "model_id": "Qwen/Qwen3-14B",
        "parameters": 14000000000,
        "loaded": true,
        "device": "cuda:1",
        "quantization": "8bit",
        "memory_mb": 14336,
        "status": "ready",
        "last_inference_ms": 156,
        "inference_count": 1522
      }
    ],
    "gpu": [
      {
        "device_id": 0,
        "name": "NVIDIA RTX A6000",
        "total_memory_mb": 49140,
        "used_memory_mb": 20480,
        "free_memory_mb": 28660,
        "temperature": 45,
        "power_usage_w": 120
      },
      {
        "device_id": 1,
        "name": "NVIDIA RTX A6000",
        "total_memory_mb": 49140,
        "used_memory_mb": 14336,
        "free_memory_mb": 34804,
        "temperature": 42,
        "power_usage_w": 85
      }
    ],
    "system": {
      "uptime_seconds": 86400,
      "cpu_usage_percent": 25.3,
      "memory_usage_percent": 12.5
    }
  }
}
```

---

## 에러 처리

### 에러 코드 정의

| 코드 | HTTP | 설명 | 해결책 |
|------|------|------|--------|
| INVALID_INPUT | 400 | 입력 검증 실패 | 요청 형식 확인 |
| INVALID_TEXT_LENGTH | 400 | 텍스트 길이 부적절 | 50-5000자로 조정 |
| INVALID_FILE | 400 | 지원하지 않는 파일 | TXT/PDF/DOCX만 지원 |
| FILE_TOO_LARGE | 413 | 파일 크기 초과 | 50MB 이하로 |
| MODEL_NOT_READY | 503 | 모델 로드 중 | 잠시 후 재시도 |
| GPU_OUT_OF_MEMORY | 503 | GPU 메모리 부족 | 잠시 후 재시도 |
| INFERENCE_FAILED | 500 | 추론 실패 | 서버 로그 확인 |
| BATCH_NOT_FOUND | 404 | 배치 ID 없음 | batch_id 확인 |

### 에러 응답 예시

```json
{
  "status": "error",
  "error": {
    "code": "INVALID_TEXT_LENGTH",
    "message": "텍스트는 50자 이상 5000자 이하여야 합니다.",
    "details": {
      "min_length": 50,
      "max_length": 5000,
      "provided_length": 30
    }
  },
  "timestamp": "2025-10-23T14:40:00Z"
}
```

---

## 성능 고려사항

### 응답 시간 SLA
```
- /health: < 10ms
- /api/predict: < 2500ms (추론 시간)
- /api/analyze: < 3500ms (여러 문장)
- /api/batch/upload: < 100ms
- /api/batch/{id}: < 50ms
- /api/models/status: < 50ms
```

### Rate Limiting (향후 추가)
```
제한 없음 (현재, 학교 내부망)

향후:
- IP당: 10 req/min
- 전체: 100 req/min
```

### 캐싱 전략
```
1. 동일 텍스트 캐싱
   - 최근 100개 결과 메모리 캐시
   - TTL: 1시간

2. 모델 캐싱
   - 모델 가중치: 영구 저장
   - GPU 메모리: 애플리케이션 전체 생명주기

3. HTTP 캐싱
   - /api/models/status: Cache-Control: max-age=60
   - 배치 결과: Cache-Control: max-age=3600
```

---

## 마치며

이 API 스펙은 다음을 기준으로 설계되었습니다:
- ✅ RESTful 원칙 준수
- ✅ 명확한 응답 형식
- ✅ 포괄적인 에러 처리
- ✅ 성능 요구사항 충족
