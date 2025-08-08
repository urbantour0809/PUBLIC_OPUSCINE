# 🎬 OpusCine API Server

TMDB API와 Redis를 사용한 영화 데이터 관리 서버입니다.

## 📋 요구사항

### 소프트웨어
- Python 3.11+
- Redis Server 6.0+
- TMDB API Key

### 외부 서비스
- **TMDB API**: 영화 데이터 조회
- **Redis**: 캐시 및 OTT 링크 저장

## 🚀 설치 및 실행

### 1. 의존성 설치

```bash
# Python 가상환경 생성 (권장)
python -m venv api_env
source api_env/bin/activate  # Linux/Mac
# 또는
api_env\Scripts\activate     # Windows

# 의존성 설치
pip install -r requirements.txt
```

### 2. Redis 서버 시작

```bash
# Linux/Mac
redis-server

# Windows (Redis 설치 후)
redis-server.exe

# Docker 사용
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### 3. TMDB API 키 설정

1. [TMDB 웹사이트](https://www.themoviedb.org/)에서 계정 생성
2. API 키 발급 받기
3. `.env` 파일에 API 키 설정

### 4. 환경 설정

```bash
# .env 파일 수정
nano .env

# 필수 설정
TMDB_API_KEY=your_actual_tmdb_api_key_here
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 5. 서버 실행

```bash
# 방법 1: run.py 스크립트 사용 (권장)
python run.py

# 방법 2: 직접 실행
python app.py

# 방법 3: uvicorn 직접 사용
uvicorn app:app --host 0.0.0.0 --port 8002
```

### 6. 데이터 초기화

```bash
# 서버 실행 후 별도 터미널에서
curl -X POST http://localhost:8002/admin/initialize-data
```

## 📡 API 엔드포인트

### 기본 정보
- **기본 URL**: `http://localhost:8002`
- **Content-Type**: `application/json`

### 주요 엔드포인트

#### 1. 헬스 체크
```bash
GET /
GET /health
```

#### 2. 영화 검색
```bash
POST /search-movies
Content-Type: application/json

{
  "genre_ids": [28, 12],
  "year": 2024,
  "language": "ko-KR",
  "sort_by": "popularity.desc",
  "page": 1
}
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": 12345,
        "title": "영화 제목",
        "overview": "영화 설명",
        "release_date": "2024-01-01",
        "vote_average": 8.5,
        "poster_path": "/poster.jpg",
        "ott_links": {
          "netflix": "https://netflix.com/...",
          "watcha": "https://watcha.com/..."
        }
      }
    ],
    "total_results": 100,
    "total_pages": 5,
    "page": 1
  }
}
```

#### 3. OTT 링크 조회
```bash
GET /ott-links/{movie_id}
```

#### 4. 장르 목록
```bash
GET /genres
```

#### 5. 관리자 기능
```bash
# 데이터 초기화
POST /admin/initialize-data

# 캐시 정리
POST /admin/clear-cache

# 시스템 상태
GET /admin/status
```

## 🔧 설정 옵션

### TMDB API 설정
```env
TMDB_API_KEY=fbdca01cbe9008fcc8e7fd7dd6c1ba9c
TMDB_BASE_URL=https://api.themoviedb.org/3
TMDB_LANGUAGE=ko-KR
TMDB_REGION=KR
```

### Redis 설정
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=
REDIS_TIMEOUT=5
```

### 캐시 설정
```env
CACHE_TTL=3600
CACHE_PREFIX=opus_
```

### 서버 설정
```env
HOST=0.0.0.0
PORT=8002
DEBUG=false
LOG_LEVEL=INFO
```

## 🐳 Docker 실행

### docker-compose.yml
```yaml
version: '3.8'

services:
  api-server:
    build: .
    ports:
      - "8002:8002"
    environment:
      - TMDB_API_KEY=${TMDB_API_KEY}
      - REDIS_HOST=redis
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### 실행
```bash
# 환경변수 설정
echo "TMDB_API_KEY=your_key_here" > .env

# 서비스 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f api-server
```

## 🚀 Cloudtype 배포 설정

### 필수 환경변수
```bash
# TMDB API 설정
TMDB_API_KEY=your_actual_tmdb_api_key_here
TMDB_BASE_URL=https://api.themoviedb.org/3
TMDB_LANGUAGE=ko-KR
TMDB_REGION=KR

# Redis 설정
REDIS_HOST=your_redis_host
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=your_redis_password

# 서버 설정
HOST=0.0.0.0
PORT=8080

# 서비스 간 통신 URL
PROXY_SERVER_URL=https://port-0-opuscine-mca2bgqj5003cb7a.sel5.cloudtype.app
LLM_SERVER_URL=https://your-ngrok-url.ngrok.io
API_SERVER_URL=https://your-api-server.cloudtype.app

# 통신 설정
HTTP_TIMEOUT=30
REQUEST_TIMEOUT=60
API_SECRET_KEY=your_service_secret_key

# CORS 설정
CORS_ORIGINS=["https://your-spring-frontend.com", "https://port-0-opuscine-mca2bgqj5003cb7a.sel5.cloudtype.app"]

# 로깅 및 디버깅
LOG_LEVEL=INFO
DEBUG=false
```

### 배포 설정
- **빌드 명령어**: `pip install -r requirements.txt`
- **시작 명령어**: `python run.py`
- **포트**: `8080`
- **Python 버전**: `3.11+`

### 배포 후 초기화
```bash
# 헬스 체크
curl https://your-api-server.cloudtype.app/health

# Redis 데이터 초기화
curl -X POST https://your-api-server.cloudtype.app/init-redis

# 서비스 연결 테스트
curl https://your-api-server.cloudtype.app/genres
```

### 서비스 흐름 테스트
```bash
# 1. 프록시 서버 상태 확인
curl https://port-0-opuscine-mca2bgqj5003cb7a.sel5.cloudtype.app/

# 2. API 서버 영화 검색 테스트
curl -X POST https://your-api-server.cloudtype.app/tmdb-query \
  -H "Content-Type: application/json" \
  -d '{"parameters": {"with_genres": "28", "year": "2025", "sort_by": "popularity.desc"}}'

# 3. LLM 서버 연결 테스트 (ngrok URL)
curl https://your-ngrok-url.ngrok.io/health
```

## 📊 모니터링

### 시스템 상태 확인
```bash
# API 서버 상태
curl http://localhost:8002/health

# Redis 연결 상태
redis-cli ping

# 관리자 대시보드
curl http://localhost:8002/admin/status
```

### 로그 확인
```bash
# 애플리케이션 로그
tail -f api_server.log

# Redis 로그
redis-cli monitor

# 시스템 리소스
htop
```

### 성능 테스트
```bash
# 단일 요청 테스트
time curl -X POST http://localhost:8002/search-movies \
  -H "Content-Type: application/json" \
  -d '{"genre_ids": [28], "year": 2024}'

# 부하 테스트 (Apache Bench)
ab -c 10 -n 100 http://localhost:8002/health
```

## 🗄️ 데이터 관리

### Redis 데이터 구조
```
opus_movies:{movie_id} - 영화 정보 캐시
opus_ott:{movie_id} - OTT 링크 정보
opus_genres - 장르 목록
opus_search:{hash} - 검색 결과 캐시
```

### 데이터 백업
```bash
# Redis 백업
redis-cli BGSAVE

# 백업 파일 위치 확인
redis-cli CONFIG GET dir

# 백업 파일 복사
cp /var/lib/redis/dump.rdb ./backup_$(date +%Y%m%d).rdb
```

### 데이터 복원
```bash
# Redis 서버 중지
sudo systemctl stop redis

# 백업 파일 복원
sudo cp backup_20240101.rdb /var/lib/redis/dump.rdb
sudo chown redis:redis /var/lib/redis/dump.rdb

# Redis 서버 재시작
sudo systemctl start redis
```

## ⚠️ 트러블슈팅

### 1. TMDB API 에러
```bash
# API 키 확인
curl "https://api.themoviedb.org/3/configuration?api_key=YOUR_API_KEY"

# 일일 제한 확인
curl -I "https://api.themoviedb.org/3/movie/popular?api_key=YOUR_API_KEY"
```

### 2. Redis 연결 실패
```bash
# Redis 서버 상태 확인
redis-cli ping

# Redis 서버 시작
sudo systemctl start redis

# Redis 로그 확인
sudo journalctl -u redis
```

### 3. 메모리 부족
```bash
# Redis 메모리 사용량 확인
redis-cli INFO memory

# 캐시 정리
curl -X POST http://localhost:8002/admin/clear-cache

# 메모리 사용량 모니터링
watch -n 1 'redis-cli INFO memory | grep used_memory_human'
```

### 4. 성능 최적화
```bash
# Redis 설정 최적화
redis-cli CONFIG SET maxmemory 1gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# 캐시 TTL 조정
export CACHE_TTL=7200  # 2시간
```

## 📞 지원

문제가 발생하면 다음을 확인하세요:

1. **TMDB API 키 유효성**
2. **Redis 서버 상태**
3. **네트워크 연결**
4. **환경변수 설정**
5. **로그 파일 내용**

### 유용한 명령어
```bash
# 전체 상태 확인
python -c "
import asyncio
from run import main
asyncio.run(main())
"

# 연결 테스트
python -c "
import redis
r = redis.Redis()
print('Redis:', r.ping())
"
```

## 📝 라이센스

이 프로젝트는 MIT 라이센스를 따릅니다. 