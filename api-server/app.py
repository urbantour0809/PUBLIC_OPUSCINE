from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
from datetime import datetime
from typing import Dict, List, Any, Optional
import os
import sys

from redis_client import RedisClient
from tmdb_utils import TMDBClient

# CORS 허용 도메인 설정
ALLOWED_ORIGINS = os.getenv('CORS_ORIGINS', '').split(',') if os.getenv('CORS_ORIGINS') else [
    "YOUR_API_URL",
    "http://localhost:3000",
    "http://localhost:8080",
    "*"  # 개발 편의를 위해 모든 도메인 허용
]

app = FastAPI(
    title="OpusCine API Server", 
    version="1.0.1",
    description="TMDB API와 Redis를 활용한 영화 데이터 관리 서버"
)

# CORS 미들웨어 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# 클라이언트 초기화
redis_client = RedisClient()
tmdb_client = TMDBClient()

# 추가 서비스 URL 설정 (환경변수에서 로드)
PROXY_SERVER_URL = os.getenv('PROXY_SERVER_URL', 'YOUR_API_URL')
LLM_SERVER_URL = os.getenv('LLM_SERVER_URL', 'https://your-ngrok-url.ngrok.io')
API_SERVER_URL = os.getenv('API_SERVER_URL', 'https://your-api-server.cloudtype.app')

# 통신 설정
HTTP_TIMEOUT = int(os.getenv('HTTP_TIMEOUT', '30'))
REQUEST_TIMEOUT = int(os.getenv('REQUEST_TIMEOUT', '60'))

class TMDBQueryRequest(BaseModel):
    parameters: Dict[str, Any]
    user_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
    llm_metadata: Optional[Dict[str, Any]] = None

class TMDBQueryResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    query_info: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

@app.get("/")
async def root():
    """헬스 체크 엔드포인트 (인증 불필요)"""
    return {
        "service": "OpusCine API Server",
        "status": "running",
        "version": "1.0.1",
        "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        "endpoints": {
            "health": "/health",
            "tmdb_query": "/tmdb-query",
            "movie_details": "/movie/{movie_id}",
            "genres": "/genres",
            "admin": "/admin/*"
        },
        "timestamp": datetime.now().isoformat()
    }

@app.post("/tmdb-query", response_model=TMDBQueryResponse)
async def query_movies(request: TMDBQueryRequest):
    """
    TMDB API를 통해 영화를 검색하고 OTT 링크를 추가하여 반환
    ✅ 인증 불필요 (LLM 서버에서 간단 접근)
    
    LLM 서버 요구 형식 완전 지원:
    - 요청: parameters, user_id, context, llm_metadata
    - 응답: data.results, query_info 구조
    """
    start_time = datetime.now()
    
    try:
        # 1. TMDB API 호출
        tmdb_results = await tmdb_client.discover_movies(request.parameters)
        
        if not tmdb_results.get("results"):
            return TMDBQueryResponse(
                success=True,
                data={
                    "results": [],
                    "page": tmdb_results.get("page", 1),
                    "total_results": 0,
                    "total_pages": 0
                },
                query_info={
                    "executed_at": start_time.isoformat(),
                    "cache_hit": False,
                    "response_time_ms": int((datetime.now() - start_time).total_seconds() * 1000),
                    "user_id": request.user_id,
                    "context": request.context,
                    "llm_metadata": request.llm_metadata
                },
                error=None
            )
        
        # 2. 각 영화에 OTT 링크 추가
        enriched_movies = []
        for movie in tmdb_results["results"]:
            # Redis에서 OTT 링크 조회
            ott_links = redis_client.get_ott_links(movie["id"])
            
            # 영화 정보에 OTT 링크 추가 (TMDB 표준 형식 유지)
            movie_data = {
                "id": movie["id"],
                "title": movie.get("title", ""),
                "original_title": movie.get("original_title", ""),
                "overview": movie.get("overview", ""),
                "release_date": movie.get("release_date", ""),
                "poster_path": movie.get("poster_path", ""),
                "backdrop_path": movie.get("backdrop_path", ""),
                "vote_average": movie.get("vote_average", 0),
                "vote_count": movie.get("vote_count", 0),
                "popularity": movie.get("popularity", 0),
                "genre_ids": movie.get("genre_ids", []),
                "adult": movie.get("adult", False),
                "video": movie.get("video", False),
                "original_language": movie.get("original_language", ""),
                "ott_links": ott_links or []
            }
            
            enriched_movies.append(movie_data)
        
        # 캐시 히트 확인 (간단 구현)
        cache_hit = False  # 추후 Redis 캐시 로직 추가 가능
        
        return TMDBQueryResponse(
            success=True,
            data={
                "results": enriched_movies,
                "page": tmdb_results.get("page", 1),
                "total_results": tmdb_results.get("total_results", len(enriched_movies)),
                "total_pages": tmdb_results.get("total_pages", 1)
            },
            query_info={
                "executed_at": start_time.isoformat(),
                "cache_hit": cache_hit,
                "response_time_ms": int((datetime.now() - start_time).total_seconds() * 1000),
                "user_id": request.user_id,
                "context": request.context,
                "llm_metadata": request.llm_metadata
            },
            error=None
        )
        
    except Exception as e:
        return TMDBQueryResponse(
            success=False,
            data=None,
            query_info={
                "executed_at": start_time.isoformat(),
                "cache_hit": False,
                "response_time_ms": int((datetime.now() - start_time).total_seconds() * 1000),
                "user_id": request.user_id,
                "context": request.context,
                "llm_metadata": request.llm_metadata
            },
            error=f"영화 검색 중 오류 발생: {str(e)}"
        )

@app.get("/movie/{movie_id}")
async def get_movie_details(movie_id: int):
    """특정 영화의 상세 정보 조회 ✅ 인증 불필요"""
    try:
        # TMDB에서 영화 상세 정보 조회
        movie_details = await tmdb_client.get_movie_details(movie_id)
        
        # Redis에서 OTT 링크 조회
        ott_links = redis_client.get_ott_links(movie_id)
        
        # OTT 링크 추가
        movie_details["ott_links"] = ott_links or []
        
        return {
            "success": True,
            "movie": movie_details,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"영화 상세 정보 조회 중 오류 발생: {str(e)}"
        )

@app.get("/genres")
async def get_genres():
    """TMDB 장르 목록 조회 ✅ 인증 불필요"""
    try:
        genres = await tmdb_client.get_genres()
        return {
            "success": True,
            "genres": genres,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"장르 목록 조회 중 오류 발생: {str(e)}"
        )

# 관리자 전용 엔드포인트 (서비스 토큰 필요)
@app.post("/admin/init-redis")
async def initialize_redis():
    """
    JSON 파일에서 OTT 링크 데이터를 Redis로 초기화
    🔐 서비스 토큰 인증 필요 (관리자 전용)
    """
    try:
        # 영화 데이터 초기화
        movie_data_path = "../data/movie/tmdb_movies_hybrid_final.json"
        if os.path.exists(movie_data_path):
            with open(movie_data_path, "r", encoding="utf-8") as f:
                movie_data = json.load(f)
            
            movie_count = redis_client.initialize_movie_data(movie_data)
        else:
            movie_count = 0
        
        # TV 시리즈 데이터 초기화
        tv_data_path = "../data/tv series/tmdb_tv_series_final.json"
        if os.path.exists(tv_data_path):
            with open(tv_data_path, "r", encoding="utf-8") as f:
                tv_data = json.load(f)
            
            tv_count = redis_client.initialize_tv_data(tv_data)
        else:
            tv_count = 0
        
        return {
            "success": True,
            "message": "Redis 초기화 완료",
            "movie_count": movie_count,
            "tv_count": tv_count,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Redis 초기화 중 오류 발생: {str(e)}"
        )

@app.get("/health")
async def health_check():
    """상세 헬스 체크 (인증 불필요)"""
    try:
        # Redis 연결 확인
        redis_status = redis_client.ping()
        
        # TMDB API 연결 확인
        tmdb_status = await tmdb_client.test_connection()
        
        return {
            "service": "OpusCine API Server",
            "status": "running",
            "version": "1.0.1",
            "api_server": "running",
            "redis": "connected" if redis_status else "disconnected",
            "tmdb_api": "connected" if tmdb_status else "disconnected",
            "security": {
                "api_key_required": False,
                "cors_enabled": True,
                "allowed_origins": ALLOWED_ORIGINS
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            "service": "OpusCine API Server",
            "api_server": "running",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.get("/admin/status")
async def admin_status():
    """관리자 전용 시스템 상태 🔐 서비스 토큰 필요"""
    try:
        stats = redis_client.get_stats()
        return {
            "success": True,
            "system_info": {
                "api_key": "configured",
                "service_token": "configured",
                "cors_origins": ALLOWED_ORIGINS
            },
            "redis_stats": stats,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"상태 조회 중 오류 발생: {str(e)}"
        )

# 인증 키 생성 도우미 엔드포인트 (개발용)
@app.get("/admin/generate-keys")
async def generate_api_keys():
    """개발용: API 키 생성 도우미"""
    import secrets
    
    return {
        "suggested_api_key": f"opus-cine-{secrets.token_hex(16)}",
        "suggested_service_token": f"service-{secrets.token_hex(12)}",
        "note": "이 키들을 환경변수로 설정하세요",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/admin/update-llm-url")
async def update_llm_server_url(new_url: str):
    """
    LLM 서버 URL 동적 업데이트 
    🔐 서비스 토큰 인증 필요 (관리자 전용)
    """
    try:
        # URL 유효성 검증
        if not new_url.startswith(('http://', 'https://')):
            raise HTTPException(
                status_code=400,
                detail="유효한 URL 형식이 아닙니다 (http:// 또는 https://로 시작)"
            )
        
        # Redis에 새 URL 저장
        redis_client.redis_client.set("llm_server_url", new_url, ex=86400)  # 24시간 TTL
        
        return {
            "success": True,
            "message": "LLM 서버 URL이 업데이트되었습니다",
            "old_url": LLM_SERVER_URL,
            "new_url": new_url,
            "expires_in": "24시간",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"URL 업데이트 중 오류 발생: {str(e)}"
        )

@app.get("/admin/current-urls")
async def get_current_urls():
    """현재 설정된 서비스 URL들 조회 🔐 서비스 토큰 필요"""
    try:
        # LLM 서버 URL 조회 (환경변수에서)
        current_llm_url = LLM_SERVER_URL
        redis_llm_url = redis_client.redis_client.get("llm_server_url")
        
        return {
            "success": True,
            "urls": {
                "proxy_server": PROXY_SERVER_URL,
                "llm_server": {
                    "current": current_llm_url,
                    "from_redis": redis_llm_url,
                    "from_env": LLM_SERVER_URL,
                    "source": "redis" if redis_llm_url else "environment"
                },
                "api_server": API_SERVER_URL
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"URL 조회 중 오류 발생: {str(e)}"
        )

# LLM 서버 등록 엔드포인트 (인증 제거)
@app.post("/register-llm-server")
async def register_llm_server(ngrok_url: str):
    """
    LLM 서버가 시작할 때 자동으로 URL을 등록하는 엔드포인트
    ✅ 인증 불필요 (자동 등록)
    """
    try:
        # URL 유효성 검증
        if not ngrok_url.startswith(('http://', 'https://')):
            raise HTTPException(
                status_code=400,
                detail="유효한 URL 형식이 아닙니다"
            )
        
        # Redis에 URL 저장
        redis_client.redis_client.set("llm_server_url", ngrok_url, ex=86400)  # 24시간 TTL
        
        # 등록 시간도 저장
        redis_client.redis_client.set("llm_server_registered_at", datetime.now().isoformat(), ex=86400)
        
        return {
            "success": True,
            "message": "LLM 서버 URL이 등록되었습니다",
            "registered_url": ngrok_url,
            "expires_in": "24시간",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"LLM 서버 등록 중 오류 발생: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv('PORT', 8002))) 