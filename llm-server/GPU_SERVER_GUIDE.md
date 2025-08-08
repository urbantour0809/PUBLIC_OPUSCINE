# 🖥️ OpusCine LLM Linux GPU 서버 설정 가이드

## 📋 시스템 요구사항

### 하드웨어
- **GPU**: NVIDIA GPU (16GB+ VRAM 권장)
- **RAM**: 32GB+ 권장
- **Storage**: 50GB+ 여유 공간

### 소프트웨어
- **OS**: Linux (WSL 지원)
- **Python**: 3.8+
- **CUDA**: 11.8+
- **Anaconda**: 설치됨 (gpu 환경 활성화)

## 🚀 빠른 설정 (WSL 환경)

### 1단계: WSL 및 conda 환경 준비
```bash
# WSL 실행
wsl

# conda gpu 환경 활성화
conda activate gpu

# 프로젝트 디렉터리로 이동
cd /path/to/llm-server
```

### 2단계: 서버 환경 설정
```bash
# 설정 스크립트 실행 권한 부여
chmod +x gpu_server_setup.sh start_llm_server.sh setup_ngrok.sh

# GPU 서버 환경 설정 실행
./gpu_server_setup.sh
```

### 3단계: ngrok 토큰 설정
```bash
# ngrok 계정에서 토큰 획득 후 설정
ngrok config add-authtoken YOUR_NGROK_TOKEN
```

### 4단계: 서버 시작
```bash
# 터미널 1: LLM 서버 시작
./start_llm_server.sh

# 터미널 2: ngrok 터널 시작 (새 터미널에서)
./setup_ngrok.sh
```

## 🔧 상세 설정

### 환경변수 설정 (.env)
```env
# LLM 모델 설정
MODEL_NAME=LGAI-EXAONE/EXAONE-3.5-7.8B-Instruct
MODEL_CACHE_DIR=./model_cache
TORCH_DTYPE=bfloat16
DEVICE_MAP=auto

# 서버 설정
HOST=0.0.0.0
PORT=8001
DEBUG=false
LOG_LEVEL=INFO

# GPU 설정
CUDA_VISIBLE_DEVICES=0
LOW_CPU_MEM_USAGE=true

# TMDB API
TMDB_API_KEY=fbdca01cbe9008fcc8e7fd7dd6c1ba9c

# ngrok 고정 도메인 (선택사항)
NGROK_DOMAIN=your-domain.ngrok-free.app
```

### 수동 실행 방법
```bash
# 1. 환경변수 로드
source .env

# 2. LLM 서버 실행
python run.py

# 3. ngrok 터널 (별도 터미널)
ngrok http 8001
```

## 📡 API 엔드포인트

### 헬스 체크
```bash
# 로컬
curl http://localhost:8001/health

# ngrok URL
curl https://your-ngrok-url.app/health
```

### LLM 자연어 처리
```bash
curl -X POST https://your-ngrok-url.app/llm \
  -H "Content-Type: application/json" \
  -d '{
    "message": "2024년 액션 영화 추천해줘"
  }'
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

### 테스트 파싱
```bash
curl -X POST https://your-ngrok-url.app/test-parse \
  -H "Content-Type: application/json" \
  -d '{
    "message": "봉준호 감독의 최신 스릴러 영화"
  }'
```

## 🔍 모니터링 및 디버깅

### GPU 상태 확인
```bash
# GPU 메모리 사용량
nvidia-smi

# 실시간 모니터링
watch -n 1 nvidia-smi
```

### 서버 로그 확인
```bash
# 실시간 로그
tail -f nohup.out

# 특정 로그 필터링
grep "ERROR" nohup.out
```

### 프로세스 관리
```bash
# 실행 중인 Python 프로세스 확인
ps aux | grep python

# 포트 사용 확인
lsof -i :8001

# 프로세스 종료
kill -9 <PID>
```

## 🌐 ngrok 고급 설정

### 고정 도메인 사용
```bash
# ngrok 유료 계정의 고정 도메인
ngrok http 8001 --domain=your-domain.ngrok-free.app
```

### ngrok 설정 파일
```yaml
# ~/.ngrok2/ngrok.yml
version: "2"
authtoken: YOUR_TOKEN
tunnels:
  llm-server:
    addr: 8001
    proto: http
    domain: your-domain.ngrok-free.app
```

### 터널 실행
```bash
# 설정 파일 기반 실행
ngrok start llm-server
```

## ⚠️ 트러블슈팅

### 1. GPU 메모리 부족
```bash
# GPU 메모리 정리
python -c "
import torch
torch.cuda.empty_cache()
print('GPU 메모리 정리 완료')
"

# 모델 precision 변경
export TORCH_DTYPE=float16
```

### 2. 모델 다운로드 실패
```bash
# 수동 다운로드
python -c "
from transformers import AutoTokenizer, AutoModelForCausalLM
tokenizer = AutoTokenizer.from_pretrained('LGAI-EXAONE/EXAONE-3.5-7.8B-Instruct')
print('토크나이저 다운로드 완료')
"
```

### 3. 포트 충돌
```bash
# 사용 중인 프로세스 종료
sudo lsof -ti:8001 | xargs kill -9

# 다른 포트 사용
export PORT=8011
./start_llm_server.sh
```

### 4. ngrok 연결 실패
```bash
# ngrok 상태 확인
ngrok config check

# 토큰 재설정
ngrok config add-authtoken NEW_TOKEN
```

## 📞 Cloudtype 연동

### 환경변수 업데이트
Cloudtype 대시보드에서 다음 환경변수 추가:

```env
# ngrok URL 설정
LLM_SERVER_URL=https://your-ngrok-url.app

# 기타 설정
ENVIRONMENT=production
USE_LOCAL_DATA=true
```

### 연동 테스트
```bash
# Cloudtype에서 LLM 서버 호출 테스트
curl -X POST https://your-cloudtype-app.app/api/movies/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "message": "2024년 액션 영화 추천해줘"
  }'
```

## 🎯 전체 플로우

```
[사용자 요청] 
    ↓
[Spring Frontend] 
    ↓
[Cloudtype Proxy Server] 
    ↓
[ngrok Tunnel] 
    ↓
[Linux GPU LLM Server] 
    ↓
[EXAONE 3.5-7.8B 모델]
    ↓
[TMDB API 파라미터 변환]
    ↓
[결과 반환]
```

## 🔄 자동 시작 설정

### systemd 서비스 생성
```bash
# 서비스 파일 생성
sudo nano /etc/systemd/system/opus-llm.service
```

```ini
[Unit]
Description=OpusCine LLM Server
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/llm-server
Environment=PATH=/home/your-username/anaconda3/envs/gpu/bin
ExecStart=/home/your-username/anaconda3/envs/gpu/bin/python run.py
Restart=always

[Install]
WantedBy=multi-user.target
```

### 서비스 활성화
```bash
sudo systemctl daemon-reload
sudo systemctl enable opus-llm
sudo systemctl start opus-llm
```

## 📈 성능 최적화

### GPU 메모리 최적화
```env
# .env 파일에 추가
LOW_CPU_MEM_USAGE=true
LOAD_IN_8BIT=true
TORCH_COMPILE=true
```

### 병렬 처리 설정
```env
MAX_CONCURRENT_REQUESTS=4
REQUEST_TIMEOUT=30
```

이제 WSL에서 `conda activate gpu` 후 `./gpu_server_setup.sh`를 실행하여 완전한 LLM GPU 서버를 설정할 수 있습니다! 🚀 