import json
import re
import torch
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import os
from transformers import AutoModelForCausalLM, AutoTokenizer

class MovieRecommendationLLM:
    """
    EXAONE 3.5-7.8B 모델을 사용한 영화 추천 자연어 처리 클래스
    """
    
    def __init__(self, model_name: str = "LGAI-EXAONE/EXAONE-3.5-7.8B-Instruct"):
        self.model_name = model_name
        self.model = None
        self.tokenizer = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # 모델 로딩 시도
        self._load_model()
        
        # TMDB 장르 매핑
        self.genre_mapping = {
            # 한국어 -> TMDB 장르 ID
            "액션": 28, "모험": 12, "애니메이션": 16, "코미디": 35,
            "범죄": 80, "다큐멘터리": 99, "드라마": 18, "가족": 10751,
            "판타지": 14, "역사": 36, "공포": 27, "음악": 10402,
            "미스터리": 9648, "로맨스": 10749, "SF": 878, "과학소설": 878,
            "TV영화": 10770, "스릴러": 53, "전쟁": 10752, "서부": 37,
            "느와르": 80, "멜로": 10749, "뮤지컬": 10402
        }
        
        # 유명 감독 ID 매핑
        self.director_mapping = {
            "봉준호": 21684, "박찬욱": 13153, "김기덕": 13154,
            "이창동": 17698, "홍상수": 13155, "임권택": 13156,
            "크리스토퍼 놀란": 525, "스티븐 스필버그": 488,
            "마틴 스코세지": 1032, "쿠엔틴 타란티노": 138
        }
        
    def _load_model(self):
        """EXAONE 모델 로딩"""
        try:
            print(f"🤖 EXAONE 모델 로딩 중... ({self.model_name})")
            
            # 모델 로딩
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_name,
                torch_dtype=torch.bfloat16,
                trust_remote_code=True,
                device_map="auto" if torch.cuda.is_available() else None
            )
            
            # 토크나이저 로딩
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            
            print(f"✅ EXAONE 모델 로딩 완료 (디바이스: {self.device})")
            
        except Exception as e:
            print(f"❌ EXAONE 모델 로딩 실패: {e}")
            print("⚠️  규칙 기반 파싱으로 대체됩니다.")
            self.model = None
            self.tokenizer = None
    
    def _create_movie_prompt(self, user_message: str) -> str:
        """영화 추천용 프롬프트 생성"""
        system_prompt = """당신은 사용자의 한국어 영화 추천 요청을 분석하여 TMDB API 쿼리 파라미터로 변환하는 전문 AI입니다.

다음 규칙을 따라 JSON 형식으로만 응답하세요:

1. 장르 매핑:
   - 액션: 28, 모험: 12, 애니메이션: 16, 코미디: 35
   - 범죄: 80, 다큐멘터리: 99, 드라마: 18, 가족: 10751
   - 판타지: 14, 역사: 36, 공포: 27, 음악: 10402
   - 미스터리: 9648, 로맨스: 10749, SF: 878, 스릴러: 53

2. 감독 매핑:
   - 봉준호: 21684, 박찬욱: 13153, 이창동: 17698
   - 크리스토퍼 놀란: 525, 스티븐 스필버그: 488

3. 출력 형식 (JSON만):
{
  "with_genres": [장르ID배열],
  "primary_release_date.gte": "YYYY-MM-DD",
  "primary_release_date.lte": "YYYY-MM-DD",
  "with_people": [인물ID배열],
  "sort_by": "정렬방식",
  "language": "ko-KR",
  "vote_average.gte": 평점최소값
}

4. 특별 처리:
   - "최신", "최근" → 최근 2년 범위
   - "고전", "오래된" → 2000년 이전
   - "명작", "걸작" → vote_average.gte: 7.0
   - "한국영화" → with_origin_country: ["KR"]"""

        return f"{system_prompt}\n\n사용자 요청: {user_message}\n\nJSON 응답:"
    
    def parse_movie_request(self, user_message: str) -> Dict[str, Any]:
        """
        사용자의 자연어 요청을 TMDB API 파라미터로 변환
        """
        try:
            if self.model and self.tokenizer:
                # EXAONE 모델 사용
                return self._exaone_parsing(user_message)
            else:
                # 규칙 기반 파싱 (백업)
                return self._rule_based_parsing(user_message)
                
        except Exception as e:
            print(f"⚠️  모델 파싱 실패, 규칙 기반으로 대체: {e}")
            return self._rule_based_parsing(user_message)
    
    def _exaone_parsing(self, user_message: str) -> Dict[str, Any]:
        """
        EXAONE 모델을 사용한 자연어 파싱
        """
        try:
            # 프롬프트 생성
            prompt = self._create_movie_prompt(user_message)
            
            # 메시지 포맷
            messages = [
                {"role": "system", 
                 "content": "You are EXAONE model from LG AI Research, a helpful assistant specialized in movie recommendations."},
                {"role": "user", "content": prompt}
            ]
            
            # 토크나이징
            input_ids = self.tokenizer.apply_chat_template(
                messages,
                tokenize=True,
                add_generation_prompt=True,
                return_tensors="pt"
            )
            
            # GPU로 이동
            if self.device == "cuda":
                input_ids = input_ids.to("cuda")
            
            # 생성
            with torch.no_grad():
                output = self.model.generate(
                    input_ids,
                    eos_token_id=self.tokenizer.eos_token_id,
                    max_new_tokens=512,
                    do_sample=False,
                    temperature=0.1,
                    pad_token_id=self.tokenizer.eos_token_id
                )
            
            # 디코딩
            response = self.tokenizer.decode(output[0], skip_special_tokens=True)
            
            # JSON 추출
            json_start = response.find("{")
            json_end = response.rfind("}") + 1
            
            if json_start != -1 and json_end > json_start:
                json_str = response[json_start:json_end]
                parameters = json.loads(json_str)
                
                return {
                    "parameters": parameters,
                    "confidence": 0.95,
                    "original_message": user_message,
                    "method": "exaone_model"
                }
            else:
                raise Exception("JSON 형식을 찾을 수 없음")
                
        except Exception as e:
            print(f"EXAONE 파싱 오류: {e}")
            raise e
    
    def _rule_based_parsing(self, user_message: str) -> Dict[str, Any]:
        """
        규칙 기반 파싱 (백업용)
        """
        message = user_message.lower().strip()
        params = {
            "language": "ko-KR",
            "sort_by": "popularity.desc"
        }
        
        # 장르 추출
        genres = []
        for korean_genre, genre_id in self.genre_mapping.items():
            if korean_genre in message:
                genres.append(genre_id)
        if genres:
            params["with_genres"] = genres
        
        # 연도 추출
        year_pattern = r'(\d{4})년?'
        year_matches = re.findall(year_pattern, message)
        if year_matches:
            year = year_matches[-1]
            params["primary_release_date.gte"] = f"{year}-01-01"
            params["primary_release_date.lte"] = f"{year}-12-31"
        
        # 최신/최근 영화
        if any(word in message for word in ["최신", "최근", "새로운", "신작"]):
            current_year = datetime.now().year
            params["primary_release_date.gte"] = f"{current_year-1}-01-01"
        
        # 오래된 영화
        if any(word in message for word in ["오래된", "고전", "옛날"]):
            params["primary_release_date.lte"] = "2000-12-31"
        
        # 감독 추출
        directors = []
        for director_name, director_id in self.director_mapping.items():
            if director_name in message:
                directors.append(director_id)
        if directors:
            params["with_people"] = directors
        
        # 평점 관련
        if any(word in message for word in ["명작", "걸작", "평점높은", "좋은"]):
            params["vote_average.gte"] = 7.0
        elif any(word in message for word in ["평점낮은", "별로인"]):
            params["vote_average.lte"] = 5.0
        
        # 정렬 방식
        if any(word in message for word in ["인기", "인기있는"]):
            params["sort_by"] = "popularity.desc"
        elif any(word in message for word in ["평점", "평점순"]):
            params["sort_by"] = "vote_average.desc"
        elif any(word in message for word in ["최신순", "개봉순"]):
            params["sort_by"] = "release_date.desc"
        
        return {
            "parameters": params,
            "confidence": 0.75,
            "original_message": user_message,
            "method": "rule_based"
        }
    
    def is_model_loaded(self) -> bool:
        """모델 로드 상태 확인"""
        return self.model is not None and self.tokenizer is not None
    
    def get_model_info(self) -> Dict[str, Any]:
        """모델 정보 반환"""
        return {
            "model_name": self.model_name,
            "device": self.device,
            "loaded": self.is_model_loaded(),
            "cuda_available": torch.cuda.is_available(),
            "gpu_count": torch.cuda.device_count() if torch.cuda.is_available() else 0
        } 