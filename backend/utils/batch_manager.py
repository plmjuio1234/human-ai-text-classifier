"""
배치 분석 관리자 - 배치 작업 상태 관리 및 처리
"""

import logging
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any
from enum import Enum
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)


class BatchStatus(Enum):
    """배치 상태"""
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


@dataclass
class FileResult:
    """파일 분석 결과"""
    filename: str
    ai_score: int
    confidence: float
    label: str  # "AI_GENERATED" or "HUMAN_WRITTEN"
    sentences_analyzed: int
    processing_time_ms: int
    timestamp: str
    error: Optional[str] = None


@dataclass
class BatchInfo:
    """배치 정보"""
    batch_id: str
    status: BatchStatus
    file_count: int
    processed_count: int
    results: List[FileResult]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    error_message: Optional[str] = None

    def to_dict(self) -> dict:
        """딕셔너리로 변환"""
        return {
            "batch_id": self.batch_id,
            "status": self.status.value,
            "file_count": self.file_count,
            "processed_count": self.processed_count,
            "results": [asdict(r) for r in self.results],
            "created_at": self.created_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "error_message": self.error_message,
        }


class BatchManager:
    """배치 처리를 관리하는 싱글톤 클래스"""

    _instance = None
    _batches: Dict[str, BatchInfo] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(BatchManager, cls).__new__(cls)
        return cls._instance

    @classmethod
    def create_batch(cls, file_count: int) -> str:
        """
        새로운 배치 생성

        Args:
            file_count: 파일 개수

        Returns:
            batch_id
        """
        manager = cls()
        batch_id = f"batch_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"

        batch_info = BatchInfo(
            batch_id=batch_id,
            status=BatchStatus.PENDING,
            file_count=file_count,
            processed_count=0,
            results=[],
            created_at=datetime.utcnow(),
            started_at=None,
            completed_at=None,
        )

        manager._batches[batch_id] = batch_info
        logger.info(f"✅ 배치 생성: {batch_id} ({file_count}개 파일)")
        return batch_id

    @classmethod
    def start_batch(cls, batch_id: str) -> bool:
        """배치 처리 시작"""
        manager = cls()
        if batch_id not in manager._batches:
            logger.error(f"배치를 찾을 수 없음: {batch_id}")
            return False

        manager._batches[batch_id].status = BatchStatus.PROCESSING
        manager._batches[batch_id].started_at = datetime.utcnow()
        logger.info(f"🔄 배치 처리 시작: {batch_id}")
        return True

    @classmethod
    def add_result(cls, batch_id: str, result: FileResult) -> bool:
        """배치에 결과 추가"""
        manager = cls()
        if batch_id not in manager._batches:
            logger.error(f"배치를 찾을 수 없음: {batch_id}")
            return False

        batch = manager._batches[batch_id]
        batch.results.append(result)
        batch.processed_count += 1

        logger.info(
            f"✅ 파일 분석 완료: {batch_id} - {result.filename} "
            f"({batch.processed_count}/{batch.file_count})"
        )
        return True

    @classmethod
    def complete_batch(cls, batch_id: str) -> bool:
        """배치 처리 완료"""
        manager = cls()
        if batch_id not in manager._batches:
            logger.error(f"배치를 찾을 수 없음: {batch_id}")
            return False

        batch = manager._batches[batch_id]
        batch.status = BatchStatus.COMPLETED
        batch.completed_at = datetime.utcnow()

        duration_ms = (batch.completed_at - batch.started_at).total_seconds() * 1000 if batch.started_at else 0
        logger.info(f"✅ 배치 완료: {batch_id} ({duration_ms:.0f}ms)")
        return True

    @classmethod
    def fail_batch(cls, batch_id: str, error_message: str) -> bool:
        """배치 처리 실패"""
        manager = cls()
        if batch_id not in manager._batches:
            logger.error(f"배치를 찾을 수 없음: {batch_id}")
            return False

        batch = manager._batches[batch_id]
        batch.status = BatchStatus.FAILED
        batch.error_message = error_message
        batch.completed_at = datetime.utcnow()

        logger.error(f"❌ 배치 실패: {batch_id} - {error_message}")
        return True

    @classmethod
    def get_batch_info(cls, batch_id: str) -> Optional[BatchInfo]:
        """배치 정보 조회"""
        manager = cls()
        return manager._batches.get(batch_id)

    @classmethod
    def get_batch_status(cls, batch_id: str) -> Optional[Dict[str, Any]]:
        """배치 상태 조회 (응답 형식)"""
        batch_info = cls.get_batch_info(batch_id)
        if not batch_info:
            return None

        if batch_info.status == BatchStatus.PROCESSING:
            progress = (batch_info.processed_count / batch_info.file_count * 100) if batch_info.file_count > 0 else 0
            return {
                "batch_id": batch_info.batch_id,
                "status": batch_info.status.value,
                "progress": {
                    "completed": batch_info.processed_count,
                    "total": batch_info.file_count,
                    "percentage": int(progress),
                },
                "started_at": batch_info.started_at.isoformat() if batch_info.started_at else None,
            }
        elif batch_info.status == BatchStatus.COMPLETED:
            # 배치 결과 요약
            total_time_ms = int((batch_info.completed_at - batch_info.started_at).total_seconds() * 1000) if batch_info.started_at else 0
            ai_count = sum(1 for r in batch_info.results if r.label == "AI_GENERATED")
            avg_score = sum(r.ai_score for r in batch_info.results) / len(batch_info.results) if batch_info.results else 0

            return {
                "batch_id": batch_info.batch_id,
                "status": batch_info.status.value,
                "summary": {
                    "total_files": len(batch_info.results),
                    "ai_files": ai_count,
                    "human_files": len(batch_info.results) - ai_count,
                    "average_score": round(avg_score, 1),
                    "total_time_ms": total_time_ms,
                },
                "results": [asdict(r) for r in batch_info.results],
            }
        elif batch_info.status == BatchStatus.FAILED:
            return {
                "batch_id": batch_info.batch_id,
                "status": batch_info.status.value,
                "error_message": batch_info.error_message,
            }
        else:
            return {
                "batch_id": batch_info.batch_id,
                "status": batch_info.status.value,
            }

    @classmethod
    def get_batch_results(cls, batch_id: str) -> Optional[List[FileResult]]:
        """배치 결과 조회"""
        batch_info = cls.get_batch_info(batch_id)
        if batch_info and batch_info.status == BatchStatus.COMPLETED:
            return batch_info.results
        return None

    @classmethod
    def cleanup_old_batches(cls, days: int = 1) -> int:
        """오래된 배치 정리"""
        manager = cls()
        now = datetime.utcnow()
        removed_count = 0

        batch_ids_to_remove = [
            batch_id for batch_id, batch_info in manager._batches.items()
            if batch_info.status == BatchStatus.COMPLETED
            and (now - batch_info.completed_at).days >= days
        ]

        for batch_id in batch_ids_to_remove:
            del manager._batches[batch_id]
            removed_count += 1

        if removed_count > 0:
            logger.info(f"🧹 {removed_count}개 오래된 배치 정리")

        return removed_count
