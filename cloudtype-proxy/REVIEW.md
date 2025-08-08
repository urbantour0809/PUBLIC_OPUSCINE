# OpusCine Proxy Server 코드 리뷰

## 📋 개요

이 문서는 OpusCine 프로젝트의 Proxy Server 코드(`main.py`, `run.py`)에 대한 상세한 리뷰입니다. FastAPI 기반으로 구현된 이 프록시 서버는 Spring 프론트엔드와 외부 LLM/API 서버 간의 중계 역할을 수행합니다.

## 🏗️ 시스템 아키텍처

### 전체 구조
```
Spring Frontend ↔ Proxy Server (FastAPI) ↔ External Services (LLM/API)
                        ↓
                 Data Layer (Local JSON + Redis)
```

### 핵심 구성 요소
- **Proxy Server**: FastAPI 기반 중계 서버
- **Data Layer**: 로컬 JSON 파일 + Redis 캐시 (2계층 구조)
- **External Services**: LLM 서버 + API 서버
- **Frontend Integration**: Spring Boot와의 REST API 연동

## 📁 파일별 상세 분석

### 1. main.py - 핵심 프록시 서버

#### 1.1 초기화 및 설정 (1-50행)

```python
# 전역 변수 설정
movie_data_cache: Optional[Dict[str, Any]] = None
tv_data_cache: Optional[Dict[str, Any]] = None
data_loaded: bool = False
redis_client: Optional[redis.Redis] = None
redis_available: bool = False
```

**분석:**
- **장점**: 전역 캐시를 통한 메모리 효율성
- **개선점**: 타입 힌팅이 명확하게 되어 있어 코드 가독성이 좋음
- **주의사항**: 전역 변수 사용으로 인한 멀티스레드 환경에서의 동시성 이슈 가능성

#### 1.2 Redis 초기화 함수 (34-63행)

```python
def initialize_redis():
    global redis_client, redis_available
    try:
        redis_host = os.getenv('REDIS_HOST', 'localhost')
        redis_port = int(os.getenv('REDIS_PORT', 6379))
        redis_password = os.getenv('REDIS_PASSWORD', None)
        redis_db = int(os.getenv('REDIS_DB', 0))
        
        redis_client = redis.Redis(
            host=redis_host,
            port=redis_port,
            password=redis_password,
            db=redis_db,
            decode_responses=True,
            socket_connect_timeout=10,
            socket_timeout=10
        )
        
        redis_available = redis_client.ping()
```

**분석:**
- **장점**: 
  - 환경변수를 통한 유연한 설정
  - 적절한 타임아웃 설정 (10초)
  - 예외 처리로 Redis 실패 시 graceful degradation
- **개선점**: 연결 풀링 설정 고려 필요

#### 1.3 로컬 데이터 로딩 (65-109행)

```python
def load_local_data() -> bool:
    global movie_data_cache, tv_data_cache, data_loaded
    
    if data_loaded:
        return True
    
    try:
        # 영화 데이터 로드
        movie_json_path = Path("data/movie/tmdb_movies_hybrid_final.json")
        if movie_json_path.exists():
            with open(movie_json_path, 'r', encoding='utf-8') as f:
                movie_data_cache = json.load(f)
```

**분석:**
- **장점**: 
  - 중복 로딩 방지 (`data_loaded` 플래그)
  - Path 객체 사용으로 파일 경로 처리
  - UTF-8 인코딩 명시
- **메모리 효율성**: 대용량 JSON 파일을 메모리에 전체 로드하는 방식
- **개선점**: 대용량 데이터의 경우 스트리밍 방식 고려

#### 1.4 OTT 링크 조회 로직 (111-198행)

```python
def get_ott_links_from_local_data(movie_id: int) -> List[Dict[str, Any]]:
    try:
        if not data_loaded:
            load_local_data()
        
        if movie_data_cache and "movies" in movie_data_cache:
            for movie in movie_data_cache["movies"]:
                if movie.get("tmdb_id") == movie_id  or movie.get("id") == movie_id:
                    raw_ott_links = movie.get("ott_links", [])
                    
                    # 데이터 형식 변환: 문자열 -> 딕셔너리
                    formatted_ott_links = []
                    for i, link in enumerate(raw_ott_links):
                        if isinstance(link, str):
                            formatted_link = {
                                "provider_name": "Unknown",
                                "provider_id": i + 1,
                                "logo_path": "",
                                "display_priority": i + 1,
                                "link": link
                            }
                            formatted_ott_links.append(formatted_link)
```

**분석:**
- **장점**: 
  - 다양한 데이터 형식 지원 (문자열/딕셔너리)
  - 안전한 딕셔너리 접근 (`get()` 메서드 사용)
  - 두 개의 ID 필드 지원 (`tmdb_id`, `id`)
- **성능 이슈**: O(n) 선형 탐색으로 대용량 데이터에서 비효율적
- **개선점**: 해시맵 인덱싱으로 O(1) 조회 구현 필요

#### 1.5 라이프사이클 관리 (222-252행)

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 시작 시 실행
    logger.info("🚀 OpusCine Proxy Server 시작 중...")
    initialize_redis()
    load_success = load_local_data()
    
    yield  # 앱 실행
    
    # 종료 시 실행
    logger.info("🔄 OpusCine Proxy Server 종료 중...")
    if redis_client:
        try:
            redis_client.close()
        except Exception as e:
            logger.warning(f"⚠️ Redis 연결 정리 실패: {e}")
```

**분석:**
- **장점**: 
  - Python 3.12 최신 방식 사용
  - 적절한 리소스 정리
  - 상세한 로깅
- **모범 사례**: 최신 FastAPI 패턴 활용

#### 1.6 핵심 API 엔드포인트 (318-429행)

```python
@app.post("/api/movies/recommend", response_model=RecommendResponse)
async def recommend_movies_for_spring(request: RecommendRequest) -> RecommendResponse:
    start_time = datetime.now()
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        llm_request_data = {
            "message": request.message,
            "user_id": request.user_id or "anonymous",
            "context": {
                "page": request.page,
                "limit": request.limit
            }
        }
        
        llm_response = await client.post(
            f"{LLM_SERVER_URL}/movie-recommend",
            json=llm_request_data
        )
```

**분석:**
- **장점**: 
  - 비동기 HTTP 클라이언트 사용
  - 적절한 타임아웃 설정 (30초)
  - 성능 모니터링 (처리 시간 측정)
  - 상세한 로깅
- **개선점**: 
  - 서킷 브레이커 패턴 미적용
  - 재시도 로직 부재

### 2. run.py - 환경 체크 및 실행 스크립트

#### 2.1 시스템 체크 함수들

```python
def check_python_version() -> bool:
    version_info = sys.version_info
    if version_info >= (3, 12):
        print("✅ Python 3.12+ 지원됨")
        return True
    elif version_info >= (3, 11):
        print("⚠️ Python 3.11 감지됨. 3.12+ 권장")
        return True
```

**분석:**
- **장점**: 
  - 명확한 버전 체크
  - 사용자 친화적인 메시지
  - 유연한 버전 지원
- **실용성**: 배포 전 환경 검증으로 런타임 오류 방지

#### 2.2 비동기 서비스 체크

```python
async def check_external_services() -> List[bool]:
    services_status: List[bool] = []
    
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(f"{llm_url}/health")
        if response.status_code == 200:
            services_status.append(True)
```

**분석:**
- **장점**: 
  - 비동기 방식으로 성능 최적화
  - 외부 의존성 사전 검증
  - 명확한 상태 반환

## 🔍 주요 설계 패턴 분석

### 1. 데이터 액세스 패턴

**2계층 캐시 구조:**
1. **1차**: 메모리 내 JSON 캐시 (빠른 접근)
2. **2차**: Redis 백업 캐시 (분산 환경 지원)

```python
# 로컬 데이터에서 먼저 조회
ott_links = get_ott_links_from_local_data(movie_id)

# 로컬에서 찾지 못한 경우 Redis에서 조회
if not ott_links and redis_available:
    ott_links = get_ott_links_from_redis(movie_id)
```

### 2. 에러 핸들링 패턴

**Graceful Degradation:**
```python
try:
    redis_available = redis_client.ping()
except Exception as e:
    redis_client = None
    redis_available = False
    logger.warning(f"⚠️ Redis 연결 실패 (로컬 JSON 데이터로 대체): {e}")
```

### 3. 응답 형식 표준화

**Pydantic 모델 활용:**
```python
class RecommendResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    movies: Optional[List[MovieInfo]] = None
    total_results: Optional[int] = None
    error: Optional[str] = None
```

## ⚡ 성능 분석

### 강점
1. **메모리 캐싱**: JSON 데이터 사전 로드로 빠른 응답
2. **비동기 처리**: httpx를 통한 non-blocking I/O
3. **연결 풀링**: httpx AsyncClient의 자동 연결 관리

### 개선 영역
1. **검색 성능**: O(n) 선형 탐색 → O(1) 해시맵 조회
2. **메모리 사용량**: 대용량 JSON 전체 로드 방식
3. **동시성**: 전역 변수 사용으로 인한 스레드 안전성 이슈

## 🛡️ 보안 고려사항

### 현재 구현
- **CORS 설정**: 모든 origin 허용 (`allow_origins=["*"]`)
- **입력 검증**: Pydantic을 통한 자동 검증
- **로깅**: 민감정보 제외한 적절한 로깅

### 개선 필요사항
1. **CORS 제한**: 프로덕션에서 특정 도메인으로 제한
2. **인증/인가**: API 키 또는 JWT 토큰 검증
3. **Rate Limiting**: DDoS 방지를 위한 요청 제한
4. **입력 검증**: SQL Injection, XSS 방지 강화

## 📊 코드 품질 평가

### 우수한 점
- **타입 힌팅**: Python 3.12 최신 문법 활용
- **구조화**: 명확한 함수 분리와 책임 분담
- **로깅**: 상세하고 구조화된 로그 메시지
- **문서화**: 함수별 docstring과 주석
- **에러 처리**: 포괄적인 예외 처리

### 개선 영역
- **테스트**: 단위 테스트 부재
- **설정 관리**: 환경별 설정 파일 필요
- **모니터링**: 메트릭 수집 및 알림 시스템
- **배포**: Docker 컨테이너화 고려

## 🔄 데이터 흐름 분석

### 영화 추천 플로우
1. **Spring Frontend** → POST `/api/movies/recommend`
2. **Proxy Server** → 요청 검증 및 로깅
3. **LLM Server** → 영화 추천 AI 처리
4. **Data Layer** → OTT 링크 정보 조회
5. **Response** → 통합된 영화 + OTT 정보 반환

### OTT 링크 조회 플로우
1. **Frontend** → GET `/api/movies/{id}/ott`
2. **Local Cache** → 메모리 내 JSON 검색
3. **Redis Fallback** → 로컬 실패 시 Redis 조회
4. **Format & Return** → 표준화된 응답 형식

## 📈 성능 최적화 제안

### 1. 데이터 인덱싱
```python
# 현재: O(n) 선형 탐색
for movie in movie_data_cache["movies"]:
    if movie.get("tmdb_id") == movie_id:
        return movie

# 제안: O(1) 해시맵 조회
movie_index = {movie["tmdb_id"]: movie for movie in movie_data_cache["movies"]}
return movie_index.get(movie_id)
```

### 2. 스트리밍 데이터 로딩
```python
# 대용량 JSON 파일의 점진적 로딩
import ijson

def load_streaming_data(file_path):
    with open(file_path, 'rb') as file:
        for movie in ijson.items(file, 'movies.item'):
            yield movie
```

### 3. 캐시 만료 정책
```python
from datetime import datetime, timedelta

cache_expiry = {
    "loaded_at": datetime.now(),
    "ttl": timedelta(hours=24)
}
```

## 🚀 배포 및 운영 고려사항

### 1. 환경별 설정
- **개발환경**: 로컬 JSON + 개발 서버
- **스테이징**: Redis + 테스트 서버
- **프로덕션**: Redis 클러스터 + 로드밸런서

### 2. 모니터링 지표
- **응답 시간**: API 엔드포인트별 평균/최대 응답시간
- **에러율**: HTTP 4xx/5xx 오류 비율
- **처리량**: 초당 요청 수 (RPS)
- **리소스 사용량**: CPU, 메모리, 네트워크

### 3. 로그 관리
```python
# 구조화된 로깅 (JSON 형식)
import structlog

logger = structlog.get_logger()
logger.info("movie_recommendation_completed", 
           user_id=user_id, 
           movie_count=len(movies),
           processing_time_ms=processing_time)
```

## 📋 개선 우선순위

### 높음 (Critical)
1. **검색 성능 최적화**: 해시맵 인덱싱 구현
2. **보안 강화**: CORS 제한, 인증 시스템
3. **에러 처리**: 서킷 브레이커, 재시도 로직

### 중간 (Important)
1. **테스트 코드**: 단위/통합 테스트 작성
2. **모니터링**: 메트릭 수집 시스템
3. **설정 관리**: 환경별 설정 분리

### 낮음 (Nice to have)
1. **Docker화**: 컨테이너 배포 환경
2. **API 문서**: OpenAPI/Swagger 문서화
3. **캐시 최적화**: TTL, LRU 정책 적용

## 🎯 결론

OpusCine Proxy Server는 전반적으로 잘 구조화된 코드베이스를 가지고 있습니다. FastAPI의 최신 기능을 적절히 활용하고 있으며, 에러 처리와 로깅이 체계적으로 구현되어 있습니다.

**주요 강점:**
- 명확한 아키텍처와 책임 분리
- 포괄적인 에러 처리
- 상세한 로깅 시스템
- 최신 Python 문법 활용

**핵심 개선 과제:**
- 데이터 검색 성능 최적화
- 보안 정책 강화
- 테스트 커버리지 확보
- 모니터링 시스템 구축

전체적으로 프로덕션 환경에 배포하기에 적합한 수준의 코드 품질을 유지하고 있으며, 제안된 개선사항들을 순차적으로 적용한다면 더욱 안정적이고 확장 가능한 시스템으로 발전할 수 있을 것입니다.
