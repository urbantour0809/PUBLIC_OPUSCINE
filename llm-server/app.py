from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import json
import os
from datetime import datetime
from model import MovieRecommendationLLM

app = FastAPI(title="OpusCine LLM Server", version="1.0.0")

# LLM 모델 초기화
llm_model = MovieRecommendationLLM()

class LLMRequest(BaseModel):
    message: str

class LLMResponse(BaseModel):
    success: bool
    parameters: dict = None
    confidence: float = None
    error: str = None

@app.get("/")
async def root():
    """헬스 체크 엔드포인트"""
    return {
        "service": "OpusCine LLM Server",
        "status": "running",
        "model": llm_model.model_name,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/llm", response_model=LLMResponse)
async def process_natural_language(request: LLMRequest):
    """
    자연어 요청을 TMDB API 파라미터로 변환
    """
    try:
        # LLM 모델을 통해 자연어를 TMDB 파라미터로 변환
        result = llm_model.parse_movie_request(request.message)
        
        return LLMResponse(
            success=True,
            parameters=result["parameters"],
            confidence=result.get("confidence", 0.8)
        )
        
    except Exception as e:
        return LLMResponse(
            success=False,
            error=f"자연어 처리 중 오류 발생: {str(e)}"
        )

@app.get("/health")
async def health_check():
    """상세 헬스 체크"""
    try:
        model_status = "loaded" if llm_model.is_model_loaded() else "not_loaded"
        
        return {
            "llm_server": "running",
            "model_status": model_status,
            "model_name": llm_model.model_name,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            "llm_server": "running",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.post("/test-parse")
async def test_parsing(request: LLMRequest):
    """
    테스트용 파싱 엔드포인트
    """
    try:
        result = llm_model.parse_movie_request(request.message)
        
        return {
            "original_message": request.message,
            "parsed_result": result,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001) 