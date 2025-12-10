from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import logging
import torch
import re

from config import settings
from schemas import PredictRequest, PredictResponse, HealthResponse, SentenceAnalysisRequest, SentenceAnalysisResponse, OverallAnalysis
from model import detector

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(
    title="AI Text Detection API",
    description="KANANA-1.5-8B based AI-generated text detector",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Load model on startup"""
    logger.info("Starting up API server...")
    detector.load_model()
    logger.info("API server ready")

@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        model_loaded=detector.model is not None,
        gpu_available=torch.cuda.is_available()
    )

@app.post("/api/predict", response_model=PredictResponse)
async def predict(request: PredictRequest):
    """Predict AI generation probability"""
    try:
        result = detector.predict(request.text)
        return PredictResponse(
            text=request.text[:100] + "..." if len(request.text) > 100 else request.text,
            ai_probability=result["ai_probability"],
            prediction=result["prediction"],
            confidence=result["confidence"],
            char_count=len(request.text)
        )
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail="Prediction failed")

@app.post("/api/analyze-sentences", response_model=SentenceAnalysisResponse)
async def analyze_sentences(request: SentenceAnalysisRequest):
    """Analyze text paragraph by paragraph (배치 처리)"""
    try:
        # 1. 전체 텍스트 평가 (한 번에)
        full_result = detector.predict(request.text)

        # 2. 문단 분리 (빈 줄 기준 - 두 번 이상의 연속 줄바꿈)
        paragraphs = re.split(r'\n\s*\n', request.text)
        paragraphs = [p.strip() for p in paragraphs if p.strip()]

        # 3. 문단별 배치 처리
        paragraph_probs = detector.predict_batch(paragraphs)

        paragraph_analysis = [
            {"text": para, "ai_probability": prob}
            for para, prob in zip(paragraphs, paragraph_probs)
        ]

        paragraph_avg = sum(paragraph_probs) / len(paragraph_probs) if paragraph_probs else 0.0

        # 4. 전체 평가 결과 구성
        overall_analysis = OverallAnalysis(
            full_text_probability=full_result["ai_probability"],
            prediction=full_result["prediction"],
            confidence=full_result["confidence"]
        )

        return SentenceAnalysisResponse(
            overall_analysis=overall_analysis,
            paragraph_analysis=paragraph_analysis,
            paragraph_average=paragraph_avg
        )
    except Exception as e:
        logger.error(f"Paragraph analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail="Analysis failed")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
