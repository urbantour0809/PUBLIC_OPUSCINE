import redis
import json
import os
from typing import Dict, List, Any, Optional
from datetime import datetime

class RedisClient:
    """
    OTT 링크 데이터를 관리하는 Redis 클라이언트
    """
    
    def __init__(self):
        # Redis 연결 설정
        redis_password = os.getenv('REDIS_PASSWORD', '')
        
        self.redis_client = redis.Redis(
            host=os.getenv('REDIS_HOST', 'localhost'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            db=int(os.getenv('REDIS_DB', 0)),
            password=redis_password if redis_password else None,
            decode_responses=True,
            socket_timeout=int(os.getenv('REDIS_TIMEOUT', 5)),
            socket_connect_timeout=int(os.getenv('REDIS_TIMEOUT', 5)),
            retry_on_timeout=True
        )
    
    def ping(self) -> bool:
        """Redis 연결 상태 확인"""
        try:
            return self.redis_client.ping()
        except:
            return False
    
    def get_ott_links(self, movie_id: int) -> Optional[List[Dict[str, Any]]]:
        """
        특정 영화의 OTT 링크 조회
        """
        try:
            key = f"movie:{movie_id}"
            ott_data = self.redis_client.get(key)
            
            if ott_data:
                return json.loads(ott_data)
            return None
            
        except Exception as e:
            print(f"OTT 링크 조회 오류 (movie_id: {movie_id}): {e}")
            return None
    
    def set_ott_links(self, movie_id: int, ott_links: List[Dict[str, Any]]) -> bool:
        """
        특정 영화의 OTT 링크 저장
        """
        try:
            key = f"movie:{movie_id}"
            self.redis_client.set(key, json.dumps(ott_links, ensure_ascii=False))
            return True
            
        except Exception as e:
            print(f"OTT 링크 저장 오류 (movie_id: {movie_id}): {e}")
            return False
    
    def initialize_movie_data(self, movie_data: Dict[str, Any]) -> int:
        """
        JSON 파일의 영화 데이터를 Redis로 초기화
        """
        count = 0
        try:
            movies = movie_data.get("movies", [])
            
            for movie in movies:
                movie_id = movie.get("tmdb_id")
                ott_links = movie.get("ott_links", [])
                
                if movie_id and ott_links:
                    if self.set_ott_links(movie_id, ott_links):
                        count += 1
            
            print(f"영화 데이터 초기화 완료: {count}개 영화")
            return count
            
        except Exception as e:
            print(f"영화 데이터 초기화 오류: {e}")
            return count
    
    def initialize_tv_data(self, tv_data: Dict[str, Any]) -> int:
        """
        JSON 파일의 TV 시리즈 데이터를 Redis로 초기화
        """
        count = 0
        try:
            tv_shows = tv_data.get("tv_shows", [])
            
            for tv_show in tv_shows:
                tv_id = tv_show.get("tmdb_id")
                ott_links = tv_show.get("ott_links", [])
                
                if tv_id and ott_links:
                    # TV 시리즈는 다른 키 패턴 사용
                    key = f"tv:{tv_id}"
                    try:
                        self.redis_client.set(key, json.dumps(ott_links, ensure_ascii=False))
                        count += 1
                    except Exception as e:
                        print(f"TV 시리즈 저장 오류 (tv_id: {tv_id}): {e}")
            
            print(f"TV 시리즈 데이터 초기화 완료: {count}개 시리즈")
            return count
            
        except Exception as e:
            print(f"TV 시리즈 데이터 초기화 오류: {e}")
            return count
    
    def get_tv_ott_links(self, tv_id: int) -> Optional[List[Dict[str, Any]]]:
        """
        특정 TV 시리즈의 OTT 링크 조회
        """
        try:
            key = f"tv:{tv_id}"
            ott_data = self.redis_client.get(key)
            
            if ott_data:
                return json.loads(ott_data)
            return None
            
        except Exception as e:
            print(f"TV OTT 링크 조회 오류 (tv_id: {tv_id}): {e}")
            return None
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Redis 통계 정보 조회
        """
        try:
            info = self.redis_client.info()
            
            # 키 개수 조회
            movie_keys = len(self.redis_client.keys("movie:*"))
            tv_keys = len(self.redis_client.keys("tv:*"))
            total_keys = self.redis_client.dbsize()
            
            return {
                "redis_version": info.get("redis_version", "unknown"),
                "connected_clients": info.get("connected_clients", 0),
                "used_memory_human": info.get("used_memory_human", "unknown"),
                "total_keys": total_keys,
                "movie_keys": movie_keys,
                "tv_keys": tv_keys,
                "uptime_in_seconds": info.get("uptime_in_seconds", 0),
                "last_updated": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "error": str(e),
                "last_updated": datetime.now().isoformat()
            }
    
    def clear_all_data(self) -> bool:
        """
        모든 데이터 삭제 (주의: 개발용)
        """
        try:
            self.redis_client.flushdb()
            return True
        except Exception as e:
            print(f"데이터 삭제 오류: {e}")
            return False
    
    def delete_movie_data(self, movie_id: int) -> bool:
        """
        특정 영화 데이터 삭제
        """
        try:
            key = f"movie:{movie_id}"
            result = self.redis_client.delete(key)
            return result > 0
        except Exception as e:
            print(f"영화 데이터 삭제 오류 (movie_id: {movie_id}): {e}")
            return False
    
    def search_movies_by_pattern(self, pattern: str) -> List[str]:
        """
        패턴으로 영화 키 검색
        """
        try:
            return self.redis_client.keys(f"movie:*{pattern}*")
        except Exception as e:
            print(f"영화 검색 오류 (pattern: {pattern}): {e}")
            return [] 