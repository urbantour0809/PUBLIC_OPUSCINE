# 🤖 OpusCine LLM Server

EXAONE 3.5-7.8B 모델을 사용한 자연어 처리 서버입니다.

## 📋 요구사항

### 하드웨어
- **GPU**: NVIDIA GPU (최소 16GB VRAM 권장)
- **RAM**: 32GB 이상 권장
- **Storage**: 50GB 이상 여유 공간

### 소프트웨어
- Python 3.11+
- CUDA 11.8+
- PyTorch 2.1.0+

## 🚀 설치 및 실행

### 1. 의존성 설치

```bash
# Python 가상환경 생성 (권장)
python -m venv llm_env
source llm_env/bin/activate  # Linux/Mac
# 또는
llm_env\Scripts\activate     # Windows

# 의존성 설치
pip install -r requirements.txt
```

### 2. 환경 설정

```bash
# .env 파일 복사 및 수정
cp .env.example .env
nano .env  # 필요시 설정 수정
```

**주요 환경변수:**
```env
MODEL_NAME=LGAI-EXAONE/EXAONE-3.5-7.8B-Instruct
CUDA_VISIBLE_DEVICES=0
PORT=8001
```

### 3. 서버 실행

```bash
# 방법 1: run.py 스크립트 사용 (권장)
python run.py

# 방법 2: 직접 실행
python app.py

# 방법 3: uvicorn 직접 사용
uvicorn app:app --host 0.0.0.0 --port 8001
```

### 4. 상태 확인

```bash
# 헬스 체크
curl http://localhost:8001/health

# 모델 정보 확인
curl http://localhost:8001/
```

## 📡 API 엔드포인트

### 기본 정보
- **기본 URL**: `http://localhost:8001`
- **Content-Type**: `application/json`

### 주요 엔드포인트

#### 1. 헬스 체크
```
GET /
GET /health
```

#### 2. 자연어 처리
```
POST /llm
Content-Type: application/json

{
  "message": "2024년 액션 영화 추천해줘"
}
```

**응답 예시:**
```json
{
  "success": true,
  "parameters": {
    "with_genres": [28],
    "primary_release_date.gte": "2024-01-01",
    "primary_release_date.lte": "2024-12-31",
    "language": "ko-KR",
    "sort_by": "popularity.desc"
  },
  "confidence": 0.95,
  "method": "exaone_model"
}
```

#### 3. 테스트 파싱
```
POST /test-parse
Content-Type: application/json

{
  "message": "봉준호 감독의 최신 영화"
}
```

## 🔧 설정 옵션

### 모델 설정
```env
MODEL_NAME=LGAI-EXAONE/EXAONE-3.5-7.8B-Instruct
MODEL_CACHE_DIR=./model_cache
TORCH_DTYPE=bfloat16
DEVICE_MAP=auto
```

### 생성 파라미터
```env
MAX_NEW_TOKENS=512
TEMPERATURE=0.1
DO_SAMPLE=false
```

### 서버 설정
```env
HOST=0.0.0.0
PORT=8001
DEBUG=false
LOG_LEVEL=INFO
```

## 🐳 Docker 실행

### Dockerfile 빌드
```bash
docker build -t opus-llm-server .
```

### 컨테이너 실행
```bash
docker run -d \
  --name opus-llm \
  --gpus all \
  -p 8001:8001 \
  -v $(pwd)/model_cache:/app/model_cache \
  -e CUDA_VISIBLE_DEVICES=0 \
  opus-llm-server
```

## 🌐 ngrok 설정 (외부 접근용)

### ngrok 설치 및 설정
```bash
# ngrok 설치
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok

# 토큰 설정
ngrok config add-authtoken YOUR_NGROK_TOKEN
```

### 터널 시작
```bash
# 서버 실행 후 별도 터미널에서
ngrok http 8001
```

## 📊 모니터링

### 시스템 리소스 확인
```bash
# GPU 메모리 사용량
nvidia-smi

# 프로세스 확인
ps aux | grep python

# 로그 확인
tail -f llm_server.log
```

### API 상태 확인
```bash
# 모델 로드 상태
curl http://localhost:8001/health

# 응답 시간 테스트
time curl -X POST http://localhost:8001/llm \
  -H "Content-Type: application/json" \
  -d '{"message": "테스트 메시지"}'
```

## ⚠️ 트러블슈팅

### 1. GPU 메모리 부족
```bash
# GPU 메모리 확인
nvidia-smi

# 해결 방법:
# - CUDA_VISIBLE_DEVICES로 특정 GPU 지정
# - batch_size 줄이기
# - 모델 precision 변경 (float16)
```

### 2. 모델 다운로드 실패
```bash
# 수동 다운로드
python -c "
from transformers import AutoTokenizer, AutoModelForCausalLM
tokenizer = AutoTokenizer.from_pretrained('LGAI-EXAONE/EXAONE-3.5-7.8B-Instruct')
model = AutoModelForCausalLM.from_pretrained('LGAI-EXAONE/EXAONE-3.5-7.8B-Instruct')
"
```

### 3. 포트 충돌
```bash
# 포트 사용 확인
lsof -i :8001

# 다른 포트 사용
export PORT=8011
python run.py
```

## 📞 지원

문제가 발생하면 다음을 확인하세요:

1. GPU 드라이버 및 CUDA 버전
2. Python 패키지 버전 호환성  
3. 모델 다운로드 상태
4. 환경변수 설정
5. 방화벽 및 포트 설정

## 📝 라이센스

이 프로젝트는 MIT 라이센스를 따릅니다. 