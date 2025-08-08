/**
 * TMDB API 통신 관리 모듈
 * 
 * 이 파일은 The Movie Database (TMDB) API와의 모든 통신을 담당합니다.
 * 영화, TV 시리즈, 검색, 트렌딩 등의 데이터를 가져오는 핵심 모듈입니다.
 * 
 * 주요 기능:
 * 1. TMDB API 인증 및 요청 관리
 * 2. 영화/TV 시리즈 데이터 조회
 * 3. 검색 기능 제공
 * 4. 이미지 URL 생성
 * 5. 에러 처리 및 로깅
 */

// TMDB API 설정 상수
const TMDB_CONFIG = {
    API_KEY: 'fbdca01cbe9008fcc8e7fd7dd6c1ba9c',    // TMDB API 키 (실제 프로덕션에서는 환경변수 사용 권장)
    BASE_URL: 'https://api.themoviedb.org/3',       // TMDB API 기본 URL
    IMAGE_BASE_URL: 'https://image.tmdb.org/t/p',   // 이미지 서버 URL
    POSTER_SIZE: 'w500',                            // 포스터 이미지 크기
    BACKDROP_SIZE: 'w1280',                         // 배경 이미지 크기
    STILL_SIZE: 'w300'                              // 스틸컷 이미지 크기 (TV 에피소드용)
};

/** 
 * TMDB API 서비스 클래스
 * 
 * 모든 TMDB API 호출을 담당하는 중앙화된 서비스 클래스입니다.
 * 싱글톤 패턴으로 구현되어 애플리케이션 전체에서 하나의 인스턴스만 사용됩니다.
 */
class TMDBService {
    /**
     * 생성자: TMDB 서비스 초기화
     * API 키와 기본 URL을 설정합니다.
     */
    constructor() {
        this.apiKey = TMDB_CONFIG.API_KEY;          // API 인증 키
        this.baseUrl = TMDB_CONFIG.BASE_URL;        // API 기본 엔드포인트
        this.imageBaseUrl = TMDB_CONFIG.IMAGE_BASE_URL; // 이미지 서버 URL
    }

    /**
     * API 키 업데이트 메서드
     * 런타임에 API 키를 변경할 때 사용 (설정 페이지 등에서 활용)
     * 
     * @param {string} newApiKey - 새로운 API 키
     */
    updateApiKey(newApiKey) {
        this.apiKey = newApiKey;
        TMDB_CONFIG.API_KEY = newApiKey;
        console.log('🔑 TMDB API 키가 업데이트되었습니다.');
    }

    /**
     * 핵심 API 요청 메서드
     * 
     * 모든 TMDB API 호출의 중심이 되는 메서드입니다.
     * 에러 처리, 로깅, 공통 파라미터 추가를 담당합니다.
     * 
     * @param {string} endpoint - API 엔드포인트 (예: '/movie/popular')
     * @param {Object} params - 추가 쿼리 파라미터 객체
     * @returns {Promise<Object>} API 응답 데이터
     * 
     * 동작 흐름:
     * 1. URL 생성 및 공통 파라미터 추가 (API 키, 언어)
     * 2. HTTP GET 요청 실행
     * 3. 응답 상태 확인 및 에러 처리
     * 4. JSON 파싱 후 반환
     */
    async makeRequest(endpoint, params = {}) {
        // URL 객체 생성 및 기본 파라미터 설정
        const url = new URL(`${this.baseUrl}${endpoint}`);
        url.searchParams.append('api_key', this.apiKey);       // API 인증
        url.searchParams.append('language', 'ko-KR');          // 한국어 응답 요청
        
        // 추가 파라미터를 URL에 추가
        Object.keys(params).forEach(key => {
            url.searchParams.append(key, params[key]);
        });

        try {
            // 요청 로깅 (디버깅용)
            console.log('🔍 TMDB API 요청:', url.toString());
            
            // HTTP 요청 실행
            const response = await fetch(url);
            
            // HTTP 상태 코드 확인
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // JSON 응답 파싱
            const data = await response.json();
            console.log('✅ TMDB API 응답:', data);
            
            return data;
        } catch (error) {
            // 에러 로깅 및 재전파
            console.error('❌ TMDB API 오류:', error);
            throw error;
        }
    }

    // ===================================
    // 영화 관련 API 메서드들
    // ===================================

    /**
     * 인기 영화 목록 조회
     * 현재 TMDB에서 인기가 높은 영화들을 가져옵니다.
     * 
     * @param {number} page - 페이지 번호 (기본값: 1)
     * @returns {Promise<Object>} 영화 목록과 페이징 정보
     */
    async getPopularMovies(page = 1) {
        return await this.makeRequest('/movie/popular', { page });
    }

    /**
     * 현재 상영중인 영화 목록 조회
     * 극장에서 현재 상영되고 있는 영화들을 가져옵니다.
     */
    async getNowPlayingMovies(page = 1) {
        return await this.makeRequest('/movie/now_playing', { page });
    }

    /**
     * 개봉 예정 영화 목록 조회
     * 앞으로 개봉될 예정인 영화들을 가져옵니다.
     */
    async getUpcomingMovies(page = 1) {
        return await this.makeRequest('/movie/upcoming', { page });
    }

    /**
     * 높은 평점 영화 목록 조회
     * TMDB 사용자들이 높은 평점을 준 영화들을 가져옵니다.
     */
    async getTopRatedMovies(page = 1) {
        return await this.makeRequest('/movie/top_rated', { page });
    }

    /**
     * 장르별 영화 검색
     * 특정 장르에 속하는 영화들을 검색합니다.
     * 
     * @param {number} genreId - 장르 ID (28: 액션, 35: 코미디, 18: 드라마 등)
     * @param {number} page - 페이지 번호
     */
    async getMoviesByGenre(genreId, page = 1) {
        return await this.makeRequest('/discover/movie', { 
            with_genres: genreId,
            page 
        });
    }

    /**
     * 영화 제목 검색
     * 사용자가 입력한 키워드로 영화를 검색합니다.
     * 
     * @param {string} query - 검색어
     * @param {number} page - 페이지 번호
     */
    async searchMovies(query, page = 1) {
        return await this.makeRequest('/search/movie', { 
            query,
            page 
        });
    }

    /**
     * 영화 상세 정보 조회
     * 특정 영화의 자세한 정보를 가져옵니다.
     * 
     * @param {number} movieId - 영화 ID
     * @returns {Promise<Object>} 영화 상세 정보 (출연진, 예고편, 유사 영화 포함)
     * 
     * append_to_response 파라미터를 통해 관련 데이터를 한 번에 가져옵니다:
     * - credits: 출연진 및 제작진 정보
     * - videos: 예고편 및 관련 영상
     * - similar: 유사한 영화 추천
     */
    async getMovieDetails(movieId) {
        return await this.makeRequest(`/movie/${movieId}`, {
            append_to_response: 'credits,videos,similar'
        });
    }

    // ===================================
    // TV 시리즈 관련 API 메서드들
    // ===================================

    /**
     * 인기 TV 시리즈 목록 조회
     */
    async getPopularTVShows(page = 1) {
        return await this.makeRequest('/tv/popular', { page });
    }

    /**
     * 현재 방영중 TV 시리즈 목록 조회
     */
    async getOnTheAirTVShows(page = 1) {
        return await this.makeRequest('/tv/on_the_air', { page });
    }

    /**
     * 오늘 방영 TV 시리즈 목록 조회
     */
    async getAiringTodayTVShows(page = 1) {
        return await this.makeRequest('/tv/airing_today', { page });
    }

    /**
     * 높은 평점 TV 시리즈 목록 조회
     */
    async getTopRatedTVShows(page = 1) {
        return await this.makeRequest('/tv/top_rated', { page });
    }

    /**
     * 장르별 TV 시리즈 검색
     */
    async getTVShowsByGenre(genreId, page = 1) {
        return await this.makeRequest('/discover/tv', { 
            with_genres: genreId,
            page 
        });
    }

    /**
     * TV 시리즈 제목 검색
     */
    async searchTVShows(query, page = 1) {
        return await this.makeRequest('/search/tv', { 
            query,
            page 
        });
    }

    /**
     * TV 시리즈 상세 정보 조회
     * 영화와 유사하지만 TV 시리즈 특화 정보를 포함합니다.
     * 
     * @param {number} tvId - TV 시리즈 ID
     * @returns {Promise<Object>} TV 시리즈 상세 정보
     * 
     * aggregate_credits: TV 시리즈 전체 시즌의 출연진 정보
     */
    async getTVShowDetails(tvId) {
        return await this.makeRequest(`/tv/${tvId}`, {
            append_to_response: 'credits,videos,similar,aggregate_credits'
        });
    }

    /**
     * TV 시리즈 특정 시즌 정보 조회
     * 
     * @param {number} tvId - TV 시리즈 ID
     * @param {number} seasonNumber - 시즌 번호
     */
    async getSeasonDetails(tvId, seasonNumber) {
        return await this.makeRequest(`/tv/${tvId}/season/${seasonNumber}`);
    }

    /**
     * TV 시리즈의 모든 에피소드 정보 일괄 조회
     * 
     * 복잡한 로직을 포함하는 중요한 메서드입니다.
     * TV 시리즈의 모든 시즌과 에피소드 정보를 한 번에 가져옵니다.
     * 
     * @param {number} tvId - TV 시리즈 ID
     * @returns {Promise<Object>} 시리즈, 시즌, 에피소드 통합 정보
     * 
     * 동작 흐름:
     * 1. TV 시리즈 기본 정보 조회 (시즌 목록 포함)
     * 2. 각 시즌별로 순차적으로 에피소드 정보 조회
     * 3. 스페셜 에피소드 (시즌 0) 제외
     * 4. 에러 발생 시즌은 건너뛰고 계속 진행
     * 5. 모든 데이터를 통합하여 반환
     */
    async fetchAllEpisodes(tvId) {
        try {
            // 1. TV 시리즈 상세 정보에서 시즌 목록 가져오기
            const tvData = await this.getTVShowDetails(tvId);
            console.log(`📺 TV 시리즈 "${tvData.name}" - 총 ${tvData.seasons.length}개 시즌`);

            let allEpisodes = [];      // 모든 에피소드 정보 저장
            let seasonDetails = [];    // 시즌별 상세 정보 저장

            // 2. 각 시즌별로 에피소드 정보 요청
            for (const season of tvData.seasons) {
                // 스페셜 에피소드 (시즌 0) 제외
                if (season.season_number === 0) continue;

                try {
                    // 시즌별 에피소드 목록 조회
                    const seasonData = await this.getSeasonDetails(tvId, season.season_number);
                    console.log(`📺 시즌 ${season.season_number} - ${seasonData.episodes.length}개 에피소드`);
                    
                    // 시즌 정보 저장
                    seasonDetails.push({
                        ...seasonData,
                        season_number: season.season_number,
                        episode_count: seasonData.episodes.length
                    });

                    // 에피소드 정보를 표준화된 형태로 변환하여 저장
                    if (seasonData.episodes) {
                        allEpisodes = allEpisodes.concat(seasonData.episodes.map(ep => ({
                            season: season.season_number,          // 시즌 번호
                            episode: ep.episode_number,            // 에피소드 번호
                            title: ep.name,                        // 에피소드 제목
                            overview: ep.overview,                 // 에피소드 줄거리
                            air_date: ep.air_date,                 // 방영일
                            still_path: ep.still_path,             // 스틸컷 이미지
                            runtime: ep.runtime,                   // 러닝타임
                            vote_average: ep.vote_average          // 평점
                        })));
                    }
                } catch (error) {
                    // 개별 시즌 로드 실패 시 경고만 출력하고 계속 진행
                    console.warn(`⚠️ 시즌 ${season.season_number} 로드 실패:`, error);
                }
            }

            console.log(`✅ 총 ${allEpisodes.length}개 에피소드 로드 완료`);
            
            // 통합된 데이터 구조로 반환
            return {
                tvShow: tvData,           // TV 시리즈 기본 정보
                seasons: seasonDetails,   // 시즌별 상세 정보
                episodes: allEpisodes     // 모든 에피소드 정보
            };

        } catch (error) {
            console.error('❌ TV 시리즈 에피소드 로드 실패:', error);
            throw error;
        }
    }

    // ===================================
    // 애니메이션 전용 API 메서드들
    // ===================================

    /**
     * 애니메이션 영화 조회 (장르 ID: 16)
     */
    async getAnimationMovies(page = 1) {
        return await this.makeRequest('/discover/movie', { 
            with_genres: 16,
            page 
        });
    }

    /**
     * 애니메이션 TV 시리즈 조회
     */
    async getAnimationTVShows(page = 1) {
        return await this.makeRequest('/discover/tv', { 
            with_genres: 16,
            page 
        });
    }

    /**
     * 일본 애니메이션 영화 조회
     * 장르와 원산지 국가를 동시에 필터링합니다.
     */
    async getJapaneseAnimationMovies(page = 1) {
        return await this.makeRequest('/discover/movie', { 
            with_genres: 16,
            with_origin_country: 'JP',
            page 
        });
    }

    /**
     * 일본 애니메이션 TV 시리즈 조회
     */
    async getJapaneseAnimationTVShows(page = 1) {
        return await this.makeRequest('/discover/tv', { 
            with_genres: 16,
            with_origin_country: 'JP',
            page 
        });
    }

    /**
     * 다중 페이지 데이터 일괄 조회 유틸리티
     * 
     * 하나의 API 메서드로 여러 페이지의 데이터를 한 번에 가져와서
     * 더 많은 콘텐츠를 사용자에게 보여줄 수 있습니다.
     * 
     * @param {Function} apiMethod - 호출할 API 메서드
     * @param {number} pages - 가져올 페이지 수 (기본값: 3)
     * @returns {Promise<Object>} 병합된 결과 데이터
     * 
     * 동작 흐름:
     * 1. 지정된 페이지 수만큼 Promise 배열 생성
     * 2. Promise.all()로 병렬 요청 실행
     * 3. 모든 결과를 하나의 배열로 병합
     * 4. 페이징 정보는 첫 번째 결과에서 가져옴
     */
    async getMultiplePages(apiMethod, pages = 3) {
        try {
            // 병렬 요청을 위한 Promise 배열 생성
            const promises = [];
            for (let i = 1; i <= pages; i++) {
                promises.push(apiMethod.call(this, i));
            }
            
            // 모든 요청을 병렬로 실행
            const results = await Promise.all(promises);
            
            // 결과 병합을 위한 기본 구조 생성
            const combinedResults = {
                results: [],
                total_pages: results[0]?.total_pages || 0,
                total_results: results[0]?.total_results || 0
            };
            
            // 모든 페이지의 결과를 하나의 배열로 병합
            results.forEach(result => {
                if (result && result.results) {
                    combinedResults.results = combinedResults.results.concat(result.results);
                }
            });
            
            return combinedResults;
        } catch (error) {
            console.error('❌ 다중 페이지 로드 실패:', error);
            return { results: [] };
        }
    }

    // ===================================
    // 통합 검색 API 메서드들
    // ===================================

    /**
     * 멀티 검색 (영화, TV, 인물 통합 검색)
     * 한 번의 검색으로 모든 타입의 콘텐츠를 찾을 수 있습니다.
     * 
     * @param {string} query - 검색어
     * @param {number} page - 페이지 번호
     * @returns {Promise<Object>} 통합 검색 결과 (media_type 필드로 구분)
     */
    async searchMulti(query, page = 1) {
        return await this.makeRequest('/search/multi', { 
            query,
            page 
        });
    }

    // ===================================
    // 트렌딩 API 메서드들
    // ===================================

    /**
     * 트렌딩 전체 콘텐츠 조회
     * 영화, TV, 인물을 모두 포함한 트렌딩 목록을 가져옵니다.
     * 
     * @param {string} timeWindow - 시간 범위 ('day' 또는 'week')
     * @param {number} page - 페이지 번호
     */
    async getTrendingAll(timeWindow = 'day', page = 1) {
        return await this.makeRequest(`/trending/all/${timeWindow}`, { page });
    }

    /**
     * 트렌딩 영화 조회
     */
    async getTrendingMovies(timeWindow = 'day', page = 1) {
        return await this.makeRequest(`/trending/movie/${timeWindow}`, { page });
    }

    /**
     * 트렌딩 TV 시리즈 조회
     */
    async getTrendingTVShows(timeWindow = 'day', page = 1) {
        return await this.makeRequest(`/trending/tv/${timeWindow}`, { page });
    }

    // ===================================
    // 발견(Discovery) API 메서드들
    // ===================================

    /**
     * 영화 발견 (고급 필터링)
     * 복잡한 조건으로 영화를 검색할 수 있습니다.
     * 
     * @param {Object} params - 필터링 파라미터
     * 가능한 파라미터 예시:
     * - with_genres: 장르 ID
     * - year: 개봉년도
     * - vote_average.gte: 최소 평점
     * - sort_by: 정렬 기준 (popularity.desc, vote_average.desc 등)
     */
    async discoverMovies(params = {}) {
        return await this.makeRequest('/discover/movie', params);
    }

    /**
     * TV 시리즈 발견 (고급 필터링)
     */
    async discoverTVShows(params = {}) {
        return await this.makeRequest('/discover/tv', params);
    }

    // ===================================
    // 이미지 URL 생성 유틸리티 메서드들
    // ===================================

    /**
     * 포스터 이미지 URL 생성
     * TMDB에서 제공하는 이미지 경로를 완전한 URL로 변환합니다.
     * 
     * @param {string} posterPath - TMDB 이미지 경로 (예: "/abc123.jpg")
     * @param {string} size - 이미지 크기 (w300, w500, w780, original 등)
     * @returns {string} 완전한 이미지 URL
     */
    getPosterUrl(posterPath, size = TMDB_CONFIG.POSTER_SIZE) {
        // 이미지 경로가 없는 경우 플레이스홀더 반환
        if (!posterPath) return 'https://via.placeholder.com/500x750/1e1e3f/94a3b8?text=No+Image';
        return `${this.imageBaseUrl}/${size}${posterPath}`;
    }

    /**
     * 배경 이미지 URL 생성
     * 영화/TV 시리즈의 배경 이미지 URL을 생성합니다.
     */
    getBackdropUrl(backdropPath, size = TMDB_CONFIG.BACKDROP_SIZE) {
        if (!backdropPath) return 'https://via.placeholder.com/1280x720/1e1e3f/94a3b8?text=No+Image';
        return `${this.imageBaseUrl}/${size}${backdropPath}`;
    }

    /**
     * 스틸 이미지 URL 생성 (TV 에피소드용)
     * TV 에피소드의 스틸컷 이미지 URL을 생성합니다.
     */
    getStillUrl(stillPath, size = TMDB_CONFIG.STILL_SIZE) {
        if (!stillPath) return 'https://via.placeholder.com/300x169/1e1e3f/94a3b8?text=No+Image';
        return `${this.imageBaseUrl}/${size}${stillPath}`;
    }

    // ===================================
    // 장르 정보 API 메서드들
    // ===================================

    /**
     * 영화 장르 목록 조회
     * 영화 필터링 UI에서 장르 목록을 표시할 때 사용합니다.
     */
    async getMovieGenres() {
        return await this.makeRequest('/genre/movie/list');
    }

    /**
     * TV 장르 목록 조회
     */
    async getTVGenres() {
        return await this.makeRequest('/genre/tv/list');
    }

    // ===================================
    // 트레일러 전용 API 메서드들
    // ===================================

    /**
     * 영화 트레일러 정보 조회
     * 
     * @param {number} movieId - 영화 ID
     * @returns {Promise<Object>} 트레일러 비디오 정보
     */
    async getMovieTrailer(movieId) {
        try {
            const response = await this.makeRequest(`/movie/${movieId}/videos`);
            return this.findBestTrailer(response.results);
        } catch (error) {
            console.warn(`영화 ${movieId} 트레일러 로드 실패:`, error);
            return null;
        }
    }

    /**
     * TV 시리즈 트레일러 정보 조회
     * 
     * @param {number} tvId - TV 시리즈 ID
     * @returns {Promise<Object>} 트레일러 비디오 정보
     */
    async getTVShowTrailer(tvId) {
        try {
            const response = await this.makeRequest(`/tv/${tvId}/videos`);
            return this.findBestTrailer(response.results);
        } catch (error) {
            console.warn(`TV 시리즈 ${tvId} 트레일러 로드 실패:`, error);
            return null;
        }
    }

    /**
     * 최적의 트레일러 선택 유틸리티
     * 
     * 트레일러 우선순위:
     * 1. 공식 트레일러 (Official Trailer)
     * 2. 티저 (Teaser)
     * 3. 기타 YouTube 비디오
     * 
     * @param {Array} videos - 비디오 배열
     * @returns {Object|null} 최적의 트레일러 정보
     */
    findBestTrailer(videos) {
        if (!videos || videos.length === 0) return null;

        // YouTube 비디오만 필터링
        const youtubeVideos = videos.filter(video => 
            video.site === 'YouTube' && 
            video.type && 
            ['Trailer', 'Teaser', 'Clip'].includes(video.type)
        );

        if (youtubeVideos.length === 0) return null;

        // 우선순위에 따른 트레일러 선택
        const trailer = youtubeVideos.find(video => 
            video.type === 'Trailer' && 
            video.name.toLowerCase().includes('official')
        ) || 
        youtubeVideos.find(video => video.type === 'Trailer') ||
        youtubeVideos.find(video => video.type === 'Teaser') ||
        youtubeVideos[0];

        return {
            key: trailer.key,
            name: trailer.name,
            type: trailer.type,
            site: trailer.site,
            url: `https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&controls=0&loop=1&playlist=${trailer.key}&rel=0&showinfo=0&modestbranding=1`
        };
    }

    /**
     * 트레일러 URL 생성
     * 
     * @param {string} videoKey - YouTube 비디오 키
     * @param {Object} options - 재생 옵션
     * @returns {string} 임베드 URL
     */
    getTrailerUrl(videoKey, options = {}) {
        const defaultOptions = {
            autoplay: 1,
            mute: 1,
            controls: 0,
            loop: 1,
            rel: 0,
            showinfo: 0,
            modestbranding: 1,
            enablejsapi: 1,
            origin: window.location.origin
        };

        const finalOptions = { ...defaultOptions, ...options };
        const params = new URLSearchParams(finalOptions);
        
        if (finalOptions.loop) {
            params.append('playlist', videoKey);
        }

        return `https://www.youtube.com/embed/${videoKey}?${params.toString()}`;
    }
}

// ===================================
// 서비스 인스턴스 생성 및 전역 등록
// ===================================

/**
 * TMDB 서비스 인스턴스 생성
 * 애플리케이션 전체에서 사용할 단일 인스턴스를 생성합니다.
 */
const tmdbService = new TMDBService();

// 디버깅: tmdbService 인스턴스 확인
console.log('🔧 TMDB Service 초기화 완료:', {
    apiKey: tmdbService.apiKey ? '설정됨' : '없음',
    baseUrl: tmdbService.baseUrl,
    tmdbService: typeof tmdbService
});

// 전역 객체로 등록 (디버깅용 및 다른 모듈에서 접근 가능)
window.tmdbService = tmdbService; 