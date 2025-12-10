# notebooks 폴더에서 실행되므로 cd 불필요

# requirements는 이미 설치되어 있으므로 생략
# !pip install -r ../requirements.txt --extra-index-url https://download.pytorch.org/whl/cu124

import os
# 단일 GPU 사용 (GPU 0) - 스크립트 최상단에서 설정
os.environ["CUDA_VISIBLE_DEVICES"] = "0"

import pandas as pd
import numpy as np
from datasets import Dataset, DatasetDict
from transformers import AutoTokenizer
from transformers import AutoModelForSequenceClassification, BitsAndBytesConfig
from transformers import DataCollatorWithPadding, TrainingArguments, Trainer, TrainerCallback
from transformers import pipeline
import torch
from peft import LoraConfig, TaskType, get_peft_model
from sklearn.metrics import roc_auc_score
import datetime as dt
import random
import re
import os
from tqdm import tqdm
from torch.utils.data import DataLoader

def seed_everything(seed):
    random.seed(seed)
    os.environ['PYTHONHASHSEED'] = str(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = True

SEED = 42
seed_everything(SEED)

# 전체 fold 파일 경로 리스트 (0~3) - notebooks 폴더 기준
val_fold_idx = 0  # fold0을 validation으로, 나머지(1,2,3)가 train으로 사용

fold_paths = [f"../data/kfold_csv/fold{i}.csv" for i in range(4)]

FOLD_VAL   = fold_paths[val_fold_idx]
FOLD_TRAIN = [path for idx, path in enumerate(fold_paths) if idx != val_fold_idx]

print("▶ Train folds:", FOLD_TRAIN)
print("▶ Validation fold:", FOLD_VAL)

TEST_CSV        = "../data/kfold_csv/test_preprocessed.csv"
SUBMISSION_CSV  = "../data/kfold_csv/sample_submission.csv"

train_df = pd.concat(
    [pd.read_csv(p, encoding="utf-8-sig") for p in FOLD_TRAIN],
    ignore_index=True
)

val_df   = pd.read_csv(FOLD_VAL, encoding="utf-8-sig")

train_df = train_df[['full_text', 'generated']].rename(
    columns={'full_text':'text', 'generated':'label'}
)
val_df   = val_df  [['full_text', 'generated']].rename(
    columns={'full_text':'text', 'generated':'label'}
)

train_df = train_df.sample(frac=1, random_state=SEED).reset_index(drop=True)

print("최종 학습 샘플 수:", len(train_df))
print("최종 학습 클래스 분포:", train_df['label'].value_counts().to_dict())
print("검증 샘플 수:", len(val_df))
print("검증 클래스 분포:", val_df['label'].value_counts().to_dict())

train_dataset = Dataset.from_pandas(train_df)
val_dataset   = Dataset.from_pandas(val_df)

MODEL_NAME = "kakaocorp/kanana-1.5-8b-instruct-2505"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

def tokenize_function(example):
    return tokenizer(example["text"], truncation=True)

train_dataset = train_dataset.map(tokenize_function, batched=True)
val_dataset = val_dataset.map(tokenize_function, batched=True)

train_dataset = train_dataset.remove_columns(["text"])
val_dataset = val_dataset.remove_columns(["text"])

train_dataset = train_dataset.rename_column("label", "labels")
val_dataset   = val_dataset.rename_column("label", "labels")

data_collator = DataCollatorWithPadding(tokenizer, padding=True)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_use_double_quant=True
)

model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME, num_labels=2, quantization_config=bnb_config, torch_dtype=torch.bfloat16)
model.to(device)

R = 32
LORA_ALPHA = 16
LORA_DROPOUT = 0.1
lora_config = LoraConfig(
    r=R,
    lora_alpha=LORA_ALPHA,
    lora_dropout=LORA_DROPOUT,
    task_type=TaskType.SEQ_CLS,
    target_modules= ["q_proj","k_proj","v_proj","o_proj","gate_proj","up_proj","down_proj"]
)

model = get_peft_model(model, lora_config)

model.print_trainable_parameters()

def compute_metrics(eval_pred):
    logits, labels = eval_pred
    probs = logits[:, 1]
    roc_auc = roc_auc_score(labels, probs)
    return {"roc_auc": roc_auc}

training_args = TrainingArguments(
    output_dir="../models/checkpoints/kanana",
    overwrite_output_dir=True,
    learning_rate=2e-5,
    per_device_train_batch_size=8,   # 6 → 8 (VRAM 여유)
    per_device_eval_batch_size=8,
    num_train_epochs=1,
    eval_strategy="epoch",           # steps → epoch (검증 1회만)
    save_strategy="epoch",
    metric_for_best_model="roc_auc",
    greater_is_better=True,
    logging_strategy="steps",
    logging_steps=1000,
    logging_first_step=True,
    save_total_limit=2,
    seed=SEED,
    dataloader_drop_last=False,
    report_to="none",
    label_names=["labels"]
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=val_dataset,
    tokenizer=tokenizer,
    data_collator=data_collator,
    compute_metrics=compute_metrics,
)

trainer.train()

output_dir = "../models/lora_adapters/kanana"
trainer.model.save_pretrained(output_dir)
tokenizer.save_pretrained(output_dir)
print("모델이 저장되었습니다:", output_dir)

test_df = pd.read_csv(TEST_CSV, encoding='utf-8-sig')
submission_df = pd.read_csv(SUBMISSION_CSV, encoding='utf-8-sig')

print("테스트 샘플 수:", len(test_df))
pred_probs = []

trainer.model.eval()

clf = pipeline(
    "text-classification",
    model=trainer.model,
    tokenizer=tokenizer,
    return_all_scores=True,
)

print("샘플 결과 예시:", clf(test_df['paragraph_text'][0]))

for text in test_df['paragraph_text']:
    scores = clf(text)[0]
    prob_ai = None
    for s in scores:
        if s['label'] in ['LABEL_1', '1', 'generated']:
            prob_ai = s['score']
            break
    if prob_ai is None:
        prob_ai = scores[1]['score']
    pred_probs.append(prob_ai)

submission_df['generated'] = pred_probs

submission_df

import os
os.makedirs("../outputs/ensemble", exist_ok=True)
submission_df.to_csv("../outputs/ensemble/test_kanana_pred.csv", index=False, encoding="utf-8-sig")
print("Test 예측 저장 완료: ../outputs/ensemble/test_kanana_pred.csv")

def tokenize_test(batch):
    return tokenizer(batch["text"], truncation=True)

val_ds = Dataset.from_pandas(val_df)

val_ds = val_ds.map(tokenize_test, batched=True,
                      remove_columns=["text", "label"])

def collate(features):
    batch = data_collator(features)
    return batch

BATCH_TEST = 6

loader = DataLoader(
    val_ds,
    batch_size=BATCH_TEST,
    shuffle=False,
    collate_fn=collate,
    pin_memory=True,
)

probs_list = []

with torch.no_grad():
    for batch in tqdm(loader):
        batch = {k: v.to(device) for k, v in batch.items()}
        logits = trainer.model(**batch).logits
        probs  = torch.softmax(logits, dim=-1)[:, 1]
        probs_list.append(probs.cpu())

probs = torch.cat(probs_list).to(torch.float32).numpy()
print(f"Inference done – {len(probs)} samples")

val_df['generated'] = probs
val_df['ID'] = pd.read_csv(FOLD_VAL, encoding="utf-8-sig")['id']
val_df = val_df[['ID', 'generated', 'label']]
val_df.to_csv("../outputs/ensemble/val_kanana_pred.csv", index=False, encoding="utf-8-sig")
print("Validation 예측 저장 완료: ../outputs/ensemble/val_kanana_pred.csv")
