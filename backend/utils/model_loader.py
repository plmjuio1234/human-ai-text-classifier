"""
모델 로드 및 관리 유틸리티
"""

import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
import logging
from typing import Dict, Any, Tuple, List
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)


class ModelManager:
    """3개 모델을 관리하는 클래스"""

    MODEL_CONFIG = {
        "kanana": {
            "model_id": "kakaocorp/kanana-1.5-8b-instruct-2505",
            "device": "cuda:0",
            "expected_memory_gb": 8,
        },
        "gemma": {
            "model_id": "google/gemma-3-12b-it",
            "device": "cuda:0",
            "expected_memory_gb": 12,
        },
        "qwen3": {
            "model_id": "Qwen/Qwen3-14B",
            "device": "cuda:1",
            "expected_memory_gb": 14,
        },
    }

    def __init__(self):
        self.models: Dict[str, Any] = {}
        self.tokenizers: Dict[str, Any] = {}
        self.model_stats: Dict[str, Dict[str, Any]] = {}
        self.quantization_config = BitsAndBytesConfig(
            load_in_8bit=True,
            llm_int8_threshold=6.0,
        )

    def load_all_models(self) -> bool:
        """모든 모델 로드"""
        logger.info("모델 로드 시작...")
        all_loaded = True

        for model_name, config in self.MODEL_CONFIG.items():
            try:
                logger.info(f"[{model_name}] 로드 중...")
                self._load_model(model_name, config)
                self.model_stats[model_name] = {
                    "loaded": True,
                    "inference_count": 0,
                    "last_inference_time_ms": 0,
                    "total_inference_time_ms": 0,
                }
                logger.info(f"✅ [{model_name}] 로드 완료")
            except Exception as e:
                logger.error(f"❌ [{model_name}] 로드 실패: {str(e)}")
                self.model_stats[model_name] = {
                    "loaded": False,
                    "error": str(e),
                }
                all_loaded = False

        return all_loaded

    def _load_model(self, model_name: str, config: Dict[str, Any]):
        """개별 모델 로드"""
        # 토크나이저 로드
        tokenizer = AutoTokenizer.from_pretrained(
            config["model_id"],
            trust_remote_code=True,
        )
        self.tokenizers[model_name] = tokenizer

        # 모델 로드
        model = AutoModelForCausalLM.from_pretrained(
            config["model_id"],
            device_map=config["device"],
            quantization_config=self.quantization_config,
            torch_dtype=torch.float16,
            trust_remote_code=True,
        )
        self.models[model_name] = model

    def predict(self, model_name: str, text: str) -> Tuple[int, float, Dict[str, Any]]:
        """
        모델로 추론 수행

        Returns:
            (score: 0-100, confidence: 0-1, raw_output: dict)
        """
        if model_name not in self.models:
            raise ValueError(f"모델을 찾을 수 없음: {model_name}")

        model = self.models[model_name]
        tokenizer = self.tokenizers[model_name]
        device = self.MODEL_CONFIG[model_name]["device"]

        start_time = time.time()

        try:
            # 토큰화
            inputs = tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                max_length=512
            )
            inputs = {k: v.to(device) for k, v in inputs.items()}

            # 추론 (logits only)
            with torch.no_grad():
                outputs = model(**inputs)
                logits = outputs.logits

            # 간단한 점수 계산 (실제로는 더 복잡한 후처리 필요)
            # AI 확률을 0-100으로 정규화
            last_token_logits = logits[0, -1, :]

            # NaN 체크
            if torch.isnan(last_token_logits).any():
                logger.warning(f"[{model_name}] NaN detected in logits, using fallback")
                score = 50
                confidence = 0.5
                top_prob = 0.5
            else:
                probs = torch.softmax(last_token_logits, dim=-1)
                top_prob = probs.max().item()

                # NaN 체크 (softmax 결과)
                if not (-1 <= top_prob <= 1) or top_prob != top_prob:  # NaN or out of range
                    logger.warning(f"[{model_name}] Invalid probability {top_prob}, using fallback")
                    score = 50
                    confidence = 0.5
                    top_prob = 0.5
                else:
                    score = int(top_prob * 100)
                    confidence = min(top_prob + 0.1, 1.0)  # 신뢰도 계산

            inference_time_ms = int((time.time() - start_time) * 1000)

            # 통계 업데이트
            self.model_stats[model_name]["inference_count"] += 1
            self.model_stats[model_name]["last_inference_time_ms"] = inference_time_ms
            self.model_stats[model_name]["total_inference_time_ms"] += inference_time_ms

            return score, confidence, {
                "logits_shape": str(logits.shape),
                "top_prob": round(top_prob, 4),
            }

        except Exception as e:
            logger.error(f"[{model_name}] 추론 실패: {str(e)}")
            raise

    def get_model_status(self) -> Dict[str, Any]:
        """모델 상태 반환"""
        status = {}
        for model_name, config in self.MODEL_CONFIG.items():
            stats = self.model_stats.get(model_name, {})
            status[model_name] = {
                "name": model_name,
                "model_id": config["model_id"],
                "parameters": self._get_param_count(model_name),
                "loaded": stats.get("loaded", False),
                "device": config["device"],
                "quantization": "8bit",
                "memory_mb": int(config["expected_memory_gb"] * 1024),
                "status": "ready" if stats.get("loaded") else "error",
                "last_inference_ms": stats.get("last_inference_time_ms", 0),
                "inference_count": stats.get("inference_count", 0),
            }
        return status

    def _get_param_count(self, model_name: str) -> int:
        """모델 파라미터 수"""
        if model_name not in self.models:
            return 0
        model = self.models[model_name]
        return sum(p.numel() for p in model.parameters())

    def predict_ensemble_parallel(self, text: str) -> Tuple[int, float, Dict[str, Any]]:
        """
        3개 모델의 예측을 병렬로 실행 (asyncio 기반)

        Returns:
            (ensemble_score: 0-100, ensemble_confidence: 0-1, predictions: dict)
        """
        start_time = time.time()

        # ThreadPoolExecutor를 사용한 병렬 실행
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {}
            for model_name in ["kanana", "gemma", "qwen3"]:
                try:
                    future = executor.submit(self.predict, model_name, text)
                    futures[model_name] = future
                except Exception as e:
                    logger.error(f"[{model_name}] 병렬 예측 제출 실패: {str(e)}")
                    futures[model_name] = None

            # 모든 결과 수집
            predictions = {}
            scores = []
            confidences = []

            for model_name, future in futures.items():
                try:
                    if future is not None:
                        score, confidence, raw = future.result(timeout=5)
                        predictions[model_name] = {
                            "score": score,
                            "confidence": confidence,
                            "raw_output": raw,
                        }
                        scores.append(score)
                        confidences.append(confidence)
                    else:
                        predictions[model_name] = {
                            "score": 50,
                            "confidence": 0.5,
                            "raw_output": {"error": "실행 실패"},
                        }
                except Exception as e:
                    logger.error(f"[{model_name}] 결과 수집 실패: {str(e)}")
                    predictions[model_name] = {
                        "score": 50,
                        "confidence": 0.5,
                        "raw_output": {"error": str(e)},
                    }

        # 앙상블 점수 계산
        if scores:
            ensemble_score = int(sum(scores) / len(scores))
            ensemble_confidence = sum(confidences) / len(confidences)
        else:
            ensemble_score = 50
            ensemble_confidence = 0.5

        inference_time_ms = int((time.time() - start_time) * 1000)

        return ensemble_score, ensemble_confidence, {
            "predictions": predictions,
            "inference_time_ms": inference_time_ms,
            "parallel_execution": True,
        }

    def get_gpu_status(self) -> list:
        """GPU 상태 반환"""
        gpu_info = []
        for device_id in [0, 1]:
            try:
                total_memory = torch.cuda.get_device_properties(device_id).total_memory / 1e9
                used_memory = torch.cuda.memory_allocated(device_id) / 1e9
                free_memory = total_memory - used_memory

                gpu_info.append({
                    "device_id": device_id,
                    "name": f"NVIDIA RTX A6000",
                    "total_memory_mb": int(total_memory * 1024),
                    "used_memory_mb": int(used_memory * 1024),
                    "free_memory_mb": int(free_memory * 1024),
                    "temperature": 45.0,  # placeholder
                    "power_usage_w": 120.0,  # placeholder
                })
            except Exception as e:
                logger.warning(f"GPU {device_id} 상태 조회 실패: {str(e)}")

        return gpu_info

    def cleanup(self):
        """모델 메모리 정리"""
        logger.info("모델 정리 중...")
        for model_name in self.models:
            del self.models[model_name]
        self.models.clear()
        self.tokenizers.clear()
        torch.cuda.empty_cache()
        logger.info("✅ 정리 완료")
