#!/bin/bash

###############################################################################
# 🚀 AI vs Human Text Classification - LoRA Training Pipeline
#
# 전체 학습 파이프라인을 자동으로 실행합니다.
#
# 실행: bash scripts/run_pipeline.sh
###############################################################################

set -e  # 에러 발생 시 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 함수: 섹션 헤더 출력
print_header() {
    echo ""
    echo -e "${BLUE}========================================================================${NC}"
    echo -e "${BLUE}📌 $1${NC}"
    echo -e "${BLUE}========================================================================${NC}"
    echo ""
}

# 함수: 성공 메시지
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# 함수: 경고 메시지
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 함수: 에러 메시지
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

###############################################################################
# 사전 확인
###############################################################################

print_header "Pre-flight Checks"

# 환경 확인
if [ ! -d "venv" ]; then
    print_error "Virtual environment not found!"
    print_warning "Please run: python -m venv venv"
    exit 1
fi

# 데이터 확인
if [ ! -f "data/original_data/train.csv" ]; then
    print_error "Training data not found: data/original_data/train.csv"
    exit 1
fi

print_success "Virtual environment exists"
print_success "Training data exists"

# GPU 확인
print_header "GPU Status"
python3 -c "
import torch
print(f'✓ GPU Available: {torch.cuda.is_available()}')
if torch.cuda.is_available():
    print(f'✓ Device: {torch.cuda.get_device_name(0)}')
    print(f'✓ Memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB')
" || print_warning "GPU check failed"

###############################################################################
# 환경 활성화
###############################################################################

print_header "Activating Python Environment"
source venv/bin/activate
print_success "Virtual environment activated"

###############################################################################
# Step 1: EDA
###############################################################################

print_header "Step 1/4: Exploratory Data Analysis (EDA)"
echo "Starting: python scripts/01_eda.py"
echo "Expected time: ~2-3 minutes"
echo ""

python scripts/01_eda.py

if [ $? -eq 0 ]; then
    print_success "EDA completed successfully"
else
    print_error "EDA failed"
    exit 1
fi

###############################################################################
# Step 2: Preprocessing
###############################################################################

print_header "Step 2/4: Data Preprocessing"
echo "Starting: python scripts/02_preprocessing.py"
echo "Expected time: ~3-5 minutes"
echo ""

python scripts/02_preprocessing.py

if [ $? -eq 0 ]; then
    print_success "Preprocessing completed successfully"
else
    print_error "Preprocessing failed"
    exit 1
fi

###############################################################################
# Step 3: LoRA Fine-tuning
###############################################################################

print_header "Step 3/4: LoRA Fine-tuning (가장 오래 걸리는 단계)"
echo "Starting: python scripts/03_train_lora.py"
echo "Expected time: 4-6 hours (RTX A6000)"
echo ""
echo "💡 Tip: 다른 터미널에서 모니터링"
echo "   tensorboard --logdir logs/tensorboard/ --port 6006"
echo ""

python scripts/03_train_lora.py

if [ $? -eq 0 ]; then
    print_success "LoRA fine-tuning completed successfully"
else
    print_error "LoRA fine-tuning failed"
    exit 1
fi

###############################################################################
# Step 4: Evaluation
###############################################################################

print_header "Step 4/4: Model Evaluation"
echo "Starting: python scripts/04_evaluate.py"
echo "Expected time: ~10-15 minutes"
echo ""

python scripts/04_evaluate.py

if [ $? -eq 0 ]; then
    print_success "Evaluation completed successfully"
else
    print_error "Evaluation failed"
    exit 1
fi

###############################################################################
# 완료
###############################################################################

print_header "Pipeline Complete! 🎉"

echo "📊 Generated Files:"
echo "  • outputs/eda_report.json"
echo "  • outputs/preprocessing_report.json"
echo "  • outputs/training_summary.json"
echo "  • outputs/evaluation_report.json"
echo "  • checkpoints/kanana_lora_final/"
echo "  • logs/tensorboard/"
echo ""

echo "📈 Next Steps:"
echo "  1. Review the reports in outputs/"
echo "  2. View evaluation results: outputs/04_evaluation_results.png"
echo "  3. Integrate model into backend API"
echo "  4. Deploy and test"
echo ""

print_success "All steps completed successfully!"
echo ""

exit 0
