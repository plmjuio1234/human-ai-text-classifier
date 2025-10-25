"""
FastAPI 백엔드 서버 - AI vs Human 텍스트 판별 시스템

주요 기능:
- 3개 모델 앙상블 (Kanana, Gemma, Qwen3)
- 단일 텍스트 분석
- 문장별 상세 분석
- 배치 파일 분석
- 모델 및 GPU 상태 모니터링
"""

import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Dict, List, Any
import psutil

from fastapi import FastAPI, HTTPException, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import torch

# 로컬 임포트
from backend.schemas import (
    PredictRequest, PredictResponse,
    AnalyzeRequest, AnalyzeResponse,
    HealthCheckResponse, ModelHealthStatus, GPUStatus, GPUMemoryStatus,
    SentenceAnalysis, CharRange,
    ErrorResponse, ErrorDetail,
)
from backend.utils.model_loader import ModelManager
from backend.routes import batch as batch_routes

# ============================================================
# 로깅 설정
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('backend/logs/server.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ============================================================
# 전역 변수
# ============================================================

model_manager: ModelManager = None
app_start_time: datetime = None


# ============================================================
# 라이프사이클 관리
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI 애플리케이션 라이프사이클"""
    global model_manager, app_start_time

    logger.info("=" * 60)
    logger.info("FastAPI 서버 시작 중...")
    logger.info("=" * 60)

    # 시작
    app_start_time = datetime.utcnow()

    # 모델 로드
    model_manager = ModelManager()
    all_loaded = model_manager.load_all_models()

    if not all_loaded:
        logger.warning("⚠️ 일부 모델 로드 실패. 서버 계속 실행 (사용 불가 모델 제외)")

    logger.info("✅ 서버 시작 완료")
    logger.info("=" * 60)

    yield

    # 종료
    logger.info("=" * 60)
    logger.info("FastAPI 서버 종료 중...")
    logger.info("=" * 60)
    model_manager.cleanup()
    logger.info("✅ 서버 종료 완료")
    logger.info("=" * 60)


# ============================================================
# FastAPI 애플리케이션 초기화
# ============================================================

app = FastAPI(
    title="AI vs Human Text Detection API",
    description="AI 생성 텍스트 vs 인간 작성 텍스트 판별 시스템",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS 미들웨어
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(batch_routes.router)


# ============================================================
# 예외 핸들러 (에러 처리 & 로깅)
# ============================================================

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Pydantic 검증 에러를 표준 형식으로 변환"""
    error_details = []
    for error in exc.errors():
        field = ".".join(str(x) for x in error["loc"][1:]) if len(error["loc"]) > 1 else str(error["loc"])
        error_details.append(f"{field}: {error['msg']}")

    error_message = " | ".join(error_details) if error_details else "입력값 검증 실패"
    logger.warning(f"⚠️ 검증 에러: {request.method} {request.url.path} - {error_message}")

    return JSONResponse(
        status_code=422,
        content={
            "status": "error",
            "error": {
                "code": "VALIDATION_ERROR",
                "message": error_message,
                "details": {"field_errors": [str(e) for e in exc.errors()]}
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """HTTP 예외 처리 (로깅 포함)"""
    logger.warning(f"⚠️ HTTP {exc.status_code}: {request.method} {request.url.path} - {exc.detail}")

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": str(exc.detail),
                "details": {}
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """일반 예외 처리 (에러 로깅)"""
    logger.error(f"❌ 예기치 않은 에러: {request.method} {request.url.path} - {str(exc)}", exc_info=True)

    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "내부 서버 에러가 발생했습니다",
                "details": {"error_type": type(exc).__name__}
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    )


# ============================================================
# 유틸리티 함수
# ============================================================

def get_system_uptime() -> int:
    """시스템 업타임(초)"""
    global app_start_time
    if app_start_time:
        return int((datetime.utcnow() - app_start_time).total_seconds())
    return 0


def create_success_response(data: Dict[str, Any]) -> Dict[str, Any]:
    """성공 응답 생성"""
    return {
        "status": "success",
        "data": data,
        "timestamp": datetime.utcnow().isoformat(),
    }


def create_error_response(code: str, message: str, details: Dict[str, Any] = None) -> Dict[str, Any]:
    """에러 응답 생성"""
    return {
        "status": "error",
        "error": {
            "code": code,
            "message": message,
            "details": details or {},
        },
        "timestamp": datetime.utcnow().isoformat(),
    }


def ensemble_predict(text: str) -> tuple[int, float]:
    """3개 모델의 예측을 앙상블로 결합"""
    scores = []
    confidences = []

    for model_name in ["kanana", "gemma", "qwen3"]:
        try:
            score, confidence, _ = model_manager.predict(model_name, text)
            scores.append(score)
            confidences.append(confidence)
        except Exception as e:
            logger.error(f"[{model_name}] 예측 실패: {str(e)}")
            continue

    if not scores:
        raise ValueError("모든 모델 예측 실패")

    # 앙상블: 평균
    ensemble_score = int(sum(scores) / len(scores))
    ensemble_confidence = sum(confidences) / len(confidences)

    return ensemble_score, ensemble_confidence


# ============================================================
# 1. Health Check 엔드포인트
# ============================================================

@app.get("/health", tags=["Health"])
async def health_check() -> Dict[str, Any]:
    """서버 건강 상태 확인"""
    global model_manager

    if model_manager is None:
        raise HTTPException(status_code=503, detail="모델이 아직 로드되지 않음")

    try:
        # 모델 상태 확인
        model_status = model_manager.get_model_status()
        models_status = {
            "kanana": "ready" if model_status["kanana"]["loaded"] else "error",
            "gemma": "ready" if model_status["gemma"]["loaded"] else "error",
            "qwen3": "ready" if model_status["qwen3"]["loaded"] else "error",
        }

        # GPU 상태 확인
        gpu_status_list = model_manager.get_gpu_status()
        gpu_memory = {
            "gpu_0": f"{gpu_status_list[0]['used_memory_mb']}MB / {gpu_status_list[0]['total_memory_mb']}MB",
            "gpu_1": f"{gpu_status_list[1]['used_memory_mb']}MB / {gpu_status_list[1]['total_memory_mb']}MB",
        }

        return create_success_response({
            "status": "healthy",
            "models": models_status,
            "gpu": {
                "available": torch.cuda.is_available(),
                "memory_usage": gpu_memory,
            }
        })

    except Exception as e:
        logger.error(f"Health check 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 2. 단일 텍스트 판별 - /api/predict
# ============================================================

@app.post("/api/predict", tags=["Prediction"])
async def predict(request: PredictRequest) -> Dict[str, Any]:
    """
    단일 텍스트의 AI 생성 여부 판별

    - **text**: 분석할 텍스트 (50-5000자)
    - **include_metadata**: 상세 메타데이터 포함 여부 (default: False)
    """
    global model_manager

    if model_manager is None:
        raise HTTPException(status_code=503, detail="모델이 아직 로드되지 않음")

    try:
        import time
        start_time = time.time()

        # 병렬 추론으로 3개 모델 동시 실행
        ensemble_score, ensemble_confidence, ensemble_output = model_manager.predict_ensemble_parallel(request.text)

        # 응답 포맷으로 변환
        predictions = ensemble_output.get("predictions", {})
        if not request.include_metadata:
            for model_name in predictions:
                predictions[model_name]["raw_output"] = None

        actual_inference_time = ensemble_output.get("inference_time_ms", 0)

        # 레이블 결정 (threshold: 50%)
        label = "AI_GENERATED" if ensemble_score >= 50 else "HUMAN_WRITTEN"

        # model_scores 배열로 변환
        model_scores = [
            {
                "model_name": model_name,
                "ai_score": predictions[model_name]["score"],
                "confidence": round(predictions[model_name]["confidence"], 3),
                "processing_time_ms": int(actual_inference_time / 3)  # 대략적 분산
            }
            for model_name in predictions
        ]

        return create_success_response({
            "text": request.text,
            "ai_score": ensemble_score,
            "confidence": round(ensemble_confidence, 3),
            "label": label,
            "model_scores": model_scores,
            "sentences_analyzed": len(request.text.split('.')),
            "processing_time_ms": actual_inference_time,
        })

    except ValueError as e:
        return JSONResponse(
            status_code=400,
            content=create_error_response(
                "INVALID_INPUT",
                str(e),
                {"min_length": 50, "max_length": 5000}
            )
        )
    except Exception as e:
        logger.error(f"Predict 엔드포인트 오류: {str(e)}")
        return JSONResponse(
            status_code=500,
            content=create_error_response("INFERENCE_FAILED", str(e))
        )


# ============================================================
# 3. 문장별 상세 분석 - /api/analyze
# ============================================================

@app.post("/api/analyze", tags=["Analysis"])
async def analyze(request: AnalyzeRequest) -> Dict[str, Any]:
    """
    텍스트를 문장 단위로 분석

    - **text**: 분석할 텍스트 (50-5000자)
    - **threshold**: AI 판정 임계값 (0-100, default: 50)
    """
    global model_manager

    if model_manager is None:
        raise HTTPException(status_code=503, detail="모델이 아직 로드되지 않음")

    try:
        import time
        import re
        start_time = time.time()

        # 문장 분리 (간단한 정규식 사용)
        sentences = re.split(r'[.!?]+', request.text)
        sentences = [s.strip() for s in sentences if s.strip()]

        if not sentences:
            raise ValueError("분석 가능한 문장이 없습니다")

        # 각 문장 분석
        sentence_analyses = []
        scores_list = []
        char_pos = 0

        for idx, sentence in enumerate(sentences):
            try:
                score, confidence, _ = model_manager.predict(
                    "kanana", sentence
                )  # 대표 모델 사용
                is_ai = score >= request.threshold

                sentence_analyses.append({
                    "index": idx,
                    "text": sentence,
                    "score": score,
                    "confidence": round(confidence, 3),
                    "is_ai": is_ai,
                    "char_range": {
                        "start": char_pos,
                        "end": char_pos + len(sentence),
                    }
                })
                scores_list.append(score)
                char_pos += len(sentence) + 1

            except Exception as e:
                logger.warning(f"문장 {idx} 분석 실패: {str(e)}")
                continue

        if not sentence_analyses:
            raise ValueError("문장 분석 실패")

        # 통계
        overall_score = int(sum(scores_list) / len(scores_list))
        ai_sentence_count = sum(1 for s in sentence_analyses if s["is_ai"])
        ai_percentage = (ai_sentence_count / len(sentence_analyses)) * 100

        inference_time_ms = int((time.time() - start_time) * 1000)

        return create_success_response({
            "text": request.text,
            "overall_score": overall_score,
            "sentences": sentence_analyses,
            "heatmap": scores_list,
            "ai_sentence_count": ai_sentence_count,
            "ai_sentence_percentage": round(ai_percentage, 1),
            "inference_time_ms": inference_time_ms,
        })

    except Exception as e:
        logger.error(f"Analyze 엔드포인트 오류: {str(e)}")
        return JSONResponse(
            status_code=500,
            content=create_error_response("INFERENCE_FAILED", str(e))
        )


# ============================================================
# 4. 모델 상태 조회 - /api/models/status
# ============================================================

@app.get("/api/models/status", tags=["Models"])
async def models_status() -> Dict[str, Any]:
    """
    현재 로드된 모델들의 상태 및 GPU 정보 조회
    """
    global model_manager

    if model_manager is None:
        raise HTTPException(status_code=503, detail="모델이 아직 로드되지 않음")

    try:
        # 모델 상태
        model_status = model_manager.get_model_status()
        models_list = [model_status[name] for name in ["kanana", "gemma", "qwen3"]]

        # 프론트엔드 타입에 맞게 변환
        models_info = []
        for model in models_list:
            models_info.append({
                "name": model.get("name"),
                "loaded": model.get("loaded", False),
                "load_time_seconds": model.get("load_time_seconds"),
                "status": model.get("status"),
                "device": model.get("device"),
                "parameters": model.get("parameters"),
                "quantization": model.get("quantization"),
                "load_time_ms": model.get("load_time_ms"),
                "memory_mb": model.get("memory_mb"),
            })

        # total_memory_mb 계산
        total_memory_mb = sum(model.get("memory_mb", 0) for model in models_list)

        # inference_available: 모든 모델이 로드되어야 가능
        inference_available = all(model.get("loaded", False) for model in models_list)

        return create_success_response({
            "models": models_info,
            "total_memory_mb": total_memory_mb,
            "inference_available": inference_available,
            "batch_available": True,
        })

    except Exception as e:
        logger.error(f"Models status 엔드포인트 오류: {str(e)}")
        return JSONResponse(
            status_code=500,
            content=create_error_response("FAILED", str(e))
        )


# ============================================================
# 5. 루트 엔드포인트
# ============================================================

@app.get("/", tags=["Info"])
async def root():
    """API 정보"""
    return {
        "title": "AI vs Human Text Detection API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/health",
    }


# ============================================================
# 에러 핸들러
# ============================================================

@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    return JSONResponse(
        status_code=400,
        content=create_error_response("INVALID_INPUT", str(exc))
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"예상 외 오류: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content=create_error_response("INTERNAL_SERVER_ERROR", str(exc))
    )


# ============================================================
# 실행
# ============================================================

if __name__ == "__main__":
    import uvicorn

    logger.info("FastAPI 서버 시작...")
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info",
    )
