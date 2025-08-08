import httpx
import os
from typing import Dict, List, Any, Optional
from datetime import datetime

class TMDBClient:
    """
    TMDB API를 통해 영화 데이터를 조회하는 클라이언트
    """
    
    def __init__(self):
        self.api_key = os.getenv('TMDB_API_KEY', 'YOUR_API_KEY')
        self.base_url = "https://api.themoviedb.org/3"
        self.image_base_url = "https://image.tmdb.org/t/p/w500"
        
    async def discover_movies(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        TMDB Discover API를 통해 영화 검색
        """
        try:
            # 기본 파라미터 설정
            params = {
                "api_key": self.api_key,
                "language": "ko-KR",
                "sort_by": "popularity.desc",
                "page": 1
            }
            
            # 사용자 파라미터 병합
            params.update(parameters)
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.base_url}/discover/movie",
                    params=params
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    raise Exception(f"TMDB API 오류: {response.status_code}")
                    
        except Exception as e:
            raise Exception(f"영화 검색 실패: {str(e)}")
    
    async def get_movie_details(self, movie_id: int) -> Dict[str, Any]:
        """
        특정 영화의 상세 정보 조회
        """
        try:
            params = {
                "api_key": self.api_key,
                "language": "ko-KR"
            }
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.base_url}/movie/{movie_id}",
                    params=params
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    raise Exception(f"TMDB API 오류: {response.status_code}")
                    
        except Exception as e:
            raise Exception(f"영화 상세 정보 조회 실패: {str(e)}")
    
    async def search_movies(self, query: str, page: int = 1) -> Dict[str, Any]:
        """
        영화 제목으로 검색
        """
        try:
            params = {
                "api_key": self.api_key,
                "language": "ko-KR",
                "query": query,
                "page": page
            }
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.base_url}/search/movie",
                    params=params
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    raise Exception(f"TMDB API 오류: {response.status_code}")
                    
        except Exception as e:
            raise Exception(f"영화 검색 실패: {str(e)}")
    
    async def get_genres(self) -> List[Dict[str, Any]]:
        """
        영화 장르 목록 조회
        """
        try:
            params = {
                "api_key": self.api_key,
                "language": "ko-KR"
            }
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.base_url}/genre/movie/list",
                    params=params
                )
                
                if response.status_code == 200:
                    return response.json().get("genres", [])
                else:
                    raise Exception(f"TMDB API 오류: {response.status_code}")
                    
        except Exception as e:
            raise Exception(f"장르 목록 조회 실패: {str(e)}")
    
    async def get_popular_movies(self, page: int = 1) -> Dict[str, Any]:
        """
        인기 영화 목록 조회
        """
        try:
            params = {
                "api_key": self.api_key,
                "language": "ko-KR",
                "page": page
            }
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.base_url}/movie/popular",
                    params=params
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    raise Exception(f"TMDB API 오류: {response.status_code}")
                    
        except Exception as e:
            raise Exception(f"인기 영화 조회 실패: {str(e)}")
    
    async def get_movie_credits(self, movie_id: int) -> Dict[str, Any]:
        """
        영화 출연진 및 제작진 정보 조회
        """
        try:
            params = {
                "api_key": self.api_key,
                "language": "ko-KR"
            }
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.base_url}/movie/{movie_id}/credits",
                    params=params
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    raise Exception(f"TMDB API 오류: {response.status_code}")
                    
        except Exception as e:
            raise Exception(f"영화 크레딧 조회 실패: {str(e)}")
    
    async def test_connection(self) -> bool:
        """
        TMDB API 연결 테스트
        """
        try:
            params = {
                "api_key": self.api_key
            }
            
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{self.base_url}/configuration",
                    params=params
                )
                
                return response.status_code == 200
                
        except Exception as e:
            print(f"TMDB API 연결 테스트 실패: {e}")
            return False
    
    def get_image_url(self, path: str, size: str = "w500") -> str:
        """
        이미지 URL 생성
        """
        if not path:
            return ""
        return f"https://image.tmdb.org/t/p/{size}{path}"
    
    def format_movie_data(self, movie: Dict[str, Any]) -> Dict[str, Any]:
        """
        영화 데이터 포맷팅
        """
        return {
            "id": movie.get("id"),
            "title": movie.get("title", ""),
            "original_title": movie.get("original_title", ""),
            "overview": movie.get("overview", ""),
            "release_date": movie.get("release_date", ""),
            "poster_url": self.get_image_url(movie.get("poster_path", "")),
            "backdrop_url": self.get_image_url(movie.get("backdrop_path", "")),
            "vote_average": movie.get("vote_average", 0),
            "vote_count": movie.get("vote_count", 0),
            "popularity": movie.get("popularity", 0),
            "genre_ids": movie.get("genre_ids", []),
            "adult": movie.get("adult", False),
            "original_language": movie.get("original_language", "")
        } 