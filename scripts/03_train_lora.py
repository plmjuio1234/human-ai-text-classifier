#!/usr/bin/env python3
"""
🎯 LoRA Fine-tuning - AI vs Human Text Classification

Kanana 8B 모델을 LoRA로 fine-tuning합니다.

Features:
- LoRA (Low-Rank Adaptation) fine-tuning
- Gradient checkpointing (memory optimization)
- Mixed precision training (fp16)
- Gradient accumulation
- Evaluation on validation set
- TensorBoard logging
- Model checkpointing

모델: kakaocorp/kanana-1.5-8b-instruct-2505
학습 시간: ~4-6시간 (RTX A6000)
"""

import os
import json
import torch
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime
from tqdm import tqdm

# Transformers & PEFT
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    TrainingArguments,
    Trainer,
    DataCollatorForLanguageModeling,
)
from peft import get_peft_model, LoraConfig, TaskType

# Dataset & Utils
from datasets import Dataset
import evaluate
from scipy.special import softmax

# 설정
DATA_DIR = Path("data/processed")
OUTPUT_DIR = Path("checkpoints")
OUTPUT_DIR.mkdir(exist_ok=True)
LOGS_DIR = Path("logs")
LOGS_DIR.mkdir(exist_ok=True)

# 모델 설정
MODEL_NAME = "kakaocorp/kanana-1.5-8b-instruct-2505"
DEVICE = "cuda:0"

# LoRA 하이퍼파라미터
LORA_R = 16
LORA_ALPHA = 32
LORA_DROPOUT = 0.05
LORA_TARGET_MODULES = ["q_proj", "v_proj"]  # Kanana 아키텍처에 맞는 모듈

# 학습 하이퍼파라미터
BATCH_SIZE = 4
GRADIENT_ACCUMULATION_STEPS = 8
LEARNING_RATE = 1e-4
EPOCHS = 3
MAX_LENGTH = 512
WARMUP_STEPS = 100
WEIGHT_DECAY = 0.01

def print_section(title):
    """섹션 헤더 출력"""
    print("\n" + "=" * 70)
    print(f"📌 {title}")
    print("=" * 70)

def print_system_info():
    """시스템 정보 출력"""
    print_section("System Information")

    print(f"\n🖥️  GPU Information:")
    print(f"  • Device: {torch.cuda.get_device_name(0)}")
    print(f"  • Available: {torch.cuda.is_available()}")
    print(f"  • Memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")

    print(f"\n💻 PyTorch Configuration:")
    print(f"  • Version: {torch.__version__}")
    print(f"  • CUDA: {torch.version.cuda}")
    print(f"  • cuDNN: {torch.backends.cudnn.version()}")

def load_processed_data():
    """전처리된 데이터 로드"""
    print_section("Loading Preprocessed Data")

    train_path = DATA_DIR / "train_processed.csv"
    val_path = DATA_DIR / "val_processed.csv"

    print(f"\n📂 Loading data...")
    train_df = pd.read_csv(train_path)
    val_df = pd.read_csv(val_path)

    print(f"  ✓ Train: {len(train_df):,} samples")
    print(f"  ✓ Val: {len(val_df):,} samples")

    return train_df, val_df

def create_prompt(title, text, label=None):
    """텍스트를 학습용 프롬프트로 변환"""
    label_text = "인간이 작성한 것으로 보입니다" if label == 0 else "AI가 생성한 것으로 보입니다"

    prompt = f"""[INST] 다음 텍스트가 인간이 작성했는지 AI가 생성했는지 판단하세요.

제목: {title}

본문:
{text}

결론: """

    if label is not None:
        # 학습 시: 레이블 포함
        prompt += label_text
        prompt += " [/INST]"
        return prompt
    else:
        # 추론 시: 레이블 미포함
        prompt += "[/INST]"
        return prompt

def prepare_dataset(df):
    """Dataset 객체로 변환"""
    texts = []

    for _, row in df.iterrows():
        prompt = create_prompt(row['title'], row['full_text'], label=row['generated'])
        texts.append({"text": prompt})

    dataset = Dataset.from_dict({"text": [t["text"] for t in texts]})
    return dataset

def load_model_and_tokenizer():
    """모델과 토크나이저 로드"""
    print_section("Loading Model and Tokenizer")

    print(f"\n🤖 Model: {MODEL_NAME}")

    # 토크나이저 로드
    print(f"\n⏳ Loading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(
        MODEL_NAME,
        trust_remote_code=True,
        padding_side="right",
    )
    tokenizer.pad_token = tokenizer.eos_token
    print(f"  ✓ Tokenizer loaded")
    print(f"    • Vocab size: {len(tokenizer):,}")

    # 모델 로드 (메모리 최적화: gradient checkpointing 사용)
    print(f"\n⏳ Loading model with gradient checkpointing...")
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        trust_remote_code=True,
        torch_dtype=torch.float16,
    )

    # GPU로 이동
    model = model.to(DEVICE)

    # Gradient checkpointing 활성화 (메모리 절약)
    model.gradient_checkpointing_enable()

    print(f"  ✓ Model loaded")
    print(f"    • Parameters: {sum(p.numel() for p in model.parameters()):,}")
    print(f"    • Device: {next(model.parameters()).device}")

    return model, tokenizer

def setup_lora(model):
    """LoRA 설정"""
    print_section("Setting up LoRA")

    print(f"\n⚙️  LoRA Configuration:")
    print(f"  • Rank (r): {LORA_R}")
    print(f"  • Alpha: {LORA_ALPHA}")
    print(f"  • Dropout: {LORA_DROPOUT}")
    print(f"  • Target modules: {LORA_TARGET_MODULES}")

    lora_config = LoraConfig(
        r=LORA_R,
        lora_alpha=LORA_ALPHA,
        lora_dropout=LORA_DROPOUT,
        bias="none",
        task_type=TaskType.CAUSAL_LM,
        target_modules=LORA_TARGET_MODULES,
    )

    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    print(f"\n✅ LoRA configured successfully")

    return model

def tokenize_function(examples, tokenizer, max_length=MAX_LENGTH):
    """토큰화 함수"""
    return tokenizer(
        examples["text"],
        max_length=max_length,
        truncation=True,
        padding="max_length",
        return_tensors="pt",
    )

def train_lora(model, tokenizer, train_dataset, val_dataset):
    """LoRA Fine-tuning 실행"""
    print_section("Starting LoRA Fine-tuning")

    # 토큰화
    print(f"\n⏳ Tokenizing datasets...")
    train_dataset = train_dataset.map(
        lambda x: tokenize_function(x, tokenizer, MAX_LENGTH),
        batched=True,
        remove_columns=["text"],
    )
    val_dataset = val_dataset.map(
        lambda x: tokenize_function(x, tokenizer, MAX_LENGTH),
        batched=True,
        remove_columns=["text"],
    )
    print(f"  ✓ Tokenization complete")

    # 학습 설정
    training_args = TrainingArguments(
        output_dir=str(OUTPUT_DIR / "training_run"),
        per_device_train_batch_size=BATCH_SIZE,
        per_device_eval_batch_size=BATCH_SIZE,
        gradient_accumulation_steps=GRADIENT_ACCUMULATION_STEPS,
        num_train_epochs=EPOCHS,
        learning_rate=LEARNING_RATE,
        warmup_steps=WARMUP_STEPS,
        weight_decay=WEIGHT_DECAY,
        save_total_limit=3,
        save_strategy="epoch",
        eval_strategy="epoch",
        logging_steps=10,
        logging_dir=str(LOGS_DIR / "tensorboard"),
        seed=42,
        fp16=True,  # Mixed precision
        push_to_hub=False,
        report_to=["tensorboard"],
        # Fix DataParallel multi-GPU issues - FORCE SINGLE GPU
        local_rank=-1,  # Single GPU mode
        ddp_find_unused_parameters=False,
        dataloader_pin_memory=False,
        remove_unused_columns=False,
    )

    print(f"\n⚙️  Training Configuration:")
    print(f"  • Batch size: {BATCH_SIZE}")
    print(f"  • Gradient accumulation: {GRADIENT_ACCUMULATION_STEPS}")
    print(f"  • Effective batch size: {BATCH_SIZE * GRADIENT_ACCUMULATION_STEPS}")
    print(f"  • Learning rate: {LEARNING_RATE}")
    print(f"  • Epochs: {EPOCHS}")
    print(f"  • Training samples: {len(train_dataset)}")
    print(f"  • Validation samples: {len(val_dataset)}")

    # 데이터 콜레이터
    data_collator = DataCollatorForLanguageModeling(
        tokenizer=tokenizer,
        mlm=False,
    )

    # Trainer 생성
    print(f"\n⏳ Setting up Trainer...")
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        data_collator=data_collator,
    )

    # 학습 시작
    print(f"\n{'=' * 70}")
    print(f"🚀 Starting training...")
    print(f"{'=' * 70}\n")

    train_result = trainer.train()

    # 최종 모델 저장
    print(f"\n\n{'=' * 70}")
    print(f"💾 Saving final model...")
    final_model_path = OUTPUT_DIR / "kanana_lora_final"
    model.save_pretrained(final_model_path)
    tokenizer.save_pretrained(final_model_path)
    print(f"  ✓ Saved to: {final_model_path}")

    # 평가
    print(f"\n📊 Final Evaluation:")
    eval_results = trainer.evaluate()
    print(f"  • Eval Loss: {eval_results['eval_loss']:.4f}")

    return trainer, train_result

def save_training_summary(train_result):
    """학습 요약 저장"""
    summary = {
        "timestamp": datetime.now().isoformat(),
        "model": MODEL_NAME,
        "lora_config": {
            "r": LORA_R,
            "alpha": LORA_ALPHA,
            "dropout": LORA_DROPOUT,
            "target_modules": LORA_TARGET_MODULES,
        },
        "training_config": {
            "batch_size": BATCH_SIZE,
            "gradient_accumulation_steps": GRADIENT_ACCUMULATION_STEPS,
            "effective_batch_size": BATCH_SIZE * GRADIENT_ACCUMULATION_STEPS,
            "learning_rate": LEARNING_RATE,
            "epochs": EPOCHS,
            "max_length": MAX_LENGTH,
        },
        "training_results": {
            "final_loss": float(train_result.training_loss),
            "total_steps": train_result.global_step,
        },
    }

    summary_path = LOGS_DIR / "training_summary.json"
    with open(summary_path, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Saved training summary: {summary_path}")

def main():
    """메인 함수"""
    print("\n" + "=" * 70)
    print("🎯 LoRA Fine-tuning - AI vs Human Text Classification")
    print("=" * 70)

    # 1. 시스템 정보
    print_system_info()

    # 2. 데이터 로드
    train_df, val_df = load_processed_data()

    # 3. 모델 로드
    model, tokenizer = load_model_and_tokenizer()

    # 4. LoRA 설정
    model = setup_lora(model)

    # 5. 데이터셋 준비
    print_section("Preparing Datasets")
    print(f"\n📝 Creating prompts...")
    train_dataset = prepare_dataset(train_df)
    val_dataset = prepare_dataset(val_df)
    print(f"  ✓ Train dataset: {len(train_dataset)} samples")
    print(f"  ✓ Val dataset: {len(val_dataset)} samples")

    # 6. 학습
    trainer, train_result = train_lora(model, tokenizer, train_dataset, val_dataset)

    # 7. 요약 저장
    save_training_summary(train_result)

    print("\n" + "=" * 70)
    print("✅ LORA FINE-TUNING COMPLETE!")
    print("=" * 70)
    print(f"\n📍 Model saved to: {OUTPUT_DIR / 'kanana_lora_final'}")
    print(f"📊 Logs saved to: {LOGS_DIR}")
    print(f"\nNext step: python scripts/04_evaluate.py")
    print()

if __name__ == "__main__":
    main()
