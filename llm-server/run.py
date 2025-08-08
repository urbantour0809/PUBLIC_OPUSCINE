#!/usr/bin/env python3
"""
LLM Server 실행 스크립트
"""

import os
import sys
import logging
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

def check_gpu():
    """GPU 환경 확인"""
    try:
        import torch
        
        print(f"🔍 CUDA 사용 가능: {torch.cuda.is_available()}")
        if torch.cuda.is_available():
            print(f"🎮 GPU 개수: {torch.cuda.device_count()}")
            print(f"🎮 현재 GPU: {torch.cuda.current_device()}")
            print(f"🎮 GPU 이름: {torch.cuda.get_device_name()}")
            
            # GPU 메모리 확인
            for i in range(torch.cuda.device_count()):
                props = torch.cuda.get_device_properties(i)
                memory_gb = props.total_memory / 1024**3
                print(f"🎮 GPU {i}: {props.name}, 메모리: {memory_gb:.1f}GB")
        else:
            print("⚠️ CUDA를 사용할 수 없습니다. CPU로 실행됩니다.")
            
    except ImportError:
        print("❌ PyTorch가 설치되지 않았습니다.")
        return False
        
    return True

def check_model_cache():
    """모델 캐시 디렉터리 확인"""
    cache_dir = Path(os.getenv('MODEL_CACHE_DIR', './model_cache'))
    
    if not cache_dir.exists():
        print(f"📁 모델 캐시 디렉터리 생성: {cache_dir}")
        cache_dir.mkdir(parents=True, exist_ok=True)
    else:
        print(f"📁 모델 캐시 디렉터리 존재: {cache_dir}")
    
    return cache_dir

def pre_download_model():
    """모델 사전 다운로드 (선택사항)"""
    model_name = os.getenv('MODEL_NAME', 'LGAI-EXAONE/EXAONE-3.5-7.8B-Instruct')
    
    try:
        from transformers import AutoTokenizer, AutoModelForCausalLM
        import torch
        
        print(f"📥 모델 사전 다운로드 시작: {model_name}")
        
        # 토크나이저 다운로드
        print("📥 토크나이저 다운로드 중...")
        tokenizer = AutoTokenizer.from_pretrained(
            model_name,
            cache_dir=os.getenv('MODEL_CACHE_DIR', './model_cache')
        )
        
        # 모델 다운로드 (시간이 오래 걸릴 수 있음)
        print("📥 모델 다운로드 중... (시간이 오래 걸릴 수 있습니다)")
        model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=getattr(torch, os.getenv('TORCH_DTYPE', 'bfloat16')),
            trust_remote_code=True,
            device_map=os.getenv('DEVICE_MAP', 'auto'),
            cache_dir=os.getenv('MODEL_CACHE_DIR', './model_cache'),
            low_cpu_mem_usage=os.getenv('LOW_CPU_MEM_USAGE', 'true').lower() == 'true'
        )
        
        print("✅ 모델 다운로드 완료!")
        
        # 메모리 정리
        del model
        del tokenizer
        
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            
        return True
        
    except Exception as e:
        print(f"❌ 모델 다운로드 실패: {e}")
        return False

def main():
    """메인 실행 함수"""
    print("🚀 OpusCine LLM Server 시작...")
    print("=" * 50)
    
    # 환경 정보 출력
    print(f"📍 Python 버전: {sys.version}")
    print(f"📍 작업 디렉터리: {os.getcwd()}")
    print(f"📍 모델: {os.getenv('MODEL_NAME', 'LGAI-EXAONE/EXAONE-3.5-7.8B-Instruct')}")
    print(f"📍 포트: {os.getenv('PORT', '8001')}")
    print()
    
    # GPU 환경 확인
    gpu_available = check_gpu()
    print()
    
    # 모델 캐시 디렉터리 확인
    cache_dir = check_model_cache()
    print()
    
    # 사전 다운로드 여부 확인
    if os.getenv('USE_CACHE', 'true').lower() == 'true':
        print("🤔 모델을 사전 다운로드하시겠습니까? (시간이 많이 걸립니다)")
        choice = input("사전 다운로드? [y/N]: ").lower().strip()
        
        if choice in ['y', 'yes']:
            pre_download_model()
        else:
            print("⏭️ 사전 다운로드 건너뛰기 (서버 시작 시 다운로드됩니다)")
    
    print()
    print("🎬 FastAPI 서버 시작...")
    
    # FastAPI 서버 실행
    import uvicorn
    
    uvicorn.run(
        "app:app",
        host=os.getenv('HOST', '0.0.0.0'),
        port=int(os.getenv('PORT', 8001)),
        log_level=os.getenv('LOG_LEVEL', 'info').lower(),
        reload=os.getenv('DEBUG', 'false').lower() == 'true'
    )

if __name__ == "__main__":
    main() 