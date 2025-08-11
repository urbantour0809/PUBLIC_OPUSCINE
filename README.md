### 🎬 OpusCine

AI 기반 영화/TV 추천 통합 모노레포입니다. Spring MVC 웹앱과 3개의 Python 서비스(프록시, TMDB API 서버, LLM 서버)로 구성되어 엔드투엔드 추천 경험을 제공합니다.

---

### 📦 모듈 구성

| 모듈 | 기술 스택 | 기본 포트 | 역할 |
|---|---|---:|---|
| `Opuscine/` | Java 17, Spring 5.3, Spring Security, MyBatis, MySQL, JSP | 8080 (Tomcat) | 웹 UI, 로그인/회원, 마이리스트, WebSocket 등 프론트엔드/백엔드 MVC |
| `cloudtype-proxy/` | Python, FastAPI, httpx, Redis(optional) | 8000 | Spring과 백엔드 서비스(LLM, API) 사이 프록시. 로컬 JSON/Redis를 활용한 OTT 링크 매칭 및 캐싱 |
| `api-server/` | Python, FastAPI, Redis, httpx | 8002 | TMDB 기반 영화/장르 조회, 상세/관리 API, Redis 초기화/상태 |
| `llm-server/` | Python, FastAPI, Transformers, PyTorch | 8001 | 자연어를 TMDB 파라미터(또는 추천 결과)로 변환하는 LLM 서버 (EXAONE 3.5-7.8B) |

---

### 🧭 아키텍처

```mermaid
flowchart LR
  A[브라우저/JSP (Opuscine)] -->|REST| B[cloudtype-proxy (8000)]
  B -->|자연어 처리| C[llm-server (8001)]
  B -->|TMDB 검색| D[api-server (8002)]
  D -->|영화·장르| E[(TMDB API)]
  D <-->|캐시| F[(Redis)]
  B -->|OTT 링크 조회| G[(Local JSON 데이터)]
```

- **데이터 소스 우선순위**: Local JSON → Redis 캐시 → 외부 API(TMDB)
- **권장 실행 순서**: Redis → llm-server → api-server → cloudtype-proxy → Opuscine

---

### ⚡ 빠른 시작 (로컬)

사전 요구사항
- **JDK 17**, **Maven**, **Python 3.11+**, **Redis 6+**
- (선택) NVIDIA GPU + CUDA 11.8+ (LLM 가속)

1) Redis 시작
- Docker: `docker run -d --name redis -p 6379:6379 redis:7-alpine`
- Windows(로컬 설치): `redis-server.exe`

2) llm-server (8001)
- 폴더 이동: `cd llm-server`
- 가상환경/의존성: 
  - PowerShell: `python -m venv .venv; .\.venv\Scripts\Activate.ps1; pip install -r requirements.txt`
- 환경변수(.env 예시)
  ```env
  MODEL_NAME=LGAI-EXAONE/EXAONE-3.5-7.8B-Instruct
  HOST=0.0.0.0
  PORT=8001
  LOG_LEVEL=INFO
  ```
- 실행: `python run.py`

3) api-server (8002)
- 폴더 이동: `cd api-server`
- 가상환경/의존성 설치 후 실행
- 환경변수(.env 예시)
  ```env
  TMDB_API_KEY=YOUR_TMDB_API_KEY
  TMDB_BASE_URL=https://api.themoviedb.org/3
  REDIS_HOST=localhost
  REDIS_PORT=6379
  HOST=0.0.0.0
  PORT=8002
  ```
- 실행: `python run.py`
- (선택) Redis 초기화: `POST /admin/init-redis`

4) cloudtype-proxy (8000)
- 폴더 이동: `cd cloudtype-proxy`
- 가상환경/의존성 설치 후 실행
- 데이터 파일 확인: `data/movie/tmdb_movies_hybrid_final.json`, `data/tv series/tmdb_tv_series_final.json`
- 환경변수(.env 예시)
  ```env
  LLM_SERVER_URL=http://localhost:8001
  API_SERVER_URL=http://localhost:8002
  USE_LOCAL_DATA=true
  FALLBACK_TO_REDIS=true
  HOST=0.0.0.0
  PORT=8000
  ```
- 실행: `python run.py`

5) Opuscine (8080)
- 폴더 이동: `cd Opuscine`
- 빌드: `mvn clean package`
- 배포: 생성된 `OpusCine.war`를 Tomcat에 배치 (기본 컨텍스트 `/OpusCine`)
- 접속: `http://localhost:8080/OpusCine` (환경에 따라 `/` 또는 `/OpusCine`)

---

### 🔑 환경변수 요약

- **공통 (프록시/연동)**
  - `LLM_SERVER_URL`: 예) `http://localhost:8001`
  - `API_SERVER_URL`: 예) `http://localhost:8002`
- **api-server**
  - `TMDB_API_KEY`(필수), `REDIS_HOST`, `REDIS_PORT`, `CACHE_TTL`, `CORS_ORIGINS`
- **cloudtype-proxy**
  - `USE_LOCAL_DATA`, `FALLBACK_TO_REDIS`, `REDIS_HOST/PORT/PASSWORD`
- **llm-server**
  - `MODEL_NAME`, `CUDA_VISIBLE_DEVICES`, `TORCH_DTYPE`, `PORT`
- **Opuscine(Spring)**
  - OAuth 클라이언트/시크릿, DB 접속 정보 등은 코드에 하드코딩하지 말고 외부 설정으로 주입 권장

---

### 📡 핵심 API 요약

- cloudtype-proxy (8000)
  - `POST /api/movies/recommend` — 자연어 요청으로 추천 목록 반환(LLM→API→OTT 링크 통합)
  - `GET /api/movies/{movie_id}/ott` — 영화 OTT 링크 조회(캐시 활용)
  - `GET /health` — 상세 헬스 체크

- api-server (8002)
  - `POST /tmdb-query` — TMDB 검색(LLM 포맷 지원), 결과에 OTT 링크 주입
  - `GET /movie/{id}` — 영화 상세 + OTT 링크
  - `GET /genres` — 장르 목록
  - `GET /health`, `GET /admin/status`, `POST /admin/init-redis`

- llm-server (8001)
  - `POST /llm` — 자연어 → TMDB 파라미터 변환(기본)
  - (환경에 따라) `POST /movie-recommend` — 완성된 추천 결과 반환 버전 사용 가능
  - `GET /health`

샘플 요청
```bash
# 추천 (proxy)
curl -X POST http://localhost:8000/api/movies/recommend \
  -H "Content-Type: application/json" \
  -d '{"message": "2024년 액션 영화 추천", "page":1, "limit":20}'

# 장르 (api)
curl http://localhost:8002/genres

# LLM 파싱 (llm)
curl -X POST http://localhost:8001/llm \
  -H "Content-Type: application/json" \
  -d '{"message": "봉준호 감독 최신 영화"}'
```

---

### 🚀 배포 힌트

- Cloudtype(Python 서비스)
  - Build: `pip install -r requirements.txt`
  - Start: `python run.py`
  - Port: `8000/8001/8002` (서비스별 상이)
  - 환경변수에 외부 URL/키를 주입
- Opuscine(Spring WAR)
  - Tomcat 9+에 배포, 컨텍스트 경로 확인(`/OpusCine`)
  - OAuth 리다이렉트 URI와 실제 서비스 도메인 일치 필요

---

### 🛡️ 보안 & 운영 체크리스트

- **비밀정보 하드코딩 금지**: OAuth 클라이언트/시크릿, 이메일 계정, TMDB 키 등은 `.env`/서버 환경변수로 관리하고 Git에 올리지 마세요.
- **CORS 제한**: 운영 환경에서는 `allow_origins`를 실제 프론트 도메인으로 제한하세요.
- **포트/방화벽**: 8000/8001/8002/8080 노출 범위 점검.
- **로그**: 각 서비스의 `*.log` 파일 로테이션/보존 정책 설정 권장.

---

### 🧪 트러블슈팅 빠른 점검

- LLM 연결 실패 → `LLM_SERVER_URL/health` 확인, GPU/torch 설치 확인
- TMDB 실패 → `TMDB_API_KEY` 유효성, 할당량/네트워크 확인
- OTT 링크 없음 → `cloudtype-proxy/data` 파일 존재/형식 확인, Redis 키 확인
- CORS 에러 → 프록시/웹앱 CORS 설정 재검토

---
