#!/bin/bash

###############################################################################
# 🚀 AI vs Human Text Classification - 환경 설정 스크립트
#
# 새로운 사용자가 처음 실행하는 스크립트
# 모든 필수 환경을 자동으로 설정합니다.
#
# 사용:
#   bash setup.sh
###############################################################################

set -e  # 에러 발생 시 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 함수: 섹션 헤더
print_header() {
    echo ""
    echo -e "${BLUE}========================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================================================${NC}"
    echo ""
}

# 함수: 성공 메시지
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# 함수: 정보 메시지
print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
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
# 1. 환경 확인
###############################################################################

print_header "1️⃣  Environment Check"

# OS 확인
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    print_success "Operating System: Linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    print_warning "Operating System: macOS (일부 기능이 다를 수 있음)"
else
    print_error "지원하지 않는 OS입니다 (Linux/macOS만 지원)"
    exit 1
fi

# Python 확인
if ! command -v python3 &> /dev/null; then
    print_error "Python 3이 설치되지 않았습니다"
    print_info "Ubuntu/Debian: sudo apt-get install python3 python3-pip"
    print_info "macOS: brew install python3"
    exit 1
fi

PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
print_success "Python: $PYTHON_VERSION"

# Git 확인
if ! command -v git &> /dev/null; then
    print_warning "Git이 설치되지 않았습니다 (GitHub 사용 시 필요)"
else
    print_success "Git: installed"
fi

# CUDA 확인
if command -v nvidia-smi &> /dev/null; then
    print_success "GPU: NVIDIA GPU detected"
    nvidia-smi --query-gpu=name,memory.total --format=csv,noheader | head -1 | sed 's/^/  ├─ /'
else
    print_warning "GPU: NVIDIA GPU를 감지할 수 없습니다"
    print_info "  CPU only mode로 실행됩니다 (매우 느릴 수 있음)"
fi

###############################################################################
# 2. 디렉토리 구조 생성
###############################################################################

print_header "2️⃣  Creating Directory Structure"

directories=(
    "data/original_data"
    "data/processed"
    "checkpoints"
    "logs"
    "outputs"
    "frontend/node_modules"
)

for dir in "${directories[@]}"; do
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        print_success "Created: $dir"
    else
        print_info "Already exists: $dir"
    fi
done

###############################################################################
# 3. Python Virtual Environment
###############################################################################

print_header "3️⃣  Setting up Python Virtual Environment"

if [ ! -d "venv" ]; then
    print_info "Creating virtual environment..."
    python3 -m venv venv
    print_success "Virtual environment created"
else
    print_info "Virtual environment already exists"
fi

# 활성화
source venv/bin/activate
print_success "Virtual environment activated"

###############################################################################
# 4. Python 패키지 설치
###############################################################################

print_header "4️⃣  Installing Python Packages"

print_info "This may take 5-10 minutes..."
echo ""

pip install --upgrade pip setuptools wheel -q
print_success "pip upgraded"

# requirements.txt 확인
if [ ! -f "requirements.txt" ]; then
    print_error "requirements.txt not found!"
    exit 1
fi

pip install -r requirements.txt
print_success "All Python packages installed"

###############################################################################
# 5. Node.js 및 프론트엔드 설정
###############################################################################

print_header "5️⃣  Setting up Frontend (Node.js)"

if ! command -v node &> /dev/null; then
    print_warning "Node.js가 설치되지 않았습니다"
    print_info "설치 방법:"
    print_info "  Ubuntu/Debian: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install nodejs"
    print_info "  macOS: brew install node"
    print_info "  또는: https://nodejs.org/ 방문"
    print_warning "프론트엔드를 사용하려면 수동으로 설치하세요"
else
    NODE_VERSION=$(node --version)
    print_success "Node.js: $NODE_VERSION"

    # 프론트엔드 패키지 설치
    if [ ! -d "frontend/node_modules" ]; then
        print_info "Installing frontend packages..."
        cd frontend
        npm install --legacy-peer-deps
        cd ..
        print_success "Frontend packages installed"
    else
        print_info "Frontend packages already installed"
    fi
fi

###############################################################################
# 6. 데이터 준비 확인
###############################################################################

print_header "6️⃣  Data Preparation"

print_warning "⚠️  IMPORTANT: 데이터셋 준비"
echo ""
echo "다음 파일을 data/original_data/ 디렉토리에 복사하세요:"
echo ""
echo "  📄 train.csv"
echo "  ├─ 필수 컬럼: title, full_text, generated"
echo "  ├─ generated=0: 인간이 작성한 텍스트"
echo "  └─ generated=1: AI가 생성한 텍스트"
echo ""
echo "  📄 test.csv (선택사항)"
echo ""

if [ -f "data/original_data/train.csv" ]; then
    TRAIN_SIZE=$(wc -l < data/original_data/train.csv)
    print_success "train.csv found ($TRAIN_SIZE lines)"
else
    print_warning "train.csv not found - copy it to data/original_data/"
fi

if [ -f "data/original_data/test.csv" ]; then
    TEST_SIZE=$(wc -l < data/original_data/test.csv)
    print_success "test.csv found ($TEST_SIZE lines)"
else
    print_info "test.csv not found (optional)"
fi

###############################################################################
# 7. 모델 다운로드 확인
###############################################################################

print_header "7️⃣  Model Download (Lazy Loading)"

print_info "모델은 처음 실행할 때 자동으로 다운로드됩니다"
echo ""
echo "다운로드할 모델:"
echo "  • kakaocorp/kanana-1.5-8b-instruct-2505 (8GB)"
echo "  • google/gemma-3-12b-it (12GB)"
echo "  • Qwen/Qwen3-14B (14GB)"
echo ""
print_warning "첫 실행 시 30-60분 소요될 수 있습니다 (인터넷 속도에 따라)"
echo ""

###############################################################################
# 8. 최종 확인
###############################################################################

print_header "8️⃣  Final Checks"

# Python 모듈 확인
python3 << 'EOF'
import sys
try:
    import torch
    import transformers
    import fastapi
    import react  # Node.js가 필요하지만 여기서는 스킵
    print("✅ All major packages are available")
except ImportError as e:
    print(f"⚠️  Missing package: {e}")
    sys.exit(1)
EOF

print_success "Python packages verified"

###############################################################################
# 9. 사용 방법 출력
###############################################################################

print_header "✅ Setup Complete!"

echo ""
echo -e "${GREEN}축하합니다! 모든 설정이 완료되었습니다.${NC}"
echo ""
echo -e "${CYAN}📍 다음 단계:${NC}"
echo ""
echo "1️⃣  데이터 준비"
echo "   train.csv를 data/original_data/ 디렉토리에 복사하세요"
echo ""
echo "2️⃣  모델 학습 (선택사항)"
echo "   $ bash scripts/run_pipeline.sh"
echo ""
echo "3️⃣  시스템 실행"
echo ""
echo "   터미널 1: 백엔드"
echo "   $ python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000"
echo ""
echo "   터미널 2: 프론트엔드"
echo "   $ cd frontend && npm run dev"
echo ""
echo "   브라우저에서:"
echo "   • Frontend: http://localhost:5173"
echo "   • API Docs: http://localhost:8000/docs"
echo ""
echo -e "${CYAN}📚 추가 정보:${NC}"
echo "   • README.md - 프로젝트 개요"
echo "   • LEARNING_GUIDE.md - LoRA 학습 가이드"
echo "   • API_SPEC.md - REST API 명세"
echo ""
echo -e "${YELLOW}💡 팁:${NC}"
echo "   • 가상환경 활성화: source venv/bin/activate"
echo "   • 패키지 업데이트: pip install -r requirements.txt --upgrade"
echo "   • GPU 확인: nvidia-smi"
echo ""

###############################################################################
# 10. 설정 저장
###############################################################################

# 설정 요약 파일 생성
cat > setup_summary.txt << 'SUMMARY'
=================================================================
Setup Summary
=================================================================

Python: $(python3 --version)
Virtual Environment: venv/
Packages: requirements.txt

Directories:
  ├── data/original_data/  (훈련 데이터)
  ├── data/processed/      (전처리 데이터)
  ├── checkpoints/         (모델 체크포인트)
  ├── logs/                (로그 및 TensorBoard)
  └── outputs/             (결과 및 리포트)

Models:
  ├── Kanana 8B (8GB)
  ├── Gemma 12B (12GB)
  └── Qwen3 14B (14GB)

Next Steps:
  1. 데이터 준비: data/original_data/train.csv 복사
  2. 모델 학습 (선택): bash scripts/run_pipeline.sh
  3. 시스템 실행:
     - Backend: python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
     - Frontend: cd frontend && npm run dev
  4. 브라우저: http://localhost:5173

=================================================================
SUMMARY

print_success "Setup summary saved to: setup_summary.txt"

###############################################################################

exit 0
