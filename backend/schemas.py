from pydantic import BaseModel, Field, field_validator

class PredictRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4096)

    @field_validator('text')
    def text_not_empty(cls, v):
        if not v.strip():
            raise ValueError('Text cannot be empty')
        return v

class PredictResponse(BaseModel):
    text: str
    ai_probability: float = Field(..., ge=0.0, le=1.0)
    prediction: str  # "AI 생성" or "사람 작성"
    confidence: str  # "높음", "중간", "낮음"
    char_count: int  # 입력 텍스트 글자 수

class SentenceAnalysisRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4096)

class OverallAnalysis(BaseModel):
    full_text_probability: float = Field(..., ge=0.0, le=1.0)
    prediction: str  # "AI 생성" or "사람 작성"
    confidence: str  # "높음", "중간", "낮음"

class SentenceAnalysisResponse(BaseModel):
    overall_analysis: OverallAnalysis  # 전체 텍스트 평가
    paragraph_analysis: list[dict]  # [{"text": "문단", "ai_probability": 0.85}, ...]
    paragraph_average: float  # 문단별 평균 (참고용)

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    gpu_available: bool
