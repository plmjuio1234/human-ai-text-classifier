#!/usr/bin/env python
# coding: utf-8

# # 라이브러리 임포트 및 시드 고정

# In[ ]:


# notebooks 폴더에서 실행되므로 cd 불필요


# In[ ]:


# requirements는 이미 설치되어 있으므로 생략
# !pip install -r ../requirements.txt --extra-index-url https://download.pytorch.org/whl/cu124


# In[4]:


import pandas as pd
import numpy as np
import random
import re
import os
from sklearn.model_selection import StratifiedKFold


# In[5]:


def seed_everything(seed):
    random.seed(seed)
    os.environ['PYTHONHASHSEED'] = str(seed)
    np.random.seed(seed)

SEED = 42
seed_everything(SEED)


# # 데이터 불러오기

# In[ ]:


# 경로 설정 (notebooks 폴더 기준)
TRAIN_CSV = "../data/raw/train.csv"
TEST_CSV = "../data/raw/test.csv"
SUBMISSION_CSV = "../data/raw/sample_submission.csv"

# 학습 데이터 불러오기
train_df = pd.read_csv(TRAIN_CSV, encoding="utf-8-sig")
test_df = pd.read_csv(TEST_CSV, encoding="utf-8-sig")
submission_df = pd.read_csv(SUBMISSION_CSV, encoding="utf-8-sig")
print("원본 학습 데이터 크기:", len(train_df))


# # TRAIN 데이터 전처리

# In[8]:


def minimal_preprocess(text):
    text = text.strip()
    text = re.sub(r'[\u4E00-\u9FFF]', '', text)                   # 한자 제거
    text = re.sub(r'<[^>]+>', '', text)                           # HTML 태그 제거
    text = re.sub(r'\(\s*[^\w가-힣]*\s*\)', '', text)             # 빈 괄호 제거
    text = re.sub(r'\([^\(\)]{0,20}[\?\~]{1,3}[^\(\)]{0,20}\)', '', text)  # ( ? ~ ? ) 제거
    text = re.sub(r'[.,]{3,}', '.', text)                         # ... → .
    text = re.sub(r'[()]{2,}', '', text)                          # 괄호 잔재 정리
    text = re.sub(r',\s*,+', ',', text)
    text = re.sub(r'\s+', ' ', text)                              # 중복 공백 제거
    return text

def split_into_paragraphs(text):
    # 문단 기준: 두 줄 개행 우선
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
    # # 만약 너무 적게 쪼개졌으면 한 줄 개행으로 재시도
    if len(paragraphs) <= 1:
        paragraphs = [p.strip() for p in text.split('\n') if p.strip()]
    return paragraphs

def convert_train_to_paragraphs(train_df):
    rows = []
    for _, row in train_df.iterrows():
        title = row['title']
        full_text = row['full_text']  # ✅ 전처리 전 원본에서 문단 나눔
        label = row['generated']
        paragraphs = split_into_paragraphs(full_text)
        for idx, para in enumerate(paragraphs):
            cleaned_para = minimal_preprocess(para)  # ✅ 각 문단에 대해 전처리
            rows.append({
                'title': title,
                'paragraph_index': idx,
                'paragraph_text': cleaned_para,
                'generated': label
            })
    return pd.DataFrame(rows)


# In[9]:


paragraph_train = convert_train_to_paragraphs(train_df)


# In[10]:


# ✅ 1) paragraph_text가 NaN인 행 개수 확인
nan_cnt = paragraph_train['paragraph_text'].isna().sum()
print(f"paragraph_text NaN 개수: {nan_cnt}")

# ✅ 2) NaN 행 제거 및 인덱스 재정렬
paragraph_train = (
    paragraph_train
      .dropna(subset=['paragraph_text'])  # NaN 행 삭제
      .reset_index(drop=True)             # 인덱스 리셋
)

print("제거 후 데이터 크기:", len(paragraph_train))


# In[11]:


paragraph_train = paragraph_train.rename(columns={'paragraph_text': 'full_text'})


# In[12]:


paragraph_train


# In[13]:


# 1) 문단 길이(문자 수) 계산
paragraph_train['char_len'] = paragraph_train['full_text'].str.len()

# 2) 라벨(generated)별 35 % · 95 % 퍼센타일 계산
percentiles = (
    paragraph_train
      .groupby('generated')['char_len']
      .quantile([0.35, 0.95])        # 두 지점 한 번에 구함
      .unstack(level=1)              # 보기 편하게: index=라벨, columns=p35/p95
      .rename(columns={0.35: 'p35', 0.95: 'p95'})
)

print("라벨별 문단 길이 퍼센타일")
print(percentiles)


# In[14]:


# 3) 위 기준을 이용해 필터링
mask = paragraph_train.apply(
    lambda r: percentiles.loc[r['generated'], 'p35'] <= r['char_len'] <= percentiles.loc[r['generated'], 'p95'],
    axis=1
)

filtered_df = (
    paragraph_train[mask]
      .reset_index(drop=True)
      .drop(columns=['char_len'])   # 길이 컬럼이 필요 없으면 제거
)

print(f"필터링 전: {len(paragraph_train)}  →  필터링 후: {len(filtered_df)}")


# In[15]:


# ✅ 라벨별 개수 확인
label_counts = filtered_df['generated'].value_counts()
print("라벨별 개수 (필터링 후):")
print(label_counts)

# ✅ 1:1 언더샘플링 ─ 소수 클래스(1번)의 개수만큼만 0번에서 랜덤 추출
min_cnt = label_counts.min()            # 1번 라벨 개수
balanced_df = (
    filtered_df
      .groupby('generated', group_keys=False)
      .apply(lambda x: x.sample(n=min_cnt, random_state=SEED))  # 동일 개수 샘플링
      .reset_index(drop=True)
)

print("\n언더샘플링 후 라벨별 개수:")
print(balanced_df['generated'].value_counts())

# balanced_df 가 1:1 비율로 균형 잡힌 학습용 데이터입니다.


# In[ ]:


N_SPLITS   = 4
OUTPUT_DIR = "../data/kfold_csv"   # notebooks 폴더 기준

os.makedirs(OUTPUT_DIR, exist_ok=True)

# ──────────────────────────────
# Stratified 4-Fold 분할
# ──────────────────────────────
skf = StratifiedKFold(n_splits=N_SPLITS, shuffle=True, random_state=SEED)


# In[17]:


# fold별 DataFrame을 담아 둘 컨테이너
fold_dfs = {}          # {0: fold0_df, 1: fold1_df, ...}

for fold, (_, val_idx) in enumerate(skf.split(balanced_df, balanced_df['generated'])):
    # fold별 검증 세트만 따로 추출
    fold_df = (
        balanced_df.iloc[val_idx]          # fold 인덱스 추출
          .sample(frac=1, random_state=SEED)  # ★ 행 순서 셔플
          .reset_index(drop=True)
    )
    fold_dfs[fold] = fold_df           # 저장

    # 라벨 비율(1:1 여부) 확인
    counts = fold_df['generated'].value_counts().sort_index()
    print(f"Fold {fold}  →  0:{counts[0]} | 1:{counts[1]}   (총 {len(fold_df)}개)")

# 이제 fold_dfs[0] ~ fold_dfs[4] 에서 각 fold의 데이터프레임을 바로 사용할 수 있습니다.
# (저장하려면 이후에 to_csv 호출만 추가하면 됩니다)


# In[18]:


fold_dfs[0]


# In[19]:


# ─────────────────────────────────────────
# ❶ fold_dfs 사전에 ID 컬럼 추가하기
#    형식: FOLD{fold 번호}_{5자리 순번}
# ─────────────────────────────────────────
for fold, df in fold_dfs.items():
    df.insert(
        0,                                   # 맨 앞 컬럼으로 삽입
        'id',
        [f"FOLD{fold}_{i:05d}" for i in range(len(df))]
    )
    fold_dfs[fold] = df                      # 덮어쓰기(선택)

# 확인용 출력
for fold in range(len(fold_dfs)):
    print(f"▶ Fold {fold}  첫 3개 ID:")
    print(fold_dfs[fold][['id', 'generated']].head(3), "\n")


# In[20]:


# 이미 셔플·ID 부여가 끝난 fold_dfs 저장
for fold, df in fold_dfs.items():
    save_path = os.path.join(OUTPUT_DIR, f"fold{fold}.csv")
    df.to_csv(save_path, index=False, encoding="utf-8-sig")
    print(f"✓ fold{fold}.csv  →  {save_path}  (행 {len(df)})")


# # TEST 데이터 전처리

# In[21]:


test_df


# In[22]:


# paragraph_text에 전처리 적용
test_df['paragraph_text'] = test_df['paragraph_text'].apply(minimal_preprocess)


# In[ ]:


# 저장
test_df.to_csv("../data/kfold_csv/test_preprocessed.csv", index=False, encoding='utf-8-sig')


# In[ ]:


import shutil

shutil.copy('../data/raw/sample_submission.csv', '../data/kfold_csv/sample_submission.csv')


# In[ ]:




