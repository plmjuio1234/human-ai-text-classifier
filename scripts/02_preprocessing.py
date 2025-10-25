#!/usr/bin/env python3
"""
🔄 Preprocessing - AI vs Human Text Classification

학습 데이터를 전처리하고 train/validation 분할합니다.

주요 작업:
1. 데이터 정제 (null값, 중복 제거)
2. 텍스트 정규화 (공백, 특수문자)
3. 토큰화 및 길이 확인
4. Train/Val 분할 (80/20)
5. 전처리된 데이터 저장

출력:
- data/processed/train_processed.csv
- data/processed/val_processed.csv
- outputs/preprocessing_report.json
"""

import pandas as pd
import numpy as np
import re
import json
from pathlib import Path
from datetime import datetime
from sklearn.model_selection import train_test_split
from collections import Counter

# 설정
DATA_DIR = Path("data/original_data")
OUTPUT_DIR = Path("data/processed")
OUTPUT_DIR.mkdir(exist_ok=True)
REPORT_DIR = Path("outputs")
REPORT_DIR.mkdir(exist_ok=True)

# 하이퍼파라미터
TRAIN_VAL_SPLIT = 0.8
RANDOM_SEED = 42
MAX_LENGTH = 512  # 토큰 기준
MIN_LENGTH = 10    # 최소 단어 수

def print_section(title):
    """섹션 헤더 출력"""
    print("\n" + "=" * 70)
    print(f"📌 {title}")
    print("=" * 70)

def load_data():
    """원본 데이터 로드"""
    print_section("Loading Raw Data")

    train_path = DATA_DIR / "train.csv"
    print(f"✓ Loading: {train_path}")
    train_df = pd.read_csv(train_path)

    print(f"  • Samples: {len(train_df):,}")
    print(f"  • Columns: {', '.join(train_df.columns)}")

    return train_df

def clean_data(df):
    """데이터 정제"""
    print_section("Data Cleaning")

    original_len = len(df)

    # Null값 확인
    print(f"\n🔍 Checking for missing values...")
    null_counts = df.isna().sum()
    if null_counts.sum() > 0:
        print(f"  ⚠️  Found missing values:")
        for col, count in null_counts[null_counts > 0].items():
            print(f"     • {col}: {count}")
        df = df.dropna()
        print(f"  ✓ Removed {original_len - len(df)} rows with null values")
    else:
        print(f"  ✅ No missing values found")

    # 중복 제거
    original_len = len(df)
    print(f"\n🔍 Checking for duplicates...")
    df = df.drop_duplicates(subset=['title', 'full_text'], keep='first')
    duplicates_removed = original_len - len(df)
    if duplicates_removed > 0:
        print(f"  ⚠️  Removed {duplicates_removed} duplicate rows")
    else:
        print(f"  ✅ No duplicates found")

    # 빈 텍스트 제거
    original_len = len(df)
    df = df[df['full_text'].str.strip().str.len() > 0]
    empty_removed = original_len - len(df)
    if empty_removed > 0:
        print(f"  ⚠️  Removed {empty_removed} rows with empty text")

    print(f"\n✅ After cleaning: {len(df):,} samples")
    print(f"   Removed: {original_len - len(df)} rows")

    return df

def normalize_text(text):
    """텍스트 정규화"""
    # 앞뒤 공백 제거
    text = text.strip()

    # 연속된 공백을 단일 공백으로
    text = re.sub(r'\s+', ' ', text)

    # 특수 문자 정리 (한글, 영문, 숫자, 기본 구두점만 유지)
    # 이 부분은 한글 텍스트를 유지하기 위해 제한적으로만 수행
    text = re.sub(r'[^\w\s.!?!·,()（）「」『』【】~\-\—]', '', text, flags=re.UNICODE)

    return text

def preprocess_text(df):
    """텍스트 전처리"""
    print_section("Text Preprocessing")

    print(f"\n📝 Normalizing text...")
    df['full_text'] = df['full_text'].apply(normalize_text)

    # 텍스트 길이 계산
    df['char_count'] = df['full_text'].str.len()
    df['word_count'] = df['full_text'].str.split().str.len()

    # 토큰 수 추정 (한국어: 글자수 / 2.7)
    df['token_estimate'] = df['char_count'] / 2.7

    print(f"\n✅ Text normalization complete")
    print(f"   • Avg characters: {df['char_count'].mean():,.0f}")
    print(f"   • Avg words: {df['word_count'].mean():,.0f}")
    print(f"   • Avg tokens (est): {df['token_estimate'].mean():,.0f}")

    return df

def filter_by_length(df):
    """길이로 필터링"""
    print_section("Length Filtering")

    original_len = len(df)

    # 최소 길이 필터
    print(f"\n🔍 Filtering by length...")
    print(f"   • Min words threshold: {MIN_LENGTH}")
    print(f"   • Max tokens threshold: {MAX_LENGTH}")

    df = df[df['word_count'] >= MIN_LENGTH]
    print(f"   ✓ After min filter: {len(df):,} samples")

    # 최대 길이 초과 확인
    max_exceeded = (df['token_estimate'] > MAX_LENGTH).sum()
    if max_exceeded > 0:
        print(f"   ⚠️  {max_exceeded} samples exceed max length")
        print(f"   ⓘ Will truncate during tokenization")
    else:
        print(f"   ✅ All samples within max length")

    removed = original_len - len(df)
    print(f"\n✅ After filtering: {len(df):,} samples (removed {removed})")

    return df

def split_train_val(df):
    """Train/Validation 분할"""
    print_section("Train/Validation Split")

    print(f"\n📊 Splitting data...")
    print(f"   • Train ratio: {TRAIN_VAL_SPLIT:.0%}")
    print(f"   • Val ratio: {1 - TRAIN_VAL_SPLIT:.0%}")

    train_df, val_df = train_test_split(
        df,
        test_size=1 - TRAIN_VAL_SPLIT,
        random_state=RANDOM_SEED,
        stratify=df['generated'],  # 레이블 비율 유지
        shuffle=True
    )

    print(f"\n✅ Split complete:")
    print(f"   • Train: {len(train_df):,} samples")
    print(f"   • Val: {len(val_df):,} samples")

    # 레이블 분포 확인
    print(f"\n🏷️  Label distribution in train:")
    for label in [0, 1]:
        count = (train_df['generated'] == label).sum()
        pct = count / len(train_df) * 100
        label_text = "Human" if label == 0 else "AI"
        print(f"   • {label_text}: {count:,} ({pct:.1f}%)")

    print(f"\n🏷️  Label distribution in val:")
    for label in [0, 1]:
        count = (val_df['generated'] == label).sum()
        pct = count / len(val_df) * 100
        label_text = "Human" if label == 0 else "AI"
        print(f"   • {label_text}: {count:,} ({pct:.1f}%)")

    return train_df, val_df

def save_processed_data(train_df, val_df):
    """전처리된 데이터 저장"""
    print_section("Saving Processed Data")

    # 필요한 컬럼만 선택
    columns_to_keep = ['title', 'full_text', 'generated']

    train_df_save = train_df[columns_to_keep].reset_index(drop=True)
    val_df_save = val_df[columns_to_keep].reset_index(drop=True)

    # 저장
    train_path = OUTPUT_DIR / "train_processed.csv"
    val_path = OUTPUT_DIR / "val_processed.csv"

    print(f"\n💾 Saving processed data...")

    train_df_save.to_csv(train_path, index=False, encoding='utf-8')
    print(f"   ✓ Train: {train_path}")
    print(f"     • Size: {train_path.stat().st_size / 1024 / 1024:.1f} MB")

    val_df_save.to_csv(val_path, index=False, encoding='utf-8')
    print(f"   ✓ Val: {val_path}")
    print(f"     • Size: {val_path.stat().st_size / 1024 / 1024:.1f} MB")

    return train_df, val_df

def create_preprocessing_report(train_df, val_df):
    """전처리 리포트 생성"""
    report = {
        "timestamp": datetime.now().isoformat(),
        "preprocessing_config": {
            "train_val_split": TRAIN_VAL_SPLIT,
            "min_word_count": MIN_LENGTH,
            "max_token_count": MAX_LENGTH,
            "random_seed": RANDOM_SEED,
        },
        "train_set": {
            "samples": len(train_df),
            "human_samples": int((train_df['generated'] == 0).sum()),
            "ai_samples": int((train_df['generated'] == 1).sum()),
            "avg_chars": float(train_df['char_count'].mean()),
            "avg_words": float(train_df['word_count'].mean()),
            "avg_tokens_estimated": float(train_df['token_estimate'].mean()),
        },
        "val_set": {
            "samples": len(val_df),
            "human_samples": int((val_df['generated'] == 0).sum()),
            "ai_samples": int((val_df['generated'] == 1).sum()),
            "avg_chars": float(val_df['char_count'].mean()),
            "avg_words": float(val_df['word_count'].mean()),
            "avg_tokens_estimated": float(val_df['token_estimate'].mean()),
        },
    }

    report_path = REPORT_DIR / "preprocessing_report.json"
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Saved preprocessing report: {report_path}")

def main():
    """메인 함수"""
    print("\n" + "=" * 70)
    print("🔄 Data Preprocessing - AI vs Human Text Classification")
    print("=" * 70)

    # 1. 데이터 로드
    df = load_data()

    # 2. 데이터 정제
    df = clean_data(df)

    # 3. 텍스트 전처리
    df = preprocess_text(df)

    # 4. 길이 필터링
    df = filter_by_length(df)

    # 5. Train/Val 분할
    train_df, val_df = split_train_val(df)

    # 6. 저장
    train_df, val_df = save_processed_data(train_df, val_df)

    # 7. 리포트 생성
    create_preprocessing_report(train_df, val_df)

    print("\n" + "=" * 70)
    print("✅ PREPROCESSING COMPLETE!")
    print("=" * 70)
    print(f"\n📍 Processed data location: {OUTPUT_DIR}")
    print(f"   • train_processed.csv")
    print(f"   • val_processed.csv")
    print("\nNext step: python scripts/03_train_lora.py")
    print()

if __name__ == "__main__":
    main()
