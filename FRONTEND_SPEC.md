# React 프론트엔드 상세 스펙

**문서 버전**: 1.0
**마지막 업데이트**: 2025-10-23

---

## 📋 목차

1. [프로젝트 구조](#프로젝트-구조)
2. [페이지 명세](#페이지-명세)
3. [컴포넌트 명세](#컴포넌트-명세)
4. [상태 관리](#상태-관리)
5. [스타일링](#스타일링)
6. [API 통합](#api-통합)

---

## 프로젝트 구조

```
frontend/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── TextInput.tsx         # 텍스트 입력 컴포넌트
│   │   ├── ResultDisplay.tsx     # 판별 결과 표시
│   │   ├── SentenceHeatmap.tsx   # 문장별 히트맵
│   │   ├── ModelComparison.tsx   # 모델 비교 차트
│   │   ├── FileUpload.tsx        # 파일 업로드
│   │   ├── ProgressBar.tsx       # 진행 상황 표시
│   │   └── LoadingSpinner.tsx    # 로딩 표시
│   ├── pages/
│   │   ├── PredictPage.tsx       # 단일 판별 페이지
│   │   ├── BatchPage.tsx         # 배치 분석 페이지
│   │   ├── MonitoringPage.tsx    # 실시간 모니터링 페이지
│   │   └── StatusPage.tsx        # 모델 상태 페이지
│   ├── services/
│   │   ├── api.ts               # API 호출 함수
│   │   └── types.ts             # TypeScript 타입
│   ├── hooks/
│   │   ├── usePrediction.ts      # 판별 로직 훅
│   │   ├── useBatch.ts           # 배치 처리 훅
│   │   └── useRealtimeMonitor.ts # 실시간 모니터링 훅
│   ├── App.tsx                   # 루트 컴포넌트
│   ├── main.tsx                  # 진입점
│   └── index.css                 # 전역 스타일
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

---

## 페이지 명세

### 1️⃣ 단일 판별 페이지 (PredictPage)

#### 레이아웃
```
┌─────────────────────────────────────┐
│  헤더 (제목 + 네비게이션)             │
├─────────────────────────────────────┤
│  좌측 (50%)              우측 (50%)  │
│                                     │
│  입력 영역:              결과 영역:   │
│  ┌──────────────────┐  ┌──────────┐ │
│  │ 텍스트 입력창    │  │ 확률 게이지│ │
│  │ (textarea)       │  │ 최종 판정  │ │
│  │                  │  ├──────────┤ │
│  │ 분석 버튼        │  │ 모델별 점수│ │
│  │                  │  │ (3개)     │ │
│  └──────────────────┘  └──────────┘ │
│                                     │
│  탭: 모델 비교 | 문장 분석           │
│  ┌─────────────────────────────────┐│
│  │ 차트 영역                        ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

#### 기능 명세

**텍스트 입력**
```
- HTML5 textarea
- 최소 50자, 최대 5000자
- 리모 표시 (현재: 0/5000)
- 붙여넣기 지원
```

**분석 버튼**
```
- 비활성화 조건: 텍스트 < 50자 또는 처리 중
- 클릭 시: API 호출
- 로딩 중: 스피너 표시
```

**결과 표시**
```
1. 최종 판정 (AI/인간)
   - 큰 텍스트로 강조
   - 색상: AI (빨강), 인간 (초록)

2. 신뢰도 게이지
   - 0-100% 진행 바
   - 색상 그래디언트

3. 모델별 판정
   - 3개 모델의 개별 점수
   - 테이블 형식
   - 신뢰도 표시
```

**탭: 모델 비교**
```
- Recharts 레이더 차트
- 3개 모델의 점수 비교
- 합의도 (Consensus) 표시
```

**탭: 문장 분석**
```
- 문장별 AI 확률 테이블
- 히트맵 시각화
- 의심 구간 하이라이트
```

---

### 2️⃣ 배치 분석 페이지 (BatchPage)

#### 레이아웃
```
┌─────────────────────────────────────┐
│  헤더                                │
├─────────────────────────────────────┤
│  업로드 영역 (드래그 앤 드롭)         │
│  ┌─────────────────────────────────┐│
│  │ 파일을 여기 드래그하세요        ││
│  │ 또는 클릭하여 파일 선택         ││
│  └─────────────────────────────────┘│
│                                     │
│  선택된 파일 목록                    │
│  ┌─────────────────────────────────┐│
│  │ □ document1.txt  (15KB)         ││
│  │ □ document2.pdf  (250KB)        ││
│  │ [제거]                          ││
│  └─────────────────────────────────┘│
│                                     │
│  [분석 시작] 버튼                    │
│                                     │
│  처리 결과 (완료 후)                 │
│  ┌─────────────────────────────────┐│
│  │ 파일명 | AI% | 판정 | 시간      ││
│  │ ─────────────────────────────── ││
│  │ doc1.txt | 65 | AI | 2.3s     ││
│  │ doc2.pdf | 35 | 인간 | 2.8s  ││
│  │                                 ││
│  │ [CSV 다운로드] [Excel 다운로드] ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

#### 기능 명세

**파일 업로드**
```
- Drag & Drop 지원
- 클릭하여 파일 선택
- 지원 형식: TXT, PDF, DOCX
- 최대 파일: 50MB
- 최대 총: 200MB
- 최대 파일 수: 10개
```

**파일 검증**
```
- 형식 체크 (MIME 타입)
- 크기 체크 (프론트엔드, 서버에서도)
- 중복 파일 방지
```

**처리 상황 표시**
```
- 파일별 진행 바
- 전체 진행도 (예: 1/2 완료)
- 예상 소요 시간
- 실시간 업데이트 (폴링)
```

**결과 표시**
```
- 테이블: 파일명, AI%, 판정, 신뢰도, 소요시간
- 요약: 총 파일 수, AI 파일 수, 평균 점수
- 다운로드: CSV, Excel
```

---

### 3️⃣ 실시간 모니터링 페이지 (MonitoringPage)

#### 레이아웃
```
┌─────────────────────────────────────┐
│  헤더                                │
├─────────────────────────────────────┤
│  입력 영역                            │
│  ┌─────────────────────────────────┐│
│  │ 텍스트 입력 (자동 분석)          ││
│  │ 입력 시 자동으로 판별시작        ││
│  └─────────────────────────────────┘│
│                                     │
│  실시간 결과                         │
│  ┌─────────────────────────────────┐│
│  │ 현재 AI 확률: 72%               ││
│  │ ████████░░░░░░░░░░░░░ 72%      ││
│  │                                 ││
│  │ 최근 변화: +5% (이전 67%)      ││
│  │ 피드백: "표현을 추가하니...    ││
│  │          AI 확률이 증가했습니다" ││
│  └─────────────────────────────────┘│
│                                     │
│  시간별 차트                         │
│  ┌─────────────────────────────────┐│
│  │ (선 그래프 - 시간별 점수 변화) ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

#### 기능 명세

**실시간 입력**
```
- textarea, onChange 이벤트
- 750ms 디바운싱
- 자동으로 API 호출
```

**실시간 결과 표시**
```
- AI 확률 게이지 (동적 업데이트)
- 변화량 표시 (+5%, -3% 등)
- 피드백 메시지
```

**시간별 차트**
```
- Recharts 선 그래프
- X축: 시간 (최근 1시간)
- Y축: AI 확률 (0-100)
- 마우스 호버: 상세 정보
```

---

### 4️⃣ 모델 상태 페이지 (StatusPage)

#### 레이아웃
```
┌─────────────────────────────────────┐
│  헤더                                │
├─────────────────────────────────────┤
│  GPU 상태                            │
│  ┌────────────────┬────────────────┐│
│  │ GPU 0          │ GPU 1          ││
│  │ 49140MB 총     │ 49140MB 총     ││
│  │ ████████░░░░░░ │ ████░░░░░░░░░░ ││
│  │ 20GB 사용 (40%)│ 14GB 사용 (28%)││
│  │ 온도: 45°C    │ 온도: 42°C    ││
│  │ 전력: 120W    │ 전력: 85W     ││
│  └────────────────┴────────────────┘│
│                                     │
│  모델 상태                           │
│  ┌─────────────────────────────────┐│
│  │ 모델명 | 상태 | 메모리 | 추론수  ││
│  │ ─────────────────────────────── ││
│  │ Kanana | ✅ | 8GB | 1500회    ││
│  │ Gemma | ✅ | 12GB | 1500회   ││
│  │ Qwen3 | ✅ | 14GB | 1500회   ││
│  └─────────────────────────────────┘│
│                                     │
│  시스템 정보                         │
│  ├─ CPU 사용: 25%                  │
│  ├─ RAM 사용: 12% (15GB / 126GB)  │
│  └─ 업타임: 86400초                │
└─────────────────────────────────────┘
```

#### 기능 명세

**GPU 모니터링**
```
- 2개 GPU 상태 실시간 표시
- 메모리 사용량 게이지
- 온도, 전력 사용량
- 주기적 갱신 (5초마다)
```

**모델 상태**
```
- 로드 여부 (✅/❌)
- 메모리 사용량
- 누적 추론 횟수
- 마지막 추론 시간
```

---

## 컴포넌트 명세

### TextInput.tsx
```typescript
interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  maxLength: number;
  minLength: number;
  isLoading: boolean;
  disabled: boolean;
}

Features:
- 글자수 카운터
- 버튼 비활성화 조건
- 에러 메시지
- 붙여넣기 지원
```

### ResultDisplay.tsx
```typescript
interface ResultDisplayProps {
  ensemble_score: number;
  confidence: number;
  label: "AI_GENERATED" | "HUMAN_WRITTEN";
  models: {
    [key: string]: { score: number; confidence: number }
  };
  inferenceTime: number;
}

Features:
- 큰 텍스트로 최종 판정 표시
- 색상: AI (빨강), 인간 (초록)
- 신뢰도 게이지
- 모델별 점수 테이블
```

### SentenceHeatmap.tsx
```typescript
interface SentenceHeatmapProps {
  sentences: Array<{
    index: number;
    text: string;
    score: number;
    is_ai: boolean;
  }>;
  heatmap: number[];
}

Features:
- 문장별 배경색 (히트맵)
- 점수별 색상 그래디언트
- 의심 구간 강조
- 클릭 시 상세 정보
```

### ModelComparison.tsx
```typescript
interface ModelComparisonProps {
  models: {
    [key: string]: { score: number; confidence: number }
  };
}

Features:
- Recharts 레이더 차트
- 3개 모델 시각화
- 합의도 계산 및 표시
```

### FileUpload.tsx
```typescript
interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  disabled: boolean;
  maxFiles: number;
  maxFileSize: number;
  acceptedFormats: string[];
}

Features:
- Drag & Drop
- 클릭 파일 선택
- 파일 검증 (형식, 크기)
- 선택된 파일 목록 표시
- 파일 제거 기능
```

---

## 상태 관리

### React Query 사용

```typescript
// 판별 요청
const { data, isLoading, error } = useQuery({
  queryKey: ['predict', text],
  queryFn: () => api.predict(text),
  enabled: text.length >= 50,
})

// 배치 처리 상태 폴링
const { data: batchStatus } = useQuery({
  queryKey: ['batch', batchId],
  queryFn: () => api.getBatchStatus(batchId),
  refetchInterval: 1000,  // 1초마다
  enabled: batchStatus?.status === 'PROCESSING',
})

// 모델 상태
const { data: modelStatus } = useQuery({
  queryKey: ['models'],
  queryFn: () => api.getModelStatus(),
  refetchInterval: 5000,  // 5초마다
})
```

### Custom Hooks

```typescript
// usePrediction.ts
function usePrediction() {
  const [text, setText] = useState('');
  const mutation = useMutation({
    mutationFn: (text) => api.predict(text),
  });

  return { text, setText, predict: mutation.mutate, ... };
}

// useBatch.ts
function useBatch() {
  const [files, setFiles] = useState<File[]>([]);
  const uploadMutation = useMutation({
    mutationFn: (files) => api.uploadBatch(files),
  });

  return { files, setFiles, uploadBatch: uploadMutation.mutate, ... };
}
```

---

## 스타일링

### TailwindCSS 설정
```
- 기본 컬러:
  - 주색 (Primary): Indigo-600
  - 성공 (Success): Green-600
  - 경고 (Warning): Yellow-500
  - 에러 (Error): Red-600

- 타이포그래피:
  - 제목: Font-bold, Size-xl ~ Size-3xl
  - 본문: Font-normal, Size-sm ~ Size-base
  - 캡션: Font-light, Size-xs

- 간격:
  - 섹션: Gap-8
  - 컴포넌트: Gap-4
  - 요소: Gap-2
```

### 반응형 디자인
```
- Mobile First (모바일 우선)
- Breakpoints:
  - sm: 640px
  - md: 768px
  - lg: 1024px
  - xl: 1280px

- 레이아웃:
  - 모바일 (< 768px): 단일 열
  - 태블릿 (768px-1024px): 2열
  - 데스크톱 (> 1024px): 2열 또는 3열
```

---

## API 통합

### API 클라이언트 (api.ts)

```typescript
const api = {
  predict: (text: string) => {
    return axios.post('/api/predict', { text });
  },

  analyze: (text: string) => {
    return axios.post('/api/analyze', { text });
  },

  uploadBatch: (files: File[]) => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    return axios.post('/api/batch/upload', formData);
  },

  getBatchStatus: (batchId: string) => {
    return axios.get(`/api/batch/${batchId}`);
  },

  downloadReport: (batchId: string, format: 'csv' | 'xlsx') => {
    return axios.get(`/api/batch/${batchId}/download`, {
      params: { format },
      responseType: 'blob'
    });
  },

  getModelStatus: () => {
    return axios.get('/api/models/status');
  }
};
```

### 에러 처리
```typescript
.catch((error) => {
  if (error.response?.status === 400) {
    // 입력 검증 에러
    showError(error.response.data.error.message);
  } else if (error.response?.status === 503) {
    // 서버 오류
    showError('모델이 준비 중입니다. 잠시 후 다시 시도하세요.');
  } else {
    showError('요청 중 오류가 발생했습니다.');
  }
});
```

---

## 마치며

이 프론트엔드 스펙은 다음을 기준으로 설계되었습니다:
- ✅ 직관적인 UI/UX
- ✅ 반응형 디자인
- ✅ 빠른 성능 (React Query + 캐싱)
- ✅ 접근성 (시멘틱 HTML + ARIA)
