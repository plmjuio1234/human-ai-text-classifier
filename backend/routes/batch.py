"""
배치 분석 라우터 - 다중 파일 업로드 및 분석
"""

import logging
import asyncio
import tempfile
from pathlib import Path
from typing import List
import time

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
import pandas as pd
import io

from backend.utils.file_parser import FileParser
from backend.utils.batch_manager import BatchManager, FileResult
from backend.utils.model_loader import ModelManager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/batch", tags=["Batch Analysis"])


def create_success_response(data):
    """성공 응답 생성"""
    from datetime import datetime
    return {
        "status": "success",
        "data": data,
        "timestamp": datetime.utcnow().isoformat(),
    }


def create_error_response(code: str, message: str, details=None):
    """에러 응답 생성"""
    from datetime import datetime
    return {
        "status": "error",
        "error": {
            "code": code,
            "message": message,
            "details": details or {},
        },
        "timestamp": datetime.utcnow().isoformat(),
    }


# ============================================================
# 1. POST /api/batch/upload - 파일 업로드
# ============================================================

@router.post("/upload")
async def batch_upload(files: List[UploadFile] = File(...)):
    """
    다중 파일 업로드 및 배치 분석 시작

    - 최대 10개 파일
    - 각 파일 최대 50MB
    - 지원 형식: TXT, PDF, DOCX
    """
    # main.py에서 주입된 model_manager 사용
    from backend import main as main_module
    model_mgr = main_module.model_manager

    if model_mgr is None:
        return create_error_response(
            "MODEL_NOT_LOADED",
            "모델이 아직 로드되지 않았습니다",
        )

    try:
        # 파일 개수 확인
        if len(files) > 10:
            raise ValueError("최대 10개 파일까지 업로드 가능합니다")

        if len(files) == 0:
            raise ValueError("최소 1개 파일을 업로드해야 합니다")

        # 파일 검증 및 내용 읽기 (UploadFile이 닫히기 전에)
        file_data = []
        for file in files:
            if not file.filename:
                raise ValueError("파일명이 없는 파일이 있습니다")

            file_ext = Path(file.filename).suffix.lower()
            if file_ext not in {'.txt', '.pdf', '.docx'}:
                raise ValueError(
                    f"지원하지 않는 파일 형식: {file_ext}. "
                    f"지원: .txt, .pdf, .docx"
                )

            # 파일 내용을 읽기 (바이트로 읽음)
            # SpooledTemporaryFile을 사용하는 UploadFile은 동기적으로 읽을 수 있음
            file.file.seek(0)  # 파일 포인터를 시작으로
            content = file.file.read()
            file_data.append({
                "filename": file.filename,
                "content": content,
            })

        # 배치 생성
        batch_id = BatchManager.create_batch(len(file_data))
        BatchManager.start_batch(batch_id)

        # 백그라운드 작업 시작
        asyncio.create_task(
            process_batch_background(batch_id, file_data, model_mgr)
        )

        # 예상 처리 시간 계산 (파일당 약 3-5초)
        estimated_seconds = len(file_data) * 4

        return create_success_response({
            "batch_id": batch_id,
            "status": "PROCESSING",
            "file_count": len(file_data),
            "estimated_time_seconds": estimated_seconds,
            "status_url": f"/api/batch/{batch_id}",
        })

    except ValueError as e:
        return create_error_response(
            "INVALID_INPUT",
            str(e),
            {"allowed_formats": ["txt", "pdf", "docx"], "max_files": 10},
        )
    except Exception as e:
        logger.error(f"배치 업로드 오류: {str(e)}")
        return create_error_response("UPLOAD_FAILED", str(e))


# ============================================================
# 2. GET /api/batch/{batch_id} - 상태 조회
# ============================================================

@router.get("/{batch_id}")
async def batch_status(batch_id: str):
    """배치 처리 상태 조회"""
    try:
        batch_info = BatchManager.get_batch_status(batch_id)

        if batch_info is None:
            raise HTTPException(
                status_code=404,
                detail=create_error_response(
                    "BATCH_NOT_FOUND",
                    f"배치를 찾을 수 없음: {batch_id}",
                ),
            )

        return create_success_response(batch_info)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"배치 상태 조회 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 3. GET /api/batch/{batch_id}/download - 결과 다운로드
# ============================================================

@router.get("/{batch_id}/download")
async def batch_download(batch_id: str, format: str = "csv"):
    """
    배치 분석 결과를 CSV 또는 Excel로 다운로드

    - **format**: 'csv' (기본) 또는 'xlsx'
    """
    try:
        batch_info = BatchManager.get_batch_info(batch_id)

        if batch_info is None:
            raise HTTPException(
                status_code=404,
                detail=create_error_response(
                    "BATCH_NOT_FOUND",
                    f"배치를 찾을 수 없음: {batch_id}",
                ),
            )

        # 완료된 배치만 다운로드 가능
        from backend.utils.batch_manager import BatchStatus
        if batch_info.status != BatchStatus.COMPLETED:
            raise HTTPException(
                status_code=400,
                detail=create_error_response(
                    "BATCH_NOT_COMPLETED",
                    f"배치가 아직 완료되지 않았습니다. 상태: {batch_info.status.value}",
                ),
            )

        # 결과 데이터 준비
        data = []
        for result in batch_info.results:
            data.append({
                "파일명": result.filename,
                "AI확률": result.ai_score,
                "판정": result.label,
                "신뢰도": result.confidence,
                "분석문장": result.sentences_analyzed,
                "처리시간(ms)": result.processing_time_ms,
                "분석일시": result.timestamp,
            })

        df = pd.DataFrame(data)

        # 파일 형식별 생성
        if format == "xlsx":
            # Excel 파일 생성
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, index=False, sheet_name='Results')
            output.seek(0)

            return StreamingResponse(
                iter([output.getvalue()]),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={
                    "Content-Disposition": f"attachment; filename={batch_id}.xlsx",
                },
            )
        else:  # csv (기본)
            csv_output = df.to_csv(index=False)
            return StreamingResponse(
                iter([csv_output]),
                media_type="text/csv",
                headers={
                    "Content-Disposition": f"attachment; filename={batch_id}.csv",
                },
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"배치 다운로드 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 백그라운드 작업 - 배치 처리
# ============================================================

async def process_batch_background(batch_id: str, file_data: List[dict], model_mgr):
    """배치 처리를 백그라운드에서 실행"""
    try:
        temp_dir = tempfile.TemporaryDirectory()

        for file_item in file_data:
            try:
                filename = file_item["filename"]
                content = file_item["content"]
                logger.info(f"📄 파일 처리 중: {filename}")
                start_time = time.time()

                # 임시 파일로 저장
                temp_path = Path(temp_dir.name) / filename
                temp_path.write_bytes(content)

                # 파일 파싱
                text, file_format = FileParser.parse(str(temp_path))

                # 모델로 추론
                score, confidence, _ = model_mgr.predict("kanana", text)

                # 문장 분석
                import re
                sentences = re.split(r'[.!?]+', text)
                sentences = [s.strip() for s in sentences if s.strip()]
                sentence_count = len(sentences)

                processing_time_ms = int((time.time() - start_time) * 1000)
                label = "AI_GENERATED" if score >= 50 else "HUMAN_WRITTEN"

                # 결과 저장
                result = FileResult(
                    filename=filename,
                    ai_score=score,
                    confidence=round(confidence, 3),
                    label=label,
                    sentences_analyzed=sentence_count,
                    processing_time_ms=processing_time_ms,
                    timestamp=pd.Timestamp.now().isoformat(),
                )

                BatchManager.add_result(batch_id, result)

            except Exception as e:
                logger.error(f"파일 처리 실패: {filename} - {str(e)}")

                result = FileResult(
                    filename=filename,
                    ai_score=0,
                    confidence=0.0,
                    label="ERROR",
                    sentences_analyzed=0,
                    processing_time_ms=0,
                    timestamp=pd.Timestamp.now().isoformat(),
                    error=str(e),
                )

                BatchManager.add_result(batch_id, result)

        # 배치 완료
        BatchManager.complete_batch(batch_id)

    except Exception as e:
        logger.error(f"배치 처리 실패: {batch_id} - {str(e)}")
        BatchManager.fail_batch(batch_id, str(e))

    finally:
        temp_dir.cleanup()
