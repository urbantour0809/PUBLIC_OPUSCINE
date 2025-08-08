from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import httpx
import json
import redis
from typing import Dict, Any, List, Optional
import os
import logging
from datetime import datetime
from pathlib import Path
from contextlib import asynccontextmanager

# === 로깅 설정 ===
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('proxy_server.log')
    ]
)
logger = logging.getLogger(__name__)

# === 전역 변수 및 설정 ===
# 로컬 JSON 데이터 캐시
movie_data_cache: Optional[Dict[str, Any]] = None
tv_data_cache: Optional[Dict[str, Any]] = None
data_loaded: bool = False

# Redis 클라이언트 설정 (선택사항)
redis_client: Optional[redis.Redis] = None
redis_available: bool = False

# 외부 서버 URL 설정
LLM_SERVER_URL = os.getenv('LLM_SERVER_URL', 'http://localhost:8001')
API_SERVER_URL = os.getenv('API_SERVER_URL', 'YOUR_API_URL')

def initialize_redis():
    """Redis 클라이언트 초기화"""
    global redis_client, redis_available
    
    try:
        # Redis 설정 (Cloudtype 환경 변수 사용)
        redis_host = os.getenv('REDIS_HOST', 'localhost')
        redis_port = int(os.getenv('REDIS_PORT', 6379))
        redis_password = os.getenv('REDIS_PASSWORD', 'YOUR_REDIS_PASSWORD')
        redis_db = int(os.getenv('REDIS_DB', 0))
        
        logger.info(f"🔧 Redis 연결 시도: {redis_host}:{redis_port} (DB: {redis_db})")
        
        redis_client = redis.Redis(
            host=redis_host,
            port=redis_port,
            password=redis_password,  # 비밀번호 지원 추가
            db=redis_db,
            decode_responses=True,
            socket_connect_timeout=10,  # 타임아웃 증가
            socket_timeout=10
        )
        
        redis_available = redis_client.ping()
        logger.info(f"✅ Redis 연결 성공: {redis_host}:{redis_port}")
        
        # Redis 정보 로깅
        try:
            info = redis_client.info()
            logger.info(f"📊 Redis 정보: 버전 {info.get('redis_version', 'unknown')}, 메모리 {info.get('used_memory_human', 'unknown')}")
        except Exception as info_e:
            logger.warning(f"⚠️ Redis 정보 조회 실패: {info_e}")
            
    except Exception as e:
        redis_client = None
        redis_available = False
        logger.warning(f"⚠️ Redis 연결 실패 (로컬 JSON 데이터로 대체): {e}")
        logger.info("💡 로컬 JSON 데이터를 주 데이터 소스로 사용합니다")

def load_local_data() -> bool:
    """cloudtype-proxy/data 폴더의 JSON 파일들을 메모리에 로드"""
    global movie_data_cache, tv_data_cache, data_loaded
    
    if data_loaded:
        return True
    
    try:
        logger.info("📁 로컬 JSON 데이터 로딩 시작...")
        
        # 영화 데이터 로드
        movie_json_path = Path("data/movie/tmdb_movies_hybrid_final.json")
        if movie_json_path.exists():
            logger.info(f"📄 영화 데이터 로딩: {movie_json_path}")
            with open(movie_json_path, 'r', encoding='utf-8') as f:
                movie_data_cache = json.load(f)
            logger.info(f"✅ 영화 데이터 로드 완료: {len(movie_data_cache.get('movies', []))}개")
        else:
            logger.warning(f"⚠️ 영화 데이터 파일을 찾을 수 없음: {movie_json_path}")
            movie_data_cache = {"movies": []}
        
        # TV 시리즈 데이터 로드  
        tv_json_path = Path("data/tv series/tmdb_tv_series_final.json")
        if tv_json_path.exists():
            logger.info(f"📄 TV 시리즈 데이터 로딩: {tv_json_path}")
            with open(tv_json_path, 'r', encoding='utf-8') as f:
                tv_data_cache = json.load(f)
            # 실제 파일 구조에 맞게 수정: 'tv_series' 키 사용
            tv_count = len(tv_data_cache.get('tv_series', []))
            logger.info(f"✅ TV 시리즈 데이터 로드 완료: {tv_count}개")
            # 내부적으로는 'tv_shows' 키로 통일하여 사용
            if 'tv_series' in tv_data_cache:
                tv_data_cache['tv_shows'] = tv_data_cache['tv_series']
        else:
            logger.warning(f"⚠️ TV 시리즈 데이터 파일을 찾을 수 없음: {tv_json_path}")
            tv_data_cache = {"tv_shows": []}
        
        data_loaded = True
        logger.info("🎉 모든 로컬 데이터 로딩 완료!")
        return True
        
    except Exception as e:
        logger.error(f"❌ 로컬 데이터 로딩 실패: {e}")
        movie_data_cache = {"movies": []}
        tv_data_cache = {"tv_shows": []}
        return False

def get_ott_links_from_local_data(movie_id: int) -> List[Dict[str, Any]]:
    """로컬 JSON 데이터에서 특정 영화의 OTT 링크 조회"""
    try:
        logger.info(f"🔍 로컬 데이터에서 영화 ID {movie_id} OTT 링크 검색...")
        
        if not data_loaded:
            load_local_data()
        
        # 영화 데이터에서 검색
        if movie_data_cache and "movies" in movie_data_cache:
            for movie in movie_data_cache["movies"]:
                if movie.get("tmdb_id") == movie_id or movie.get("id") == movie_id:
                    raw_ott_links = movie.get("ott_links", [])
                    logger.info(f"🔍 원본 OTT 링크 데이터 형식: {type(raw_ott_links)}")
                    
                    # 데이터 형식 변환: 문자열 -> 딕셔너리
                    formatted_ott_links = []
                    for i, link in enumerate(raw_ott_links):
                        if isinstance(link, str):
                            # 문자열인 경우 딕셔너리로 변환
                            formatted_link = {
                                "provider_name": "Unknown",
                                "provider_id": i + 1,
                                "logo_path": "",
                                "display_priority": i + 1,
                                "link": link
                            }
                            formatted_ott_links.append(formatted_link)
                        elif isinstance(link, dict):
                            # 이미 딕셔너리인 경우 그대로 사용
                            formatted_ott_links.append(link)
                        else:
                            logger.warning(f"⚠️ 알 수 없는 OTT 링크 형식: {type(link)}")
                    
                    logger.info(f"✅ 영화 ID {movie_id} OTT 링크 발견: {len(formatted_ott_links)}개")
                    return formatted_ott_links
        
        # TV 데이터에서도 검색 (혹시 모를 경우를 대비)
        if tv_data_cache and "tv_shows" in tv_data_cache:
            for tv_show in tv_data_cache["tv_shows"]:
                if tv_show.get("tmdb_id") == movie_id or tv_show.get("id") == movie_id:
                    raw_ott_links = tv_show.get("ott_links", [])
                    # 동일한 형식 변환 적용
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
                        elif isinstance(link, dict):
                            formatted_ott_links.append(link)
                    logger.info(f"✅ TV ID {movie_id} OTT 링크 발견: {len(formatted_ott_links)}개")
                    return formatted_ott_links
        
        # 원본 tv_series 키에서도 검색 (백업)
        if tv_data_cache and "tv_series" in tv_data_cache:
            for tv_show in tv_data_cache["tv_series"]:
                if tv_show.get("tmdb_id") == movie_id or tv_show.get("id") == movie_id:
                    raw_ott_links = tv_show.get("ott_links", [])
                    # 동일한 형식 변환 적용
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
                        elif isinstance(link, dict):
                            formatted_ott_links.append(link)
                    logger.info(f"✅ TV ID {movie_id} OTT 링크 발견 (원본): {len(formatted_ott_links)}개")
                    return formatted_ott_links
        
        logger.warning(f"⚠️ 영화 ID {movie_id}에 대한 OTT 링크를 찾을 수 없음")
        return []
        
    except Exception as e:
        logger.error(f"❌ 로컬 데이터에서 OTT 링크 조회 실패 (movie_id: {movie_id}): {e}")
        return []

def get_ott_links_from_redis(movie_id: int) -> List[Dict[str, Any]]:
    """Redis에서 OTT 링크 조회"""
    try:
        if not redis_available or redis_client is None:
            return []
            
        logger.info(f"🔍 Redis에서 영화 ID {movie_id} OTT 링크 검색...")
        key = f"movie:{movie_id}:ott_links"
        ott_data = redis_client.get(key)
        
        if ott_data:
            ott_links = json.loads(ott_data)
            logger.info(f"✅ Redis에서 영화 ID {movie_id} OTT 링크 발견: {len(ott_links)}개")
            return ott_links
        else:
            logger.info(f"ℹ️ Redis에 영화 ID {movie_id} 데이터 없음")
            return []
            
    except Exception as e:
        logger.error(f"❌ Redis에서 OTT 링크 조회 실패 (movie_id: {movie_id}): {e}")
        return []

def cache_ott_links_to_redis(movie_id: int, ott_links: List[Dict[str, Any]]) -> bool:
    """OTT 링크를 Redis에 캐싱"""
    try:
        if not redis_available or redis_client is None:
            logger.warning("⚠️ Redis 사용 불가 - 캐싱 건너뛰기")
            return False
            
        key = f"movie:{movie_id}:ott_links"
        # OTT 링크 JSON으로 직렬화
        ott_data = json.dumps(ott_links, ensure_ascii=False)
        
        # 캐시 만료 시간 설정 (24시간)
        cache_ttl = 24 * 60 * 60  # 24시간
        
        # Redis에 저장
        redis_client.setex(key, cache_ttl, ott_data)
        
        logger.info(f"✅ Redis에 영화 ID {movie_id} OTT 링크 캐싱 완료 (TTL: {cache_ttl}초)")
        return True
        
    except Exception as e:
        logger.error(f"❌ Redis에 OTT 링크 캐싱 실패 (movie_id: {movie_id}): {e}")
        return False

def get_ott_links_with_caching(movie_id: int) -> List[Dict[str, Any]]:
    """캐싱을 활용한 OTT 링크 조회 (Redis 우선, 로컬 데이터 백업)"""
    try:
        logger.info(f"🔍 영화 ID {movie_id} OTT 링크 조회 시작 (캐싱 활용)")
        
        # 1. Redis에서 먼저 확인
        ott_links = get_ott_links_from_redis(movie_id)
        
        if ott_links:
            logger.info(f"✅ Redis 캐시에서 OTT 링크 발견: {len(ott_links)}개")
            return ott_links
        
        # 2. Redis에 없으면 로컬 데이터에서 검색
        logger.info(f"📁 로컬 데이터에서 영화 ID {movie_id} 검색...")
        ott_links = get_ott_links_from_local_data(movie_id)
        
        if ott_links:
            logger.info(f"✅ 로컬 데이터에서 OTT 링크 발견: {len(ott_links)}개")
            
            # 3. 로컬 데이터에서 찾은 결과를 Redis에 캐싱
            cache_success = cache_ott_links_to_redis(movie_id, ott_links)
            if cache_success:
                logger.info(f"📦 Redis 캐싱 완료 - 다음 요청부터 더 빠르게 응답")
            
            return ott_links
        
        logger.warning(f"⚠️ 영화 ID {movie_id}에 대한 OTT 링크를 찾을 수 없음")
        return []
        
    except Exception as e:
        logger.error(f"❌ OTT 링크 조회 실패 (movie_id: {movie_id}): {e}")
        return []

# === 앱 라이프사이클 관리 (Python 3.12 최신 방식) ===
@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 시 실행되는 라이프사이클 매니저"""
    # 시작 시 실행
    logger.info("🚀 OpusCine Proxy Server 시작 중...")
    logger.info(f"📍 현재 작업 디렉터리: {os.getcwd()}")
    logger.info(f"📂 데이터 폴더 존재 여부: {Path('data').exists()}")
    
    # Redis 초기화
    initialize_redis()
    
    # 로컬 데이터 로드
    load_success = load_local_data()
    logger.info(f"📊 데이터 로딩 결과: {'성공' if load_success else '실패'}")
    
    # 환경 정보 로깅
    logger.info(f"🌍 환경 변수:")
    logger.info(f"  - LLM_SERVER_URL: {LLM_SERVER_URL}")
    logger.info(f"  - API_SERVER_URL: {API_SERVER_URL}")
    logger.info(f"  - REDIS_HOST: {os.getenv('REDIS_HOST', 'localhost')}")
    logger.info(f"  - Redis 사용 가능: {redis_available}")
    
    yield  # 앱 실행
    
    # 종료 시 실행
    logger.info("🔄 OpusCine Proxy Server 종료 중...")
    if redis_client:
        try:
            redis_client.close()
            logger.info("✅ Redis 연결 정리 완료")
        except Exception as e:
            logger.warning(f"⚠️ Redis 연결 정리 실패: {e}")

# FastAPI 앱 생성 (Python 3.12 최신 방식)
app = FastAPI(
    title="OpusCine Proxy Server", 
    version="1.0.0",
    description="Spring 프론트엔드와 LLM/API 서버 간의 프록시 서버",
    lifespan=lifespan  # 새로운 라이프사이클 방식
)

# CORS 설정 (Spring 프론트엔드 연동)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 실제 배포시에는 Spring 서버 도메인으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info(f"🔗 LLM 서버 URL: {LLM_SERVER_URL}")
logger.info(f"🔗 API 서버 URL: {API_SERVER_URL}")

# === Request/Response 모델 (Python 3.12 타입 힌팅 개선) ===
class RecommendRequest(BaseModel):
    message: str = Field(..., description="사용자의 영화 추천 요청 메시지")
    user_id: Optional[str] = Field(None, description="사용자 ID (선택사항)")
    page: Optional[int] = Field(1, ge=1, description="페이지 번호 (1부터 시작)")
    limit: Optional[int] = Field(20, ge=1, le=100, description="결과 개수 제한 (1-100)")

class MovieInfo(BaseModel):
    id: int = Field(..., description="영화 ID")
    title: str = Field(..., description="영화 제목")
    original_title: str = Field(..., description="원제")
    overview: str = Field(..., description="영화 설명")
    release_date: str = Field(..., description="개봉일")
    poster_path: Optional[str] = Field(None, description="포스터 이미지 경로")
    backdrop_path: Optional[str] = Field(None, description="배경 이미지 경로")
    vote_average: float = Field(..., description="평점")
    vote_count: int = Field(..., description="투표 수")
    popularity: float = Field(..., description="인기도")
    genre_ids: List[int] = Field(default_factory=list, description="장르 ID 목록")
    ott_links: List[Dict[str, Any]] = Field(default_factory=list, description="OTT 링크 목록")

class RecommendResponse(BaseModel):
    success: bool = Field(..., description="요청 성공 여부")
    data: Optional[Dict[str, Any]] = Field(None, description="추가 데이터")
    movies: Optional[List[MovieInfo]] = Field(None, description="추천 영화 목록")
    total_results: Optional[int] = Field(None, description="전체 결과 수")
    error: Optional[str] = Field(None, description="에러 메시지")
    query_info: Optional[Dict[str, Any]] = Field(None, description="쿼리 정보")

class OTTLinksResponse(BaseModel):
    success: bool = Field(..., description="요청 성공 여부")
    movie_id: int = Field(..., description="영화 ID")
    ott_links: List[Dict[str, Any]] = Field(default_factory=list, description="OTT 링크 목록")
    error: Optional[str] = Field(None, description="에러 메시지")

# === Spring 연동 전용 엔드포인트 ===
@app.get("/")
async def root() -> Dict[str, Any]:
    """헬스 체크 엔드포인트"""
    logger.info("🏠 루트 엔드포인트 호출됨")
    return {
        "service": "OpusCine Proxy Server",
        "status": "running",
        "version": "1.0.1",  # 버전 업데이트로 새 코드 확인
        "python_version": "3.12.9",
        "spring_ready": True,
        "data_loaded": data_loaded,
        "redis_available": redis_available,
        "debug_info": "2025-06-25 코드 업데이트됨",  # 새 필드 추가
        "total_routes": len(app.routes),  # 등록된 라우트 수 표시
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/movies/recommend", response_model=RecommendResponse)
async def recommend_movies_for_spring(request: RecommendRequest) -> RecommendResponse:
    """
    Spring 프론트엔드를 위한 영화 추천 API
    경로: /api/movies/recommend
    """
    start_time = datetime.now()
    logger.info(f"🎬 영화 추천 요청 시작 - 사용자: {request.user_id}, 메시지: '{request.message}'")
    logger.info(f"📄 요청 파라미터: page={request.page}, limit={request.limit}")
    
    try:
        # 1. LLM 서버에 완전한 영화 추천 요청 (영화 데이터 포함)
        logger.info(f"🤖 LLM 서버에 영화 추천 요청 전송: {LLM_SERVER_URL}/movie-recommend")
        async with httpx.AsyncClient(timeout=30.0) as client:
            # LLM 서버의 movie-recommend 엔드포인트 요청 형식
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
            
            logger.info(f"🤖 LLM 서버 응답 상태: {llm_response.status_code}")
            
            if llm_response.status_code != 200:
                logger.error(f"❌ LLM 서버 응답 오류: {llm_response.status_code}")
                raise HTTPException(
                    status_code=500, 
                    detail=f"LLM 서버 응답 오류: {llm_response.status_code}"
                )
            
            llm_data = llm_response.json()
            logger.info(f"🤖 LLM 영화 추천 결과: success={llm_data.get('success')}")
            logger.info(f"🤖 LLM 응답 구조: {list(llm_data.keys())}")
            
            if not llm_data.get("success", False):
                logger.error(f"❌ LLM 영화 추천 실패: {llm_data.get('error', 'Unknown error')}")
                raise HTTPException(
                    status_code=500,
                    detail=f"LLM 영화 추천 실패: {llm_data.get('error', 'Unknown error')}"
                )
            
            # 2. LLM 서버로부터 완성된 영화 데이터 추출 (새로운 형식)
            movies = llm_data.get("movies", [])
            pagination = llm_data.get("pagination", {})  # 최상위로 이동됨
            query_metadata = llm_data.get("query_metadata", {})  # query_info → query_metadata
            conversation = llm_data.get("conversation", {})  # 새로 추가된 대화형 응답
            
            logger.info(f"🎬 LLM에서 받은 영화 개수: {len(movies)}개")
            logger.info(f"📄 페이지네이션 정보: {pagination}")
            logger.info(f"💬 대화형 응답 포함: {bool(conversation)}")
            
            # 3. 각 영화에 OTT 링크 추가 및 데이터 정제
            logger.info(f"📋 영화 목록 처리 시작: {len(movies)}개")
            
            # 각 영화에 OTT 링크 추가 및 None 값 처리
            for movie in movies:
                movie_id = movie.get("id")
                
                # None 값들을 안전하게 처리
                if movie.get("poster_path") is None:
                    movie["poster_path"] = ""
                if movie.get("backdrop_path") is None:
                    movie["backdrop_path"] = ""
                if movie.get("overview") is None:
                    movie["overview"] = ""
                if movie.get("release_date") is None:
                    movie["release_date"] = ""
                
                # OTT 링크 추가
                if movie_id:
                    # 로컬 데이터에서 OTT 링크 조회
                    ott_links = get_ott_links_with_caching(movie_id)
                    
                    movie["ott_links"] = ott_links
                    logger.debug(f"🔗 영화 '{movie.get('title')}' (ID: {movie_id}) OTT 링크: {len(ott_links)}개")
            
            # 처리 시간 계산
            end_time = datetime.now()
            processing_time = (end_time - start_time).total_seconds()
            logger.info(f"⏱️ 전체 처리 시간: {processing_time:.2f}초")
            
            # LLM 서버 응답을 새로운 형식에 맞게 구성 (안전한 영화 객체 생성)
            valid_movies = []
            for movie in movies:
                try:
                    movie_info = MovieInfo(**movie)
                    valid_movies.append(movie_info)
                except Exception as movie_error:
                    logger.warning(f"⚠️ 영화 데이터 변환 실패: {movie.get('title', 'Unknown')} (ID: {movie.get('id', 'Unknown')}) - {movie_error}")
                    # 계속 진행 (해당 영화만 제외)
                    continue
            
            logger.info(f"✅ 유효한 영화 데이터: {len(valid_movies)}/{len(movies)}개")
            
            result = RecommendResponse(
                success=True,
                movies=valid_movies,
                total_results=pagination.get("total_results", len(movies)),
                query_info={
                    "original_message": request.message,
                    "tmdb_parameters": query_metadata.get("tmdb_parameters", {}),  # parsed_parameters → tmdb_parameters
                    "confidence": query_metadata.get("confidence", 0.8),  # llm_confidence → confidence
                    "method": query_metadata.get("method", "movie-recommend"),  # llm_method → method
                    "reasoning": query_metadata.get("reasoning", ""),
                    "processing_time_ms": query_metadata.get("processing_time_ms", 0),
                    "proxy_processing_time_seconds": processing_time,
                    "pagination": pagination,
                    "conversation": conversation,  # 새로 추가된 대화형 응답
                    "user_intent_analysis": conversation.get("user_intent_analysis", ""),
                    "recommendation_explanation": conversation.get("recommendation_explanation", ""),
                    "follow_up_suggestions": conversation.get("follow_up_suggestions", "")
                }
            )
            
            logger.info(f"✅ 영화 추천 완료: {len(result.movies) if result.movies else 0}개 반환")
            return result
            
    except httpx.TimeoutException:
        logger.error("⏰ 서버 응답 시간 초과 (30초)")
        return RecommendResponse(
            success=False,
            error="서버 응답 시간 초과 (30초)"
        )
    except Exception as e:
        logger.error(f"❌ 영화 추천 처리 중 예외 발생: {str(e)}", exc_info=True)
        return RecommendResponse(
            success=False,
            error=f"추천 처리 중 오류 발생: {str(e)}"
        )

@app.get("/api/movies/{movie_id}/ott", response_model=OTTLinksResponse)
async def get_movie_ott_links(movie_id: int) -> OTTLinksResponse:
    """
    Spring 프론트엔드를 위한 특정 영화의 OTT 링크 조회 API
    경로: /api/movies/{movie_id}/ott
    Redis 캐싱을 활용하여 빠른 응답 제공
    """
    logger.info(f"🔗 영화 OTT 링크 조회 요청: 영화 ID {movie_id}")
    
    try:
        # 캐싱을 활용한 OTT 링크 조회 (Redis 우선, 로컬 데이터 백업)
        ott_links = get_ott_links_with_caching(movie_id)
        
        if ott_links:
            logger.info(f"✅ 영화 OTT 링크 조회 성공: 영화 ID {movie_id}, {len(ott_links)}개 링크")
            return OTTLinksResponse(
                success=True,
                movie_id=movie_id,
                ott_links=ott_links
            )
        else:
            logger.warning(f"⚠️ 영화 OTT 링크 없음: 영화 ID {movie_id}")
            return OTTLinksResponse(
                success=True,
                movie_id=movie_id,
                ott_links=[],
                error="해당 영화의 OTT 링크 정보가 없습니다."
            )
        
    except Exception as e:
        logger.error(f"❌ 영화 OTT 링크 조회 중 예외 발생 (movie_id: {movie_id}): {str(e)}", exc_info=True)
        return OTTLinksResponse(
            success=False,
            movie_id=movie_id,
            error=f"영화 OTT 링크 조회 중 오류 발생: {str(e)}"
        )

@app.get("/api/tv/{tv_id}/ott", response_model=OTTLinksResponse)
async def get_tv_ott_links(tv_id: int) -> OTTLinksResponse:
    """
    Spring 프론트엔드를 위한 특정 TV 시리즈의 OTT 링크 조회 API
    경로: /api/tv/{tv_id}/ott
    Redis 캐싱을 활용하여 빠른 응답 제공
    """
    logger.info(f"📺 TV 시리즈 OTT 링크 조회 요청: TV ID {tv_id}")
    
    try:
        # 캐싱을 활용한 OTT 링크 조회 (Redis 우선, 로컬 데이터 백업)
        ott_links = get_ott_links_with_caching(tv_id)
        
        if ott_links:
            logger.info(f"✅ TV 시리즈 OTT 링크 조회 성공: TV ID {tv_id}, {len(ott_links)}개 링크")
            return OTTLinksResponse(
                success=True,
                movie_id=tv_id,  # movie_id 필드를 재사용 (호환성)
                ott_links=ott_links
            )
        else:
            logger.warning(f"⚠️ TV 시리즈 OTT 링크 없음: TV ID {tv_id}")
            return OTTLinksResponse(
                success=True,
                movie_id=tv_id,
                ott_links=[],
                error="해당 TV 시리즈의 OTT 링크 정보가 없습니다."
            )
        
    except Exception as e:
        logger.error(f"❌ TV 시리즈 OTT 링크 조회 중 예외 발생 (tv_id: {tv_id}): {str(e)}", exc_info=True)
        return OTTLinksResponse(
            success=False,
            movie_id=tv_id,
            error=f"TV 시리즈 OTT 링크 조회 중 오류 발생: {str(e)}"
        )

@app.get("/api/movies/popular")
async def get_popular_movies(page: int = 1, limit: int = 20) -> Dict[str, Any]:
    """
    Spring 프론트엔드를 위한 인기 영화 목록 API
    """
    logger.info(f"🌟 인기 영화 목록 요청: page={page}, limit={limit}")
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # API 서버에서 인기 영화 조회
            logger.info(f"📡 API 서버에 인기 영화 요청: {API_SERVER_URL}/popular")
            response = await client.get(
                f"{API_SERVER_URL}/popular",
                params={"page": page, "limit": limit}
            )
            
            logger.info(f"📡 API 서버 응답: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"✅ 인기 영화 조회 성공: {len(result.get('movies', []))}개")
                return result
            else:
                logger.error(f"❌ 인기 영화 조회 실패: {response.status_code}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail="인기 영화 조회 실패"
                )
                
    except Exception as e:
        logger.error(f"❌ 인기 영화 조회 중 예외 발생: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"인기 영화 조회 중 오류 발생: {str(e)}"
        )

# === 기존 호환성 엔드포인트 ===
@app.post("/recommend", response_model=RecommendResponse)
async def recommend_movies_legacy(request: RecommendRequest) -> RecommendResponse:
    """기존 호환성을 위한 엔드포인트"""
    logger.info("🔄 레거시 추천 엔드포인트 호출 -> 새 엔드포인트로 리다이렉트")
    return await recommend_movies_for_spring(request)

@app.get("/view")
async def get_ott_links_legacy(movieId: int) -> Dict[str, Any]:
    """기존 호환성을 위한 엔드포인트"""
    logger.info(f"🔄 레거시 OTT 링크 엔드포인트 호출 (movieId: {movieId}) -> 새 엔드포인트로 리다이렉트")
    result = await get_movie_ott_links(movieId)
    return {
        "success": result.success,
        "movie_id": result.movie_id,
        "ott_links": result.ott_links,
        "timestamp": datetime.now().isoformat(),
        "error": result.error
    }

# === 관리용 엔드포인트 ===
@app.get("/healthz")
async def health_check_cloudtype() -> Dict[str, Any]:
    """Cloudtype용 헬스 체크 (간단 버전)"""
    logger.info("🏥 Cloudtype 헬스 체크 요청")
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """상세 헬스 체크"""
    logger.info("🏥 헬스 체크 요청")
    
    try:
        # Redis 연결 확인
        redis_status = "connected" if redis_available else "disconnected"
        
        # 외부 서버 연결 확인
        async with httpx.AsyncClient(timeout=5.0) as client:
            try:
                llm_check = await client.get(f"{LLM_SERVER_URL}/health")
                llm_status = "connected" if llm_check.status_code == 200 else "disconnected"
                logger.info(f"🤖 LLM 서버 상태: {llm_status}")
            except:
                llm_status = "disconnected"
                logger.warning("⚠️ LLM 서버 연결 실패")
                
            try:
                api_check = await client.get(f"{API_SERVER_URL}/health")
                api_status = "connected" if api_check.status_code == 200 else "disconnected"
                logger.info(f"🎥 API 서버 상태: {api_status}")
            except:
                api_status = "disconnected"
                logger.warning("⚠️ API 서버 연결 실패")
        
        health_info = {
            "proxy_server": "running",
            "python_version": "3.12.9",
            "redis": redis_status,
            "llm_server": llm_status,
            "api_server": api_status,
            "spring_ready": True,
            "data_loaded": data_loaded,
            "movie_count": len(movie_data_cache.get("movies", [])) if movie_data_cache else 0,
            "tv_count": len(tv_data_cache.get("tv_shows", [])) if tv_data_cache else 0,
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info(f"✅ 헬스 체크 완료: {health_info}")
        return health_info
        
    except Exception as e:
        logger.error(f"❌ 헬스 체크 중 예외 발생: {str(e)}", exc_info=True)
        return {
            "proxy_server": "running",
            "python_version": "3.12.9",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.get("/admin/data/reload")
async def reload_local_data() -> Dict[str, Any]:
    """관리자용: 로컬 JSON 데이터 재로드"""
    logger.info("🔄 관리자 요청: 로컬 데이터 재로드")
    
    global data_loaded
    data_loaded = False
    
    success = load_local_data()
    
    return {
        "success": success,
        "message": "데이터 재로드 완료" if success else "데이터 재로드 실패",
        "movie_count": len(movie_data_cache.get("movies", [])) if movie_data_cache else 0,
        "tv_count": len(tv_data_cache.get("tv_shows", [])) if tv_data_cache else 0,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/admin/stats")
async def get_system_stats() -> Dict[str, Any]:
    """
    관리자용: 시스템 통계
    """
    logger.info("📊 시스템 통계 요청")
    
    try:
        # 로컬 데이터 통계
        local_stats = {
            "data_loaded": data_loaded,
            "movie_count": len(movie_data_cache.get("movies", [])) if movie_data_cache else 0,
            "tv_count": len(tv_data_cache.get("tv_shows", [])) if tv_data_cache else 0,
            "data_files": {
                "movie_file_exists": Path("data/movie/tmdb_movies_hybrid_final.json").exists(),
                "tv_file_exists": Path("data/tv series/tmdb_tv_series_final.json").exists()
            }
        }
        
        # Redis 통계
        try:
            if redis_available and redis_client:
                redis_info = redis_client.info()
                redis_stats = {
                    "connected": True,
                    "total_keys": redis_client.dbsize(),
                    "used_memory": redis_info.get("used_memory_human", "unknown")
                }
            else:
                redis_stats = {"connected": False}
        except:
            redis_stats = {"connected": False, "error": "연결 실패"}
        
        # API 서버 통계
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{API_SERVER_URL}/stats")
                
                if response.status_code == 200:
                    api_stats = response.json()
                else:
                    api_stats = {"error": "API 서버 통계 조회 실패"}
        except:
            api_stats = {"error": "API 서버 연결 실패"}
        
        result = {
            "proxy_server": {
                "status": "running",
                "python_version": "3.12.9",
                "timestamp": datetime.now().isoformat()
            },
            "local_data": local_stats,
            "redis": redis_stats,
            "api_server": api_stats
        }
        
        logger.info(f"📊 시스템 통계 완료: {result}")
        return result
            
    except Exception as e:
        logger.error(f"❌ 시스템 통계 조회 중 예외 발생: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"통계 조회 중 오류 발생: {str(e)}"
        )



# === 디버깅용 Catch-All 라우트 (맨 마지막에 위치) ===
@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def catch_all_debug(path: str, request):
    """모든 요청을 캐치해서 디버깅"""
    logger.warning(f"🔍 캐치올 라우트 호출됨: {request.method} /{path}")
    logger.warning(f"🔍 Query params: {dict(request.query_params)}")
    return {
        "debug": "catch_all_route_triggered",
        "method": request.method,
        "path": path,
        "query_params": dict(request.query_params),
        "message": "이 응답이 나온다면 라우팅에 문제가 있습니다"
    }

if __name__ == "__main__":
    import uvicorn
    logger.info("🎬 OpusCine Proxy Server 수동 실행 (Python 3.12.9)")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info") 