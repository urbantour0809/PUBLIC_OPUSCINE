# 🌐 OpusCine Cloudtype Proxy Server

Spring 프론트엔드와 백엔드 서비스들을 연결하는 프록시 서버입니다.

## 📋 개요

이 프록시 서버는 다음과 같은 역할을 합니다:

- **Spring 백엔드 연동**: REST API 제공
- **서비스 라우팅**: LLM 서버 + API 서버 호출
- **로컬 데이터 지원**: JSON 파일에서 직접 OTT 링크 조회
- **Redis 백업**: 서비스 장애 시 백업 데이터 사용
- **Cloudtype 배포**: 프로덕션 환경 지원

## 🏗️ 시스템 아키텍처

```
[Spring Frontend] 
    ↓ HTTP REST API
[Cloudtype Proxy Server] 
    ↓ ↙ ↘
[LLM Server] [API Server] [Local JSON Data]
    ↓           ↓              ↓
[EXAONE Model] [TMDB API]   [OTT Links]
               [Redis Cache]
```

## 🚀 설치 및 실행

### 1. 의존성 설치

```bash
# Python 가상환경 생성
python -m venv proxy_env
source proxy_env/bin/activate  # Linux/Mac
# 또는
proxy_env\Scripts\activate     # Windows

# 의존성 설치
pip install -r requirements.txt
```

### 2. 환경 설정

```bash
# .env 파일 수정
nano .env

# 필수 설정
LLM_SERVER_URL=https://your-ngrok-url.ngrok.io
API_SERVER_URL=http://your-api-server:8002
```

### 3. 데이터 파일 준비

```bash
# 데이터 디렉터리 구조
data/
├── movie/
│   └── tmdb_movies_hybrid_final.json
└── tv series/
    └── tmdb_tv_series_final.json
```

### 4. 서버 실행

```bash
# 방법 1: run.py 스크립트 사용 (권장)
python run.py

# 방법 2: 직접 실행
python main.py

# 방법 3: uvicorn 직접 사용
uvicorn main:app --host 0.0.0.0 --port 8000
```

## 📡 API 엔드포인트

### Spring 연동 API

#### 1. 영화 추천
```bash
POST /api/movies/recommend
Content-Type: application/json

{
  "message": "2024년 액션 영화 추천해줘",
  "page": 1,
  "limit": 20
}
```

**응답:**
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
          "netflix": "https://netflix.com/title/12345",
          "watcha": "https://watcha.com/contents/12345"
        }
      }
    ],
    "total_results": 100,
    "total_pages": 5,
    "page": 1
  },
  "processing_time": 1.234
}
```

#### 2. OTT 링크 조회
```bash
GET /api/movies/{movie_id}/ott
```

**응답:**
```json
{
  "success": true,
  "data": {
    "movie_id": 12345,
    "ott_links": {
      "netflix": "https://netflix.com/title/12345",
      "watcha": "https://watcha.com/contents/12345",
      "tving": null,
      "coupang_play": null
    }
  },
  "source": "local_data"
}
```

### 시스템 API

#### 1. 헬스 체크
```bash
GET /
GET /health
```

#### 2. 시스템 상태
```bash
GET /status
```

#### 3. 서비스 연결 테스트
```bash
GET /test-services
```

## 🔧 설정 옵션

### 서버 설정
```env
HOST=0.0.0.0
PORT=8000
DEBUG=false
LOG_LEVEL=INFO
ENVIRONMENT=production
```

### 외부 서비스
```env
LLM_SERVER_URL=https://your-ngrok-url.ngrok.io
API_SERVER_URL=http://your-api-server:8002
```

### 데이터 소스
```env
USE_LOCAL_DATA=true
FALLBACK_TO_REDIS=true
MOVIES_DATA_FILE=./data/movie/tmdb_movies_hybrid_final.json
TV_DATA_FILE=./data/tv series/tmdb_tv_series_final.json
```

### Redis 백업
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=
```

## 🌐 Cloudtype 배포

### 1. 준비사항

- Cloudtype 계정
- GitHub 저장소
- 환경변수 설정

### 2. 배포 스크립트 사용

```bash
# 자동 배포 스크립트
python ../deployment/cloudtype_deploy.py
```

### 3. 수동 배포

1. **GitHub 연결**: Cloudtype에서 저장소 연결
2. **환경변수 설정**: 
   ```
   LLM_SERVER_URL=https://your-ngrok-url.ngrok.io
   API_SERVER_URL=http://your-api-server:8002
   USE_LOCAL_DATA=true
   ```
3. **빌드 설정**:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python run.py`
   - Port: `8000`

### 4. 도메인 설정

배포 후 제공되는 URL:
```
https://your-app-name.cloudtype.app
```

## 📊 모니터링

### 로그 확인
```bash
# 애플리케이션 로그
tail -f proxy_server.log

# 실시간 로그 (개발 모드)
python run.py
```

### 상태 확인
```bash
# 기본 상태
curl https://your-app.cloudtype.app/health

# 상세 상태
curl https://your-app.cloudtype.app/status

# 서비스 연결 테스트
curl https://your-app.cloudtype.app/test-services
```

### 성능 모니터링
```bash
# 응답 시간 테스트
time curl -X POST https://your-app.cloudtype.app/api/movies/recommend \
  -H "Content-Type: application/json" \
  -d '{"message": "액션 영화 추천"}'

# 부하 테스트
ab -c 5 -n 50 https://your-app.cloudtype.app/health
```

## 🔄 데이터 플로우

### 영화 추천 요청 플로우
1. **Spring → Proxy**: POST `/api/movies/recommend`
2. **Proxy → LLM**: 자연어 → TMDB 파라미터 변환
3. **Proxy → API**: TMDB API 호출로 영화 검색
4. **Proxy → Local**: JSON에서 OTT 링크 매칭
5. **Proxy → Spring**: 통합 결과 반환

### 데이터 소스 우선순위
1. **로컬 JSON** (가장 빠름)
2. **Redis 캐시** (백업)
3. **외부 API** (실시간)

## 🛠️ 개발 및 디버깅

### 로컬 개발
```bash
# 개발 모드 실행
export DEBUG=true
export LOG_LEVEL=DEBUG
python run.py
```

### 외부 서비스 없이 테스트
```bash
# 로컬 데이터만 사용
export USE_LOCAL_DATA=true
export LLM_SERVER_URL=""
export API_SERVER_URL=""
python run.py
```

### 로그 분석
로그에서 확인할 수 있는 정보:
- 🔍 요청 처리 시간
- 📊 데이터 소스별 응답률
- ⚠️ 에러 및 재시도 로직
- 📈 캐시 히트율

## ⚠️ 트러블슈팅

### 1. 외부 서비스 연결 실패
```bash
# ngrok URL 확인
curl https://your-ngrok-url.ngrok.io/health

# API 서버 확인
curl http://your-api-server:8002/health
```

### 2. 로컬 데이터 파일 문제
```bash
# 파일 존재 확인
ls -la data/movie/tmdb_movies_hybrid_final.json

# JSON 형식 검증
python -m json.tool data/movie/tmdb_movies_hybrid_final.json > /dev/null
```

### 3. Cloudtype 배포 문제
- **빌드 실패**: requirements.txt 확인
- **시작 실패**: 환경변수 설정 확인
- **포트 에러**: PORT=8000 설정 확인

### 4. Spring 연동 문제
```bash
# CORS 설정 확인
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://your-app.cloudtype.app/api/movies/recommend
```

## 📞 지원

문제 발생 시 확인사항:

1. **환경변수 설정** (.env 파일)
2. **데이터 파일 존재** (JSON 파일들)
3. **외부 서비스 상태** (LLM, API 서버)
4. **네트워크 연결** (방화벽, 포트)
5. **로그 내용** (에러 메시지)

## 📝 라이센스

이 프로젝트는 MIT 라이센스를 따릅니다. 