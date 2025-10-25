"""
Pydantic 스키마 정의 - API 요청/응답 모델
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime


# ============================================================
# 공통 응답 스키마
# ============================================================

class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None


class SuccessResponse(BaseModel):
    status: str = "success"
    data: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ErrorResponse(BaseModel):
    status: str = "error"
    error: ErrorDetail
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ============================================================
# Health Check
# ============================================================

class ModelHealthStatus(BaseModel):
    kanana: str
    gemma: str
    qwen3: str


class GPUMemoryStatus(BaseModel):
    gpu_0: str
    gpu_1: str


class GPUStatus(BaseModel):
    available: bool
    memory_usage: GPUMemoryStatus


class HealthCheckResponse(BaseModel):
    status: str
    models: ModelHealthStatus
    gpu: GPUStatus


# ============================================================
# /api/predict - 단일 텍스트 판별
# ============================================================

class PredictRequest(BaseModel):
    text: str = Field(..., min_length=50, max_length=5000)
    include_metadata: bool = False

    @field_validator('text')
    @classmethod
    def validate_text(cls, v):
        if not v.strip():
            raise ValueError("텍스트는 빈칸이 아니어야 합니다")
        return v.strip()


class ModelScore(BaseModel):
    model_name: str
    ai_score: int = Field(..., ge=0, le=100)
    confidence: float = Field(..., ge=0, le=1)
    processing_time_ms: int


class PredictResponse(BaseModel):
    text: str
    ai_score: int = Field(..., ge=0, le=100)
    confidence: float = Field(..., ge=0, le=1)
    label: str  # "AI_GENERATED" or "HUMAN_WRITTEN"
    model_scores: list[ModelScore]
    sentences_analyzed: int = 0
    processing_time_ms: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ============================================================
# /api/analyze - 문장별 상세 분석
# ============================================================

class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=50, max_length=5000)
    threshold: int = Field(50, ge=0, le=100)

    @field_validator('text')
    @classmethod
    def validate_text(cls, v):
        if not v.strip():
            raise ValueError("텍스트는 빈칸이 아니어야 합니다")
        return v.strip()


class CharRange(BaseModel):
    start: int
    end: int


class SentenceAnalysis(BaseModel):
    index: int
    text: str
    score: int = Field(..., ge=0, le=100)
    confidence: float = Field(..., ge=0, le=1)
    is_ai: bool
    char_range: CharRange


class AnalyzeResponse(BaseModel):
    text: str
    overall_score: int = Field(..., ge=0, le=100)
    sentences: List[SentenceAnalysis]
    heatmap: List[int]
    ai_sentence_count: int
    ai_sentence_percentage: float
    inference_time_ms: int


# ============================================================
# /api/batch/* - 배치 분석
# ============================================================

class BatchUploadResponse(BaseModel):
    batch_id: str
    status: str  # "PROCESSING"
    file_count: int
    estimated_time_seconds: int
    status_url: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class BatchProgress(BaseModel):
    completed: int
    total: int
    percentage: int


class BatchProcessingResponse(BaseModel):
    batch_id: str
    status: str  # "PROCESSING"
    progress: BatchProgress
    started_at: datetime
    estimated_completion: datetime


class FileResult(BaseModel):
    filename: str
    ai_score: int = Field(..., ge=0, le=100)
    confidence: float = Field(..., ge=0, le=1)
    label: str
    sentences_analyzed: int
    processing_time_ms: int


class BatchSummary(BaseModel):
    total_files: int
    ai_files: int
    human_files: int
    average_score: float
    total_time_ms: int


class BatchCompletedResponse(BaseModel):
    batch_id: str
    status: str  # "COMPLETED"
    results: List[FileResult]
    summary: BatchSummary
    download_url: str
    completed_at: datetime


# ============================================================
# /api/models/status - 모델 상태
# ============================================================

class ModelInfo(BaseModel):
    name: str
    loaded: bool
    load_time_seconds: Optional[float] = None
    status: Optional[str] = None
    device: Optional[str] = None
    parameters: Optional[int] = None
    quantization: Optional[str] = None
    load_time_ms: Optional[int] = None
    memory_mb: Optional[int] = None


class ModelStatusResponse(BaseModel):
    models: List[ModelInfo]
    total_memory_mb: int
    inference_available: bool
    batch_available: bool = True
