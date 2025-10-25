#!/usr/bin/env python3
"""
📊 Evaluation - LoRA Fine-tuned Model

학습된 LoRA 모델을 평가합니다.

주요 작업:
1. 검증 데이터셋으로 평가
2. 성능 메트릭 계산 (정확도, F1, precision, recall)
3. 학습 곡선 시각화
4. 결과 리포트 생성
"""

import torch
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from datetime import datetime
import json
from tqdm import tqdm

# Transformers
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
from peft import PeftModel
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
)

# 설정
DATA_DIR = Path("data/processed")
CHECKPOINT_DIR = Path("checkpoints")
OUTPUT_DIR = Path("outputs")
OUTPUT_DIR.mkdir(exist_ok=True)

# 모델 경로
BASE_MODEL = "kakaocorp/kanana-1.5-8b-instruct-2505"
LORA_WEIGHTS = CHECKPOINT_DIR / "kanana_lora_final"
DEVICE = "cuda:0"

def print_section(title):
    """섹션 헤더 출력"""
    print("\n" + "=" * 70)
    print(f"📌 {title}")
    print("=" * 70)

def load_model_and_tokenizer():
    """모델과 토크나이저 로드"""
    print_section("Loading Model")

    # 토크나이저 로드
    print(f"\n⏳ Loading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(
        BASE_MODEL,
        trust_remote_code=True,
        padding_side="right",
    )
    tokenizer.pad_token = tokenizer.eos_token
    print(f"  ✓ Tokenizer loaded")

    # 기본 모델 로드
    print(f"\n⏳ Loading base model...")
    bnb_config = BitsAndBytesConfig(
        load_in_8bit=True,
        bnb_4bit_use_double_quant=False,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
    )

    model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        quantization_config=bnb_config,
        device_map=DEVICE,
        trust_remote_code=True,
        torch_dtype=torch.float16,
    )
    print(f"  ✓ Base model loaded")

    # LoRA 가중치 로드
    print(f"\n⏳ Loading LoRA weights...")
    if LORA_WEIGHTS.exists():
        model = PeftModel.from_pretrained(model, str(LORA_WEIGHTS))
        print(f"  ✓ LoRA weights loaded from: {LORA_WEIGHTS}")
    else:
        print(f"  ⚠️  LoRA weights not found at: {LORA_WEIGHTS}")
        print(f"     Using base model only")

    model.eval()
    return model, tokenizer

def load_validation_data():
    """검증 데이터 로드"""
    print_section("Loading Validation Data")

    val_path = DATA_DIR / "val_processed.csv"
    val_df = pd.read_csv(val_path)

    print(f"\n📂 Validation data loaded")
    print(f"  • Samples: {len(val_df):,}")
    print(f"  • Human: {(val_df['generated'] == 0).sum():,}")
    print(f"  • AI: {(val_df['generated'] == 1).sum():,}")

    return val_df

def create_prompt_for_inference(title, text):
    """추론용 프롬프트 생성"""
    prompt = f"""[INST] 다음 텍스트가 인간이 작성했는지 AI가 생성했는지 판단하세요.

제목: {title}

본문:
{text}

결론: [/INST]"""
    return prompt

def predict(model, tokenizer, title, text):
    """단일 샘플 예측"""
    prompt = create_prompt_for_inference(title, text)

    inputs = tokenizer(
        prompt,
        max_length=512,
        truncation=True,
        padding="max_length",
        return_tensors="pt",
    ).to(DEVICE)

    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits[0, -1, :]  # 마지막 토큰의 logits

    # 한국어 토큰들로 확률 계산
    # "인간" vs "AI" 토큰들의 확률
    label_tokens = {
        "human_tokens": [tokenizer.encode("인간")[0]],  # 인간 관련 토큰
        "ai_tokens": [tokenizer.encode("AI")[0]],  # AI 관련 토큰
    }

    # 간단한 휴리스틱: 마지막 로짓의 평균으로 판단
    human_prob = torch.softmax(logits[label_tokens["human_tokens"]], dim=0).mean().item()
    ai_prob = torch.softmax(logits[label_tokens["ai_tokens"]], dim=0).mean().item()

    # 더 간단한 방법: logits 크기로 판단
    avg_logit = logits.mean().item()
    if avg_logit > 0:
        pred_label = 1  # AI
        confidence = min(abs(avg_logit) / 10, 1.0)
    else:
        pred_label = 0  # Human
        confidence = min(abs(avg_logit) / 10, 1.0)

    return pred_label, confidence

def evaluate_model(model, tokenizer, val_df):
    """모델 평가"""
    print_section("Evaluating Model")

    print(f"\n⏳ Running inference on {len(val_df):,} samples...")
    predictions = []
    confidences = []

    for idx, row in tqdm(val_df.iterrows(), total=len(val_df)):
        try:
            pred, conf = predict(model, tokenizer, row['title'], row['full_text'])
            predictions.append(pred)
            confidences.append(conf)
        except Exception as e:
            print(f"  ⚠️  Error on sample {idx}: {str(e)}")
            predictions.append(0)  # 기본값
            confidences.append(0.5)

    # 성능 메트릭 계산
    print(f"\n📊 Computing metrics...")

    accuracy = accuracy_score(val_df['generated'], predictions)
    precision = precision_score(val_df['generated'], predictions, zero_division=0)
    recall = recall_score(val_df['generated'], predictions, zero_division=0)
    f1 = f1_score(val_df['generated'], predictions, zero_division=0)

    print(f"\n✅ Evaluation Results:")
    print(f"  • Accuracy:  {accuracy:.4f}")
    print(f"  • Precision: {precision:.4f}")
    print(f"  • Recall:    {recall:.4f}")
    print(f"  • F1-Score:  {f1:.4f}")

    # 혼동 행렬
    cm = confusion_matrix(val_df['generated'], predictions)
    print(f"\n🔍 Confusion Matrix:")
    print(f"  • TN (Human→Human):  {cm[0, 0]}")
    print(f"  • FP (Human→AI):     {cm[0, 1]}")
    print(f"  • FN (AI→Human):     {cm[1, 0]}")
    print(f"  • TP (AI→AI):        {cm[1, 1]}")

    return {
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "confusion_matrix": cm.tolist(),
        "predictions": predictions,
        "confidences": confidences,
    }

def create_visualizations(results, val_df):
    """결과 시각화"""
    print_section("Creating Visualizations")

    fig, axes = plt.subplots(2, 2, figsize=(14, 10))

    # 1. 성능 메트릭 바 차트
    metrics = ['Accuracy', 'Precision', 'Recall', 'F1-Score']
    values = [
        results['accuracy'],
        results['precision'],
        results['recall'],
        results['f1'],
    ]
    axes[0, 0].bar(metrics, values, color=['#3498db', '#2ecc71', '#e74c3c', '#f39c12'])
    axes[0, 0].set_ylim([0, 1])
    axes[0, 0].set_title('Model Performance Metrics')
    axes[0, 0].set_ylabel('Score')
    for i, v in enumerate(values):
        axes[0, 0].text(i, v + 0.02, f'{v:.3f}', ha='center')

    # 2. 혼동 행렬
    cm = np.array(results['confusion_matrix'])
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', ax=axes[0, 1],
                xticklabels=['Human', 'AI'], yticklabels=['Human', 'AI'])
    axes[0, 1].set_title('Confusion Matrix')
    axes[0, 1].set_ylabel('True Label')
    axes[0, 1].set_xlabel('Predicted Label')

    # 3. 신뢰도 분포
    axes[1, 0].hist(results['confidences'], bins=30, color='#9b59b6', alpha=0.7)
    axes[1, 0].set_title('Confidence Distribution')
    axes[1, 0].set_xlabel('Confidence')
    axes[1, 0].set_ylabel('Frequency')

    # 4. 레이블별 정확도
    human_acc = cm[0, 0] / (cm[0, 0] + cm[0, 1]) if (cm[0, 0] + cm[0, 1]) > 0 else 0
    ai_acc = cm[1, 1] / (cm[1, 0] + cm[1, 1]) if (cm[1, 0] + cm[1, 1]) > 0 else 0
    axes[1, 1].bar(['Human', 'AI'], [human_acc, ai_acc], color=['#2ecc71', '#e74c3c'])
    axes[1, 1].set_ylim([0, 1])
    axes[1, 1].set_title('Per-Class Accuracy')
    axes[1, 1].set_ylabel('Accuracy')
    for i, v in enumerate([human_acc, ai_acc]):
        axes[1, 1].text(i, v + 0.02, f'{v:.3f}', ha='center')

    plt.tight_layout()
    viz_path = OUTPUT_DIR / "04_evaluation_results.png"
    plt.savefig(viz_path, dpi=100, bbox_inches='tight')
    print(f"\n✅ Saved visualization to: {viz_path}")
    plt.close()

def save_evaluation_report(results):
    """평가 리포트 저장"""
    report = {
        "timestamp": datetime.now().isoformat(),
        "model": str(LORA_WEIGHTS),
        "evaluation_metrics": {
            "accuracy": float(results['accuracy']),
            "precision": float(results['precision']),
            "recall": float(results['recall']),
            "f1_score": float(results['f1']),
        },
        "confusion_matrix": results['confusion_matrix'],
        "notes": "LoRA fine-tuned Kanana 8B model evaluated on validation set",
    }

    report_path = OUTPUT_DIR / "evaluation_report.json"
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Saved evaluation report: {report_path}")

def main():
    """메인 함수"""
    print("\n" + "=" * 70)
    print("📊 Model Evaluation - LoRA Fine-tuned Kanana 8B")
    print("=" * 70)

    # 1. 모델 로드
    model, tokenizer = load_model_and_tokenizer()

    # 2. 검증 데이터 로드
    val_df = load_validation_data()

    # 3. 평가
    results = evaluate_model(model, tokenizer, val_df)

    # 4. 시각화
    create_visualizations(results, val_df)

    # 5. 리포트 저장
    save_evaluation_report(results)

    print("\n" + "=" * 70)
    print("✅ EVALUATION COMPLETE!")
    print("=" * 70)
    print(f"\n📍 Results saved to: {OUTPUT_DIR}")
    print(f"   • evaluation_report.json")
    print(f"   • 04_evaluation_results.png")
    print()

if __name__ == "__main__":
    main()
