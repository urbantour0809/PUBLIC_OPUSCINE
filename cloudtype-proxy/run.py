#!/usr/bin/env python3
"""
Cloudtype Proxy Server 실행 스크립트 (Python 3.12.9 최적화)
"""

import os
import sys
import logging
import asyncio
from pathlib import Path
from typing import List, Tuple

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

def check_python_version() -> bool:
    """Python 버전 확인"""
    version_info = sys.version_info
    current_version = f"{version_info.major}.{version_info.minor}.{version_info.micro}"
    
    print(f"🐍 Python 버전: {current_version}")
    
    if version_info >= (3, 12):
        print("✅ Python 3.12+ 지원됨")
        return True
    elif version_info >= (3, 11):
        print("⚠️ Python 3.11 감지됨. 3.12+ 권장")
        return True
    else:
        print("❌ Python 3.11+ 필요함")
        return False

def check_data_files() -> bool:
    """로컬 데이터 파일 확인"""
    movies_file = Path(os.getenv('MOVIES_DATA_FILE', './data/movie/tmdb_movies_hybrid_final.json'))
    tv_file = Path(os.getenv('TV_DATA_FILE', './data/tv series/tmdb_tv_series_final.json'))
    
    files_status: List[bool] = []
    
    if movies_file.exists():
        size_mb = movies_file.stat().st_size / (1024 * 1024)
        print(f"✅ 영화 데이터 파일: {movies_file} ({size_mb:.1f}MB)")
        files_status.append(True)
    else:
        print(f"❌ 영화 데이터 파일 없음: {movies_file}")
        files_status.append(False)
    
    if tv_file.exists():
        size_mb = tv_file.stat().st_size / (1024 * 1024)
        print(f"✅ TV 시리즈 데이터 파일: {tv_file} ({size_mb:.1f}MB)")
        files_status.append(True)
    else:
        print(f"❌ TV 시리즈 데이터 파일 없음: {tv_file}")
        files_status.append(False)
    
    return all(files_status)

async def check_external_services() -> List[bool]:
    """외부 서비스 연결 확인"""
    try:
        import httpx
    except ImportError:
        print("❌ httpx 라이브러리가 설치되지 않음")
        return [False, False]
    
    llm_url = os.getenv('LLM_SERVER_URL', '')
    api_url = os.getenv('API_SERVER_URL', 'http://localhost:8002')
    
    services_status: List[bool] = []
    
    # LLM 서버 확인
    if llm_url and llm_url != 'your_ngrok_llm_url_here':
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(f"{llm_url}/health")
                if response.status_code == 200:
                    print(f"✅ LLM 서버 연결: {llm_url}")
                    services_status.append(True)
                else:
                    print(f"⚠️ LLM 서버 응답 오류: {response.status_code}")
                    services_status.append(False)
        except Exception as e:
            print(f"❌ LLM 서버 연결 실패: {e}")
            services_status.append(False)
    else:
        print("⚠️ LLM 서버 URL이 설정되지 않음")
        services_status.append(False)
    
    # API 서버 확인
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(f"{api_url}/health")
            if response.status_code == 200:
                print(f"✅ API 서버 연결: {api_url}")
                services_status.append(True)
            else:
                print(f"⚠️ API 서버 응답 오류: {response.status_code}")
                services_status.append(False)
    except Exception as e:
        print(f"❌ API 서버 연결 실패: {e}")
        services_status.append(False)
    
    return services_status

async def check_redis_connection() -> bool:
    """Redis 연결 확인 (백업용)"""
    if not os.getenv('FALLBACK_TO_REDIS', 'true').lower() == 'true':
        print("⏭️ Redis 백업 비활성화됨")
        return True
    
    try:
        import redis.asyncio as redis
        
        redis_client = redis.Redis(
            host=os.getenv('REDIS_HOST', 'localhost'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            db=int(os.getenv('REDIS_DB', 0)),
            password=os.getenv('REDIS_PASSWORD', '') or None,
            decode_responses=True
        )
        
        await redis_client.ping()
        print("✅ Redis 백업 연결 성공")
        await redis_client.close()
        return True
        
    except ImportError:
        print("⚠️ redis 라이브러리가 설치되지 않음")
        return False
    except Exception as e:
        print(f"⚠️ Redis 백업 연결 실패: {e}")
        return False

def check_directories() -> bool:
    """필요한 디렉터리 확인"""
    # 로그 디렉터리
    log_file = os.getenv('LOG_FILE', 'proxy_server.log')
    log_dir = Path(log_file).parent
    
    if not log_dir.exists():
        print(f"📁 로그 디렉터리 생성: {log_dir}")
        log_dir.mkdir(parents=True, exist_ok=True)
    
    # 데이터 디렉터리
    data_dir = Path("./data")
    if not data_dir.exists():
        print(f"📁 데이터 디렉터리 생성: {data_dir}")
        data_dir.mkdir(parents=True, exist_ok=True)
    
    return True

def load_sample_data() -> bool:
    """샘플 데이터 로드 테스트"""
    try:
        movies_file = Path(os.getenv('MOVIES_DATA_FILE', './data/movie/tmdb_movies_hybrid_final.json'))
        
        if movies_file.exists():
            import json
            with open(movies_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            if isinstance(data, list) and len(data) > 0:
                print(f"✅ 영화 데이터 로드 성공: {len(data)}개 항목")
                return True
            elif isinstance(data, dict) and "movies" in data:
                movies_count = len(data["movies"])
                print(f"✅ 영화 데이터 로드 성공: {movies_count}개 항목")
                return True
            else:
                print("⚠️ 영화 데이터 형식 오류")
                return False
        else:
            print("⚠️ 영화 데이터 파일이 없음")
            return False
            
    except Exception as e:
        print(f"❌ 데이터 로드 실패: {e}")
        return False

def check_required_packages() -> bool:
    """필수 패키지 설치 확인"""
    # 패키지명과 실제 import 이름 매핑
    required_packages = {
        'fastapi': 'fastapi',
        'uvicorn': 'uvicorn',
        'pydantic': 'pydantic',
        'httpx': 'httpx',
        'redis': 'redis',
        'python-multipart': 'multipart',  # 실제 import 이름이 다름
        'python-dotenv': 'dotenv',        # 실제 import 이름이 다름
        'aiofiles': 'aiofiles'
    }
    
    missing_packages = []
    
    for package_name, import_name in required_packages.items():
        try:
            __import__(import_name)
            print(f"✅ {package_name} 설치됨")
        except ImportError:
            print(f"❌ {package_name} 설치되지 않음")
            missing_packages.append(package_name)
    
    if missing_packages:
        print(f"\n❌ 누락된 패키지: {', '.join(missing_packages)}")
        print("다음 명령어로 설치하세요:")
        print(f"pip install {' '.join(missing_packages)}")
        return False
    
    return True

async def main() -> None:
    """메인 실행 함수"""
    print("🚀 OpusCine Cloudtype Proxy Server 시작...")
    print("=" * 50)
    
    # Python 버전 확인
    python_ok = check_python_version()
    print()
    
    # 환경 정보 출력
    print(f"📍 Python 버전: {sys.version}")
    print(f"📍 작업 디렉터리: {os.getcwd()}")
    print(f"📍 포트: {os.getenv('PORT', '8000')}")
    print(f"📍 환경: {os.getenv('ENVIRONMENT', 'development')}")
    print(f"📍 로컬 데이터 사용: {os.getenv('USE_LOCAL_DATA', 'true')}")
    print()
    
    # 시스템 체크
    checks: List[bool] = []
    
    # Python 버전 체크
    checks.append(python_ok)
    
    # 필수 패키지 확인
    packages_ok = check_required_packages()
    checks.append(packages_ok)
    print()
    
    if not packages_ok:
        print("❌ 필수 패키지가 누락되었습니다. 설치 후 다시 실행하세요.")
        return
    
    # 디렉터리 확인
    checks.append(check_directories())
    
    # 로컬 데이터 파일 확인
    if os.getenv('USE_LOCAL_DATA', 'true').lower() == 'true':
        data_ok = check_data_files()
        checks.append(data_ok)
        
        if data_ok:
            sample_ok = load_sample_data()
            checks.append(sample_ok)
    
    # 외부 서비스 확인
    services_status = await check_external_services()
    checks.extend(services_status)
    
    # Redis 백업 확인
    redis_ok = await check_redis_connection()
    checks.append(redis_ok)
    
    print()
    
    # 결과 출력
    success_count = sum(checks)
    total_count = len(checks)
    
    print(f"✅ 시스템 체크: {success_count}/{total_count} 완료")
    
    if success_count < total_count:
        print("⚠️ 일부 체크가 실패했지만 서버를 시작합니다.")
        print("   로컬 데이터나 백업 기능을 사용하여 동작할 수 있습니다.")
    
    print()
    
    # 설정 요약
    print("🔧 현재 설정:")
    print(f"   • Python 버전: {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")
    print(f"   • 로컬 데이터: {'활성화' if os.getenv('USE_LOCAL_DATA', 'true').lower() == 'true' else '비활성화'}")
    print(f"   • Redis 백업: {'활성화' if os.getenv('FALLBACK_TO_REDIS', 'true').lower() == 'true' else '비활성화'}")
    print(f"   • LLM 서버: {os.getenv('LLM_SERVER_URL', '미설정')}")
    print(f"   • API 서버: {os.getenv('API_SERVER_URL', 'http://localhost:8002')}")
    
    print()
    print("🎬 FastAPI 서버 시작...")
    
    # FastAPI 서버 실행
    try:
        import uvicorn
        
        # 개발 환경에서는 직접 main.py를 실행하도록 안내
        if os.getenv('ENVIRONMENT', 'development') == 'development':
            print("💡 개발 환경에서는 다음 명령어로 서버를 시작하세요:")
            print("   python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload")
            print("   또는")
            print("   python main.py")
            return
        
        # 프로덕션 환경에서만 uvicorn.run 실행
        uvicorn.run(
            "main:app",
            host=os.getenv('HOST', '0.0.0.0'),
            port=int(os.getenv('PORT', 8000)),
            log_level=os.getenv('LOG_LEVEL', 'info').lower(),
            reload=os.getenv('DEBUG', 'false').lower() == 'true',
            access_log=True
        )
    except ImportError:
        print("❌ uvicorn이 설치되지 않았습니다. pip install uvicorn[standard]")
        return
    except Exception as e:
        print(f"❌ 서버 시작 실패: {e}")
        return

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 서버 종료됨 (Ctrl+C)")
    except Exception as e:
        print(f"\n❌ 실행 중 오류 발생: {e}")
        sys.exit(1) 