import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification, BitsAndBytesConfig
from peft import PeftModel, PeftConfig
import logging
from config import settings

logger = logging.getLogger(__name__)

class AITextDetector:
    def __init__(self):
        self.model = None
        self.tokenizer = None

    def load_model(self):
        """Load KANANA model with LoRA adapter and 4-bit quantization"""
        logger.info("Loading model...")

        # Load LoRA config first to verify compatibility
        peft_config = PeftConfig.from_pretrained(settings.LORA_ADAPTER_PATH)
        logger.info(f"LoRA config loaded: r={peft_config.r}, alpha={peft_config.lora_alpha}")

        # Load tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(settings.LORA_ADAPTER_PATH)

        # 4-bit quantization config
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.bfloat16,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_use_double_quant=True
        )

        # Load base model with quantization
        base_model = AutoModelForSequenceClassification.from_pretrained(
            peft_config.base_model_name_or_path,  # Use config value
            num_labels=2,
            quantization_config=bnb_config,
            torch_dtype=torch.bfloat16,
            device_map="auto"  # Automatic device distribution
        )

        # Load LoRA adapter (automatically handles modules_to_save)
        self.model = PeftModel.from_pretrained(
            base_model,
            settings.LORA_ADAPTER_PATH,
            is_trainable=False
        )
        self.model.eval()

        logger.info("Model loaded successfully")
        logger.info(f"Device map: {self.model.hf_device_map}")

    def predict(self, text: str) -> dict:
        """Predict AI generation probability"""
        if self.model is None:
            raise RuntimeError("Model not loaded")

        # Tokenize
        inputs = self.tokenizer(
            text,
            truncation=True,
            max_length=settings.MAX_TEXT_LENGTH,
            return_tensors="pt"
        )
        # Note: No explicit .to(device) needed with device_map="auto"

        # Inference
        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits
            probs = torch.softmax(logits, dim=-1)
            ai_prob = probs[0, 1].item()  # Probability of class 1 (AI-generated)

        # Determine prediction and confidence
        prediction = "AI 생성" if ai_prob > 0.5 else "사람 작성"

        if ai_prob > 0.8 or ai_prob < 0.2:
            confidence = "높음"
        elif ai_prob > 0.65 or ai_prob < 0.35:
            confidence = "중간"
        else:
            confidence = "낮음"

        return {
            "ai_probability": round(ai_prob, 4),
            "prediction": prediction,
            "confidence": confidence
        }

    def predict_batch(self, texts: list[str]) -> list[float]:
        """배치로 여러 텍스트 처리 (문장별 분석용)"""
        if self.model is None:
            raise RuntimeError("Model not loaded")

        # 배치 토크나이징
        inputs = self.tokenizer(
            texts,
            truncation=True,
            max_length=settings.MAX_TEXT_LENGTH,
            padding=True,
            return_tensors="pt"
        )

        # 배치 추론
        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits
            probs = torch.softmax(logits, dim=-1)
            ai_probs = probs[:, 1].tolist()  # 모든 샘플의 AI 확률

        return [round(p, 4) for p in ai_probs]

# Global detector instance (singleton)
detector = AITextDetector()
