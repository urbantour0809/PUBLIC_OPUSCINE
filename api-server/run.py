#!/usr/bin/env python3
"""
API Server 실행 스크립트
"""

import os
import sys
import logging
import asyncio
from pathlib import Path

# 환경변수 로드
try:
    from dotenv import load_dotenv
    load_dotenv()
    print("✅ .env 파일 로드됨")
except ImportError:
    print("⚠️ python-dotenv가 설치되지 않음. pip install python-dotenv")

# 로깅 설정
logging.basicConfig(
    level=getattr(logging, os.getenv('LOG_LEVEL', 'INFO')),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def check_tmdb_api():
    """TMDB API 키 확인"""
    api_key = os.getenv('TMDB_API_KEY', '')
    
    if not api_key:
        print("❌ TMDB API 키가 설정되지 않았습니다!")
        print("   환경변수에서 TMDB_API_KEY를 설정하세요.")
        return False
    
    print(f"✅ TMDB API 키 설정됨: {api_key[:8]}...")
    return True

async def check_redis_connection():
    """Redis 연결 확인"""
    try:
        import redis.asyncio as redis
        
        redis_client = redis.Redis(
            host=os.getenv('REDIS_HOST', 'localhost'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            db=int(os.getenv('REDIS_DB', 0)),
            password=os.getenv('REDIS_PASSWORD', '') or None,
            decode_responses=True
        )
        
        # 연결 테스트
        await redis_client.ping()
        print("✅ Redis 연결 성공")
        await redis_client.aclose()  # aclose() 사용으로 경고 해결
        return True
        
    except Exception as e:
        print(f"⚠️ Redis 연결 실패: {e}")
        print("   Redis 서버를 시작하거나 설정을 확인하세요.")
        return False

def check_directories():
    """필요한 디렉터리 확인"""
    # 로그 디렉터리
    log_file = os.getenv('LOG_FILE', 'api_server.log')
    log_dir = Path(log_file).parent
    
    if not log_dir.exists():
        print(f"📁 로그 디렉터리 생성: {log_dir}")
        log_dir.mkdir(parents=True, exist_ok=True)
    
    return True

async def test_tmdb_api():
    """TMDB API 테스트"""
    try:
        import httpx
        
        api_key = os.getenv('TMDB_API_KEY')
        base_url = os.getenv('TMDB_BASE_URL', 'https://api.themoviedb.org/3')
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{base_url}/configuration",
                params={"api_key": api_key},
                timeout=10
            )
            
            if response.status_code == 200:
                print("✅ TMDB API 테스트 성공")
                return True
            else:
                print(f"❌ TMDB API 테스트 실패: {response.status_code}")
                return False
                
    except Exception as e:
        print(f"❌ TMDB API 테스트 실패: {e}")
        return False

async def initialize_data():
    """데이터 초기화"""
    try:
        from redis_client import initialize_redis_data
        
        print("📊 Redis 데이터 초기화 중...")
        success = await initialize_redis_data()
        
        if success:
            print("✅ Redis 데이터 초기화 완료")
        else:
            print("⚠️ Redis 데이터 초기화 실패 (계속 진행)")
            
    except Exception as e:
        print(f"⚠️ 데이터 초기화 실패: {e}")

async def main():
    """메인 실행 함수"""
    print("🚀 OpusCine API Server 시작...")
    print("=" * 50)
    
    # 환경 정보 출력
    print(f"📍 Python 버전: {sys.version}")
    print(f"📍 작업 디렉터리: {os.getcwd()}")
    print(f"📍 포트: {os.getenv('PORT', '8002')}")
    print(f"📍 TMDB API: {os.getenv('TMDB_BASE_URL', 'https://api.themoviedb.org/3')}")
    print(f"📍 Redis: {os.getenv('REDIS_HOST', 'localhost')}:{os.getenv('REDIS_PORT', '6379')}")
    print()
    
    # 필수 확인 사항
    checks = []
    
    # TMDB API 키 확인
    checks.append(check_tmdb_api())
    
    # 디렉터리 확인
    checks.append(check_directories())
    
    # Redis 연결 확인
    redis_ok = await check_redis_connection()
    checks.append(redis_ok)
    
    # TMDB API 테스트
    if checks[0]:  # TMDB API 키가 있는 경우만
        tmdb_ok = await test_tmdb_api()
        checks.append(tmdb_ok)
    
    print()
    
    # 성공한 체크 개수
    success_count = sum(checks)
    total_count = len(checks)
    
    print(f"✅ 시스템 체크: {success_count}/{total_count} 완료")
    
    if success_count < total_count:
        print("⚠️ 일부 체크가 실패했지만 서버를 시작합니다.")
        print("   문제가 있을 수 있으니 로그를 확인하세요.")
    
    print()
    
    # 데이터 초기화 (서버 환경에서는 자동 건너뛰기)
    if redis_ok:
        # 서버 환경에서는 사용자 입력 없이 자동으로 초기화 건너뛰기
        auto_init = os.getenv('AUTO_INIT_REDIS', 'false').lower() == 'true'
        
        if auto_init:
            print("🔄 Redis 데이터 자동 초기화 시작...")
            await initialize_data()
        else:
            print("⏭️ Redis 데이터 초기화 건너뛰기 (AUTO_INIT_REDIS=true로 설정하면 자동 초기화)")
    
    print()
    print("🎬 FastAPI 서버 시작...")
    
    # FastAPI 서버 실행 (asyncio 루프 문제 해결)
    import uvicorn
    
    # 이미 asyncio 컨텍스트에 있으므로 직접 실행
    config = uvicorn.Config(
        "app:app",
        host=os.getenv('HOST', '0.0.0.0'),
        port=int(os.getenv('PORT', 8002)),
        log_level=os.getenv('LOG_LEVEL', 'info').lower(),
        reload=os.getenv('DEBUG', 'false').lower() == 'true'
    )
    server = uvicorn.Server(config)
    await server.serve()

if __name__ == "__main__":
    asyncio.run(main()) 