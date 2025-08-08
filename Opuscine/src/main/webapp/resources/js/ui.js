/**
 * OpusCine UI 컴포넌트 관리 모듈
 * 
 * 이 파일은 모든 UI 상호작용과 모달 관리를 담당합니다.
 * 
 * 주요 컴포넌트:
 * 1. MediaModal - 영화/TV 상세 정보 모달
 * 2. HeroCarousel - 메인 페이지 히어로 캐러셀
 * 3. 유틸리티 함수들 (메시지 표시 등)
 */

/**
 * 미디어 상세 모달 관리 클래스
 * 
 * 영화와 TV 시리즈의 상세 정보를 모달로 표시하는 핵심 클래스입니다.
 * Netflix/Disney+ 스타일의 상세 정보 모달을 구현합니다.
 * 
 * 주요 기능:
 * 1. 영화/TV 시리즈 상세 정보 표시
 * 2. 트레일러 자동 재생
 * 3. TV 시리즈 시즌/에피소드 목록
 * 4. 반응형 모달 UI
 * 5. 키보드/마우스 이벤트 처리
 */
class MediaModal {
    constructor() {
        this.modal = document.getElementById('movie-modal');
        this.currentMediaType = 'movie'; // 'movie' or 'tv'
        this.currentMediaData = null;
        this.setupEventListeners();
        this.registfunction();
        this.first_tv_epi;

    }

    /**
     * 모달 이벤트 리스너 설정
     * 모달 닫기, 키보드 이벤트 등을 처리합니다.
     */
    setupEventListeners() {
        // 모달 닫기 버튼
        const closeBtn = this.modal.querySelector('.modal-close');
        closeBtn.addEventListener('click', () => this.close());

        // 모달 배경 클릭 시 닫기
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // ESC 키로 모달 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display === 'block') {
                this.close();
            }
        });
    }

    /**
     * 영화 상세 모달 표시
     * 
     * @param {number} movieId - TMDB 영화 ID
     * 
     * 동작 흐름:
     * 1. 로딩 상태 표시
     * 2. 모달 열기 및 스크롤 방지
     * 3. OTT 통합을 위한 데이터 속성 설정
     * 4. TMDB API에서 영화 상세 정보 조회
     * 5. 모달 콘텐츠 생성 및 표시
     * 6. 에러 처리
     */
    async showMovie(movieId,percent={}) {
        this.currentMediaType = 'movie';
        console.log(percent.percent);
        let result = percent.percent;
        if(!result){
            result = 0;
        }
        try {
            this.showLoading();
            this.modal.style.display = 'block';
            document.body.style.overflow = 'hidden'; // 배경 스크롤 방지

            // OTT 통합을 위한 데이터 속성 설정
            this.modal.dataset.tmdbId = movieId;
            this.modal.dataset.contentType = 'movie';

            const service = window.tmdbService || tmdbService;
            const movieDetails = await service.getMovieDetails(movieId);
            this.currentMediaData = movieDetails;
            console.log('확인'+this.currentMediaData);
            this.populateMovieModal(movieDetails,result);

        } catch (error) {
            showMessage('영화 정보를 불러오는데 실패했습니다.', 'error');
            this.close();
        }
    }

    /**
     * TV 시리즈 상세 모달 표시
     * 
     * 영화와 유사하지만 시즌/에피소드 정보를 추가로 로드합니다.
     * 
     * @param {number} tvId - TMDB TV 시리즈 ID
     */
    async showTVShow(tvId,percent={}) {
        this.currentMediaType = 'tv';
        console.log('showTVShow: ', tvId, percent);
        const result = percent.percent;
        try {
            
            this.showLoading();
            this.modal.style.display = 'block';
            document.body.style.overflow = 'hidden';

            // OTT 통합을 위한 데이터 속성 설정
            this.modal.dataset.tmdbId = tvId;
            this.modal.dataset.contentType = 'tv';

            const service = window.tmdbService || tmdbService;
            // TV 시리즈는 모든 에피소드 정보를 한 번에 로드
            const tvShowData = await service.fetchAllEpisodes(tvId);
            this.currentMediaData = tvShowData;
            this.populateTVShowModal(tvShowData,result);

        } catch (error) {
            console.error('showTVShow 오류:', error);
            showMessage('TV 시리즈 정보를 불러오는데 실패했습니다.', 'error');
            this.close();
        }
    }

    /**
     * 로딩 상태 표시
     * API 호출 중에 사용자에게 로딩 중임을 표시합니다.
     */
    showLoading() {
        const modalBody = this.modal.querySelector('.modal-body');
        modalBody.innerHTML = `
            <div class="modal-loading">
                <div class="loading-spinner"></div>
                <p>콘텐츠 정보를 불러오는 중...</p>
            </div>
        `;
    }

    /**
     * 영화 모달 콘텐츠 생성
     * 
     * @param {Object} movie - TMDB 영화 상세 정보
     * 
     * 주요 표시 정보:
     * - 배경/포스터 이미지
     * - 제목, 개봉년도, 러닝타임, 평점
     * - 장르, 줄거리
     * - 감독, 출연진, 제작사
     * - 트레일러 (자동 재생)
     */
    populateMovieModal(movie,percent) {
console.log(percent);
        this.updateMovieModalContent(movie.id,movie.genres,"movie");
        console.log(movie.genres[0].id);
        // 배경 이미지 설정 및 트레일러 로드
        const backdrop = this.modal.querySelector('#modal-backdrop');
        const backdropContainer = this.modal.querySelector('.movie-backdrop');
        const service = window.tmdbService || tmdbService;
        backdrop.src = service.getBackdropUrl(movie.backdrop_path);
        
        // 트레일러는 2초 후에 로드 (배경 이미지 먼저 표시)
        setTimeout(() => {
            this.loadTrailer(movie.id, backdropContainer, backdrop, 'movie');
        }, 2000);

        // 포스터 이미지
        const poster = this.modal.querySelector('#modal-poster');
        poster.src = service.getPosterUrl(movie.poster_path);

        // 기본 정보 설정
        const title = this.modal.querySelector('#modal-title');
        title.textContent = movie.title;

        const year = this.modal.querySelector('#modal-year');
        year.textContent = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';

        const runtime = this.modal.querySelector('#modal-runtime');
        runtime.textContent = movie.runtime ? `${movie.runtime}분` : 'N/A';

        const rating = this.modal.querySelector('#modal-rating');
        rating.textContent = movie.vote_average ? `★ ${movie.vote_average.toFixed(1)}` : 'N/A';

        // 장르 태그 생성
        const genres = this.modal.querySelector('#modal-genres');
        if (movie.genres && movie.genres.length > 0) {
            genres.innerHTML = movie.genres.map(genre => 
                `<span class="genre-tag">${genre.name}</span>`
            ).join('');
        } else {
            genres.innerHTML = '<span class="genre-tag">장르 정보 없음</span>';
        }

        // 줄거리
        const overview = this.modal.querySelector('#modal-overview');
        overview.textContent = movie.overview || '줄거리 정보가 없습니다.';

        // 크레딧 정보 (감독, 출연진)
        const director = this.modal.querySelector('#modal-director');
        if (movie.credits && movie.credits.crew) {
            const directors = movie.credits.crew.filter(person => person.job === 'Director');
            director.textContent = directors.length > 0 ? directors.map(d => d.name).join(', ') : '정보 없음';
        } else {
            director.textContent = '정보 없음';
        }

        const cast = this.modal.querySelector('#modal-cast');
        if (movie.credits && movie.credits.cast) {
            const mainCast = movie.credits.cast.slice(0, 5);
            cast.textContent = mainCast.length > 0 ? mainCast.map(actor => actor.name).join(', ') : '정보 없음';
        } else {
            cast.textContent = '정보 없음';
        }

        // 제작사 정보
        const production = this.modal.querySelector('#modal-production');
        if (movie.production_companies && movie.production_companies.length > 0) {
            production.textContent = movie.production_companies.slice(0, 3).map(company => company.name).join(', ');
        } else {
            production.textContent = '정보 없음';
        }
        //시청기록
        if(percent !=0){
        const top = this.modal.querySelector('.movie-poster-section');
           let progressBar   = document.createElement('div');
           progressBar.className = 'progress-bar';

           const progressFill  = document.createElement('div');
           progressFill.className = 'modalProgress-fill';
           progressFill.style.width = percent + '%';

           progressBar.appendChild(progressFill);
           top.appendChild(progressBar);
           }
        // OTT 통합 모듈이 있다면 OTT 링크 업데이트 시작
        if (window.ottIntegration) {
            setTimeout(() => {
                window.ottIntegration.updateModalPlayButton(this.modal,movie);
            }, 500); // 모달 UI가 완전히 렌더링된 후 OTT 링크 조회
        }
    }

    /**
     * TV 시리즈 모달 콘텐츠 생성
     * 
     * 영화와 유사하지만 TV 시리즈 특화 정보를 추가로 표시합니다:
     * - 시즌 수, 에피소드 수
     * - 방영 상태
     * - 시즌별 에피소드 목록 (접을 수 있는 형태)
     * 
     * @param {Object} tvData - TV 시리즈 통합 데이터 (시리즈, 시즌, 에피소드)
     * @param showTVShow - 시청비율
     */
         populateTVShowModal(tvData,percent) {
        const { tvShow, seasons, episodes } = tvData;
        this.updateTVShowModalContent(tvShow.id,tvShow.genres,'tv');
        console.log(tvShow.genres);

        // 배경 이미지 및 트레일러 설정 (영화와 동일)
        const backdrop = this.modal.querySelector('#modal-backdrop');
        const backdropContainer = this.modal.querySelector('.movie-backdrop');
        const service = window.tmdbService || tmdbService;
        backdrop.src = service.getBackdropUrl(tvShow.backdrop_path);
        
        setTimeout(() => {
            this.loadTrailer(tvShow.id, backdropContainer, backdrop, 'tv');
        }, 2000);

        // 포스터 이미지
        const poster = this.modal.querySelector('#modal-poster');
        poster.src = service.getPosterUrl(tvShow.poster_path);

        // TV 시리즈 제목
        const title = this.modal.querySelector('#modal-title');
        title.textContent = tvShow.name;

        // 메타 정보
        const year = this.modal.querySelector('#modal-year');
        const firstAirDate = tvShow.first_air_date ? new Date(tvShow.first_air_date).getFullYear() : '';
        const lastAirDate = tvShow.last_air_date ? new Date(tvShow.last_air_date).getFullYear() : '';
        year.textContent = firstAirDate ? (lastAirDate && lastAirDate !== firstAirDate ? `${firstAirDate}-${lastAirDate}` : firstAirDate) : 'N/A';

        const seasonsCount = this.modal.querySelector('#modal-seasons');
        seasonsCount.textContent = `${tvShow.number_of_seasons}시즌`;

        const episodesCount = this.modal.querySelector('#modal-episodes');
        episodesCount.textContent = `${tvShow.number_of_episodes}화`;

        const rating = this.modal.querySelector('#modal-rating');
        rating.textContent = tvShow.vote_average ? `★ ${tvShow.vote_average.toFixed(1)}` : 'N/A';

        const status = this.modal.querySelector('#modal-status');
        status.textContent = this.getStatusInKorean(tvShow.status);

        // 장르
        const genres = this.modal.querySelector('#modal-genres');
        if (tvShow.genres && tvShow.genres.length > 0) {
            genres.innerHTML = tvShow.genres.map(genre => 
                `<span class="genre-tag">${genre.name}</span>`
            ).join('');
        } else {
            genres.innerHTML = '<span class="genre-tag">장르 정보 없음</span>';
        }

        // 줄거리
        const overview = this.modal.querySelector('#modal-overview');
        overview.textContent = tvShow.overview || '줄거리 정보가 없습니다.';

        // 제작자 정보
        const creators = this.modal.querySelector('#modal-creators');
        if (tvShow.created_by && tvShow.created_by.length > 0) {
            creators.textContent = tvShow.created_by.map(creator => creator.name).join(', ');
        } else {
            creators.textContent = '정보 없음';
        }

        // 출연진 정보
        const cast = this.modal.querySelector('#modal-cast');
        if (tvShow.credits && tvShow.credits.cast) {
            const mainCast = tvShow.credits.cast.slice(0, 5);
            cast.textContent = mainCast.length > 0 ? mainCast.map(actor => actor.name).join(', ') : '정보 없음';
        } else {
            cast.textContent = '정보 없음';
        }

        // 제작사 정보
        const production = this.modal.querySelector('#modal-production');
        if (tvShow.production_companies && tvShow.production_companies.length > 0) {
            production.textContent = tvShow.production_companies.slice(0, 3).map(company => company.name).join(', ');
        } else {
            production.textContent = '정보 없음';
        }
        //시청기록
        if(percent !=0){
            const top = document.querySelector('.movie-poster-section');
               let progressBar   = document.createElement('div');
               progressBar.className = 'progress-bar';

               const progressFill  = document.createElement('div');
               progressFill.className = 'modalProgress-fill';
               progressFill.style.width = percent + '%';

               progressBar.appendChild(progressFill);
               top.appendChild(progressBar);
        }

        // 시즌 및 에피소드 정보 렌더링 (핵심 기능)
        this.renderSeasonsAndEpisodes(seasons, episodes);

        // OTT 통합 모듈이 있다면 OTT 링크 업데이트 시작 (TV 시리즈용)
        if (window.ottIntegration) {
            setTimeout(() => {
                window.ottIntegration.updateModalPlayButton(this.modal,{'id':tvShow.id,'runtime':this.first_tv_epi});
            }, 500); // 모달 UI가 완전히 렌더링된 후 OTT 링크 조회
        }
    }

    /**
     * 시즌 및 에피소드 목록 렌더링
     * 
     * 접을 수 있는 시즌 목록을 생성하고, 각 시즌 내부에 에피소드 목록을 표시합니다.
     * 
     * @param {Array} seasons - 시즌 정보 배열
     * @param {Array} episodes - 모든 에피소드 정보 배열
     * 
     * 구조:
     * - 시즌 헤더 (클릭 시 펼침/접힘)
     * - 시즌 개요
     * - 에피소드 목록 (스틸컷, 제목, 줄거리, 메타 정보)
     */
    renderSeasonsAndEpisodes(seasons, episodes) {
        const seasonsContainer = this.modal.querySelector('#seasons-container');
        const result =episodes.filter(ep => ep.season ==1).map(ep => ep.runtime);
        this.first_tv_epi = result[0];
        let seasonsHTML = '';
        seasons.forEach(season => {
            // 현재 시즌에 속하는 에피소드들 필터링
            const seasonEpisodes = episodes.filter(ep => ep.season === season.season_number);
            seasonsHTML += `
                <div class="season-section">
                    <div class="season-header" onclick="this.parentElement.classList.toggle('expanded')">
                        <h3>시즌 ${season.season_number}</h3>
                        <div class="season-info">
                            <span>${season.episode_count}화</span>
                            <span class="season-year">${season.air_date ? new Date(season.air_date).getFullYear() : ''}</span>
                            <span class="expand-icon">▼</span>
                        </div>
                    </div>
                    <div class="season-overview">
                        <p>${season.overview || '시즌 설명이 없습니다.'}</p>
                    </div>
                    <div class="episodes-list">
                        ${seasonEpisodes.map((episode, index) => `
                            <div class="episode-item">
                                <div class="episode-number">${episode.episode}</div>
                                <div class="episode-still">
                                    <img src="${(window.tmdbService || tmdbService).getStillUrl(episode.still_path)}" alt="${episode.title}" loading="lazy">
                                    <div class="episode-runtime">${episode.runtime ? episode.runtime + '분' : ''}</div>
                                </div>
                                <div class="episode-info">
                                    <h4 class="episode-title">${episode.title}</h4>
                                    <p class="episode-overview">${episode.overview || '에피소드 설명이 없습니다.'}</p>
                                    <div class="episode-meta">
                                        <span class="episode-date">${episode.air_date ? new Date(episode.air_date).toLocaleDateString('ko-KR') : ''}</span>
                                        ${episode.vote_average ? `<span class="episode-rating">★ ${episode.vote_average.toFixed(1)}</span>` : ''}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });
        
        seasonsContainer.innerHTML = seasonsHTML;
    }

    /**
     * 트레일러 로드 및 자동 재생
     * 
     * YouTube 트레일러를 찾아서 iframe으로 임베드하고 자동 재생합니다.
     * 다중 언어 지원 및 대체 영상 타입 지원을 포함합니다.
     * 
     * @param {number} mediaId - 미디어 ID
     * @param {Element} backdropContainer - 배경 컨테이너
     * @param {Element} backdropImage - 배경 이미지
     * @param {string} mediaType - 미디어 타입 ('movie' or 'tv')
     * 
     * 검색 우선순위:
     * 1. 한국어 공식 트레일러
     * 2. 영어 공식 트레일러
     * 3. 기타 언어 트레일러
     * 4. 티저, 클립 등 대체 영상
     */
    async loadTrailer(mediaId, backdropContainer, backdropImage, mediaType) {
        try {
            
            // 다중 언어로 트레일러 검색
            let trailer = await this.searchTrailer(mediaId, mediaType, 'ko-KR');
            
            if (!trailer) {
                trailer = await this.searchTrailer(mediaId, mediaType, 'en-US');
            }
            
            if (!trailer) {
                trailer = await this.searchTrailer(mediaId, mediaType, null);
            }

            if (trailer) {
                
                // 기존 iframe 제거
                const existingIframe = backdropContainer.querySelector('.trailer-iframe');
                if (existingIframe) {
                    existingIframe.remove();
                }

                // YouTube 임베드 URL 생성 (고화질, 자동재생 설정)
                const videoURL = `https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=0&controls=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=${window.location.origin}&vq=hd1080&hd=1&quality=hd1080&fmt=22&fs=1&disablekb=0&iv_load_policy=3&showinfo=0`;
                
                // iframe 요소 생성
                const iframe = document.createElement('iframe');
                iframe.className = 'trailer-iframe';
                iframe.src = videoURL;
                iframe.width = '100%';
                iframe.height = '100%';
                iframe.frameborder = '0';
                iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen';
                iframe.allowfullscreen = true;
                iframe.setAttribute('webkitallowfullscreen', 'true');
                iframe.setAttribute('mozallowfullscreen', 'true');
                iframe.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    z-index: 2;
                    border-radius: 12px;
                `;

                // 클릭 이벤트 차단 요소 (모달 닫힘 방지)
                const clickBlocker = document.createElement('div');
                clickBlocker.className = 'iframe-click-blocker';
                clickBlocker.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 3;
                    background: transparent;
                    pointer-events: auto;
                    cursor: pointer;
                `;
                
                clickBlocker.addEventListener('click', (e) => {
                    e.stopPropagation();
                });

                // DOM에 추가
                backdropImage.style.display = 'none';
                backdropContainer.appendChild(iframe);
                backdropContainer.appendChild(clickBlocker);
            }

        } catch (error) {
            // 트레일러 로드 실패 (조용히 무시)
        }
    }

    /**
     * 트레일러 검색 함수
     * 
     * 특정 언어와 품질 우선순위에 따라 최적의 트레일러를 찾습니다.
     * 
     * @param {number} mediaId - 미디어 ID
     * @param {string} mediaType - 미디어 타입
     * @param {string} language - 언어 코드 (null이면 전체 검색)
     * @returns {Object|null} 트레일러 정보 또는 null
     * 
     * 검색 우선순위:
     * 1. 공식 트레일러 (official: true)
     * 2. 일반 트레일러
     * 3. 티저
     * 4. 클립
     * 5. 기타 YouTube 영상
     */
    async searchTrailer(mediaId, mediaType, language) {
        try {
            const service = window.tmdbService || tmdbService;
            const languageParam = language ? `&language=${language}` : '';
            const response = await fetch(`https://api.themoviedb.org/3/${mediaType}/${mediaId}/videos?api_key=${service.apiKey}${languageParam}`);
            const data = await response.json();
            
            // 트레일러 검색 중

            if (!data.results || data.results.length === 0) {
                return null;
            }

            // 우선순위에 따른 트레일러 검색
            let trailer = data.results.find(v => 
                v.site === "YouTube" && 
                v.type === "Trailer" && 
                v.official === true
            );

            if (!trailer) {
                trailer = data.results.find(v => 
                    v.site === "YouTube" && 
                    v.type === "Trailer"
                );
            }

            if (!trailer) {
                trailer = data.results.find(v => 
                    v.site === "YouTube" && 
                    v.type === "Teaser"
                );
            }

            if (!trailer) {
                trailer = data.results.find(v => 
                    v.site === "YouTube" && 
                    v.type === "Clip"
                );
            }

            if (!trailer) {
                trailer = data.results.find(v => v.site === "YouTube");
            }

            return trailer || null;

        } catch (error) {
            return null;
        }
    }

    /**
     * 모달 닫기
     * 
     * 모달을 닫고 관련 리소스를 정리합니다.
     * - 스크롤 복원
     * - 트레일러 정지 (iframe 제거)
     * - 배경 이미지 복원
     * - OTT 데이터 속성 정리
     */
    close() {
        this.modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // 트레일러 iframe 제거 (자동으로 재생 정지)
        const trailerIframe = this.modal.querySelector('.trailer-iframe');
        if (trailerIframe) {
            trailerIframe.remove();
        }
        
        const clickBlocker = this.modal.querySelector('.iframe-click-blocker');
        if (clickBlocker) {
            clickBlocker.remove();
        }
        
        // 배경 이미지 복원
        const backdrop = this.modal.querySelector('#modal-backdrop');
        if (backdrop) {
            backdrop.style.display = 'block';
        }

        // OTT 데이터 속성 정리
        this.modal.removeAttribute('data-tmdb-id');
        this.modal.removeAttribute('data-content-type');
    }

    getStatusInKorean(status) {
        const statusMap = {
            'Returning Series': '방영중',
            'Ended': '완결',
            'Canceled': '취소됨',
            'In Production': '제작중',
            'Pilot': '파일럿',
            'Planned': '계획됨'
        };
        return statusMap[status] || status;
    }

    updateMovieModalContent(itemId,obj=[],type) {
        //장르 저장을 위해 하나의 문자열
        let text='';
        if (obj && obj.length > 0) {
        obj.forEach(i=>{
            text +=','+i.id;
            });
        }
        text =text.slice(1);
        this.getEvaluate_with_Interested(itemId);

        const modalBody = this.modal.querySelector('.modal-body');
        modalBody.innerHTML = `
            <div class="movie-backdrop">
                <img id="modal-backdrop" src="" alt="Movie Backdrop">
                <div class="backdrop-overlay"></div>
            </div>
            <div class="movie-details">
                <div class="movie-poster-section">
                    <img id="modal-poster" src="" alt="Movie Poster">
                </div>
                <div class="movie-info-section">
                    <h1 id="modal-title"></h1>
                    <div class="movie-meta">
                        <span id="modal-year" class="meta-item"></span>
                        <span id="modal-runtime" class="meta-item"></span>
                        <span id="modal-rating" class="meta-item rating"></span>
                    </div>
                    <div class="movie-genres" id="modal-genres"></div>
                    <p id="modal-overview" class="movie-overview"></p>
                    <div class="movie-actions">
                        <div class="action-buttons-row">
                            <button class="btn btn-play modal-btn play-button">▶ 재생</button>
                            <button class="btn btn-watch-together modal-btn watch-together-button" data-id="${itemId}_${text}_${type}">👥 같이보기</button>
                            <button class="btn btn-wishlist modal-btn wishlist-button" data-id="${itemId}_${text}_${type}">+ 찜하기</button>
                            <button class="btn btn-like modal-btn like-box-btn" data-id="${itemId}_${text}_${type}" title="좋아요">👍</button>
                            <button class="btn btn-dislike modal-btn dislike-box-btn" data-id="${itemId}_${text}_${type}" title="싫어요">👎</button>
                        </div>
                    </div>
                    <div class="movie-additional-info">
                        <div class="info-row">
                            <span class="info-label">감독:</span>
                            <span id="modal-director" class="info-value"></span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">출연:</span>
                            <span id="modal-cast" class="info-value"></span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">제작사:</span>
                            <span id="modal-production" class="info-value"></span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    updateTVShowModalContent(itemId,obj=[],type) {
    //장르 저장을 위해 하나의 문자열
    let text='';
    if (obj && obj.length > 0) {
    obj.forEach(i=>{
        text +=','+i.id;
        });
    }
    text =text.slice(1);
    this.getEvaluate_with_Interested(itemId);

    const modalBody = this.modal.querySelector('.modal-body');
    modalBody.innerHTML = `
        <div class="movie-backdrop">
            <img id="modal-backdrop" src="" alt="TV Show Backdrop">
            <div class="backdrop-overlay"></div>
        </div>
        <div class="movie-details">
            <div class="movie-poster-section">
                <img id="modal-poster" src="" alt="TV Show Poster">
            </div>
            <div class="movie-info-section">
                <h1 id="modal-title"></h1>
                <div class="movie-meta">
                    <span id="modal-year" class="meta-item"></span>
                    <span id="modal-seasons" class="meta-item"></span>
                    <span id="modal-episodes" class="meta-item"></span>
                    <span id="modal-rating" class="meta-item rating"></span>
                    <span id="modal-status" class="meta-item status"></span>
                </div>
                <div class="movie-genres" id="modal-genres"></div>
                <p id="modal-overview" class="movie-overview"></p>
                <div class="movie-actions">
                    <div class="action-buttons-row">
                        <button class="btn btn-play modal-btn play-button">▶ 재생</button>
                        <button class="btn btn-watch-together modal-btn watch-together-button" data-id="${itemId}_${text}_${type}">👥 같이보기</button>
                        <button class="btn btn-wishlist modal-btn wishlist-button" data-id="${itemId}_${text}_${type}">+ 찜하기</button>
                        <button class="btn btn-like modal-btn like-box-btn" data-id="${itemId}_${text}_${type}" title="좋아요">👍</button>
                        <button class="btn btn-dislike modal-btn dislike-box-btn" data-id="${itemId}_${text}_${type}" title="싫어요">👎</button>
                    </div>
                </div>
                <div class="movie-additional-info">
                    <div class="info-row">
                        <span class="info-label">제작자:</span>
                        <span id="modal-creators" class="info-value"></span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">출연:</span>
                        <span id="modal-cast" class="info-value"></span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">제작사:</span>
                        <span id="modal-production" class="info-value"></span>
                    </div>
                </div>
            </div>
        </div>
        <div class="seasons-episodes-section">
            <h2>시즌 & 에피소드</h2>
            <div id="seasons-container" class="seasons-container">
                <!-- 시즌 및 에피소드 목록이 여기에 동적으로 생성됩니다 -->
            </div>
        </div>
    `;
}
         async registfunction() {
                    this.modal.addEventListener('click', e => {
                      const btn = e.target.closest('.modal-btn');
                      if (!btn) return;

                      const value = btn.dataset.id;      // 공통 itemId
                      const splits = value.split('_');
                      const id = splits[0];
                      const genres = splits[1];
                      const type = splits[2];
                      if (btn.classList.contains('btn-wishlist')) {
                        this.interested(id, btn,type);
                      } else if (btn.classList.contains('btn-like')) {
                        this.evaluate(id,'like',genres,type);
                      } else if (btn.classList.contains('btn-dislike')) {
                        this.evaluate(id,'dislike',genres,type);
                      } else if(btn.classList.contains('btn-watch-together')){
                        location.href=`/OpusCine/user/watch-together/${id}`;
                      }
                    });
              }

        interested(id, wishlistBtn,type){
            // 클릭된 버튼을 직접 사용 (파라미터로 받음)
            if (!wishlistBtn) {
                wishlistBtn = document.querySelector('.btn-wishlist');
            }
            
            console.log('찜 버튼 클릭 - ID:', id, '현재 active 상태:', wishlistBtn.classList.contains('active'));
            
            // 현재 상태 확인
            const isCurrentlyActive = wishlistBtn.classList.contains('active');
            
            // UI 먼저 토글 (즉시 반응)
            if (isCurrentlyActive) {
                console.log('찜 제거 토글');
                this.updateWishlistUI(wishlistBtn, false);
            } else {
                console.log('찜 등록 토글');
                this.updateWishlistUI(wishlistBtn, true);
            }
            
            // 서버에 요청 (토글 처리는 서버에서)
            console.log('서버에 찜 토글 요청');
            fetch(`/OpusCine/user/interested/${id}/${type}`,{
                method:'POST',
                headers:{'Accept':'application/json'}})
                .then(res =>{ 
                    if(res.status == 401){
                       this.showEvaluationMessage('로그인 후 이용할 수 있습니다', 'error');
                        wishlistBtn.innerHTML = '+ 찜하기';
                        wishlistBtn.classList.remove('active');
                    }
                    
                    if(res.ok) {
                        console.log('서버 찜 토글 요청 성공');
                    }
                })
                .catch(error => {
                    console.error('찜 요청 실패:', error);
                    // 에러 시 UI 상태 되돌리기
                   this.showEvaluationMessage('찜 처리에 실패했습니다', 'error');
                    wishlistBtn.innerHTML = '+ 찜하기';
                     wishlistBtn.classList.remove('active');
                });
        }

        removeWishlist(id, wishlistBtn) {
            // 현재는 interested 함수에서 토글 처리
            console.log('removeWishlist 함수 - interested에서 처리됨');
        }

        updateWishlistUI(wishlistBtn, isActive) {
            console.log('updateWishlistUI 호출 - isActive:', isActive, 'Button:', wishlistBtn);
            if (isActive) {
                wishlistBtn.classList.add('active');
                wishlistBtn.innerHTML = '✓ 찜한 콘텐츠';
                this.showEvaluationMessage('내가 찜한 콘텐츠에 추가되었습니다.', 'success');
            } else {
                wishlistBtn.classList.remove('active');
                wishlistBtn.innerHTML = '+ 내가 찜한 콘텐츠';
                this.showEvaluationMessage('내가 찜한 콘텐츠에서 제거되었습니다.', 'info');
            }
        }

        async evaluate(id,flag,genres,type){
            // 현재 버튼 상태 확인
            const likeBtn = document.querySelector('.btn-like');
            const dislikeBtn = document.querySelector('.btn-dislike');
            
            // 이미 같은 평가가 활성화된 경우 취소
            if (flag === 'like' && likeBtn.classList.contains('active')) {
                this.removeEvaluation(id, likeBtn, dislikeBtn);
                return;
            }
            
            if (flag === 'dislike' && dislikeBtn.classList.contains('active')) {
                this.removeEvaluation(id, likeBtn, dislikeBtn);
                return;
            }
            
            fetch(`/OpusCine/user/evaluate/${id}`,{
                    method:'POST',
                    headers:{'Accept':'application/json','Content-Type':'application/json'},
                    body:JSON.stringify({'evaluate':flag,'genre':genres,'mediaType':type})})
                    .then(res =>{
                        if(res.status == 401){
                            this.showEvaluationMessage('로그인 후 이용할 수 있습니다', 'error');
                            return;
                        }

                        // 성공적으로 평가된 경우 UI 업데이트
                        if(res.ok) {
                            this.updateEvaluationUI(flag, likeBtn, dislikeBtn);
                        }else{
                        this.showEvaluationError('평가를 저장하는데 실패했습니다.');
                        }
                    })
                    .catch(error => {
                        console.error('평가 실패:', error);
                        this.showEvaluationError('평가를 저장하는데 실패했습니다.');
                    });
        }



         /*서버에 해당하는 영화/티비의 관심정보(관심,좋아요)
                 * @param {string} id - 영화 정보의 ID
                */
        async getEvaluate_with_Interested(id){
            const getevaluate = await fetch(`/OpusCine/user/totalEvaluate/${id}`,{
            headers:{'Accept':'application/json'}
            });
            let result =null;
            if(getevaluate.status == '500'){
                this.showEvaluationMessage('오류가 발생했습니다. 잠시후 시도해주세요.', 'info');
                result= null;
            }
            if(getevaluate.status == '204'){
                result= null;
            }
             result = await getevaluate.json();
            const likeBtn =document.querySelector('.btn-like');
            const dislikeBtn =document.querySelector('.btn-dislike');
            const wishlistBtn =document.querySelector('.btn-wishlist');
            const evaluateMap ={};

            if(result != null){
             for(const[key,value] of Object.entries(result)){
                    console.log(`${key}${value}`);
                    evaluateMap[key] = value;
                    }
                    if(evaluateMap.interested == 'ok'){
                          wishlistBtn.classList.add('active');
                         wishlistBtn.innerHTML = '✓ 찜한 콘텐츠';
                    }

                if(evaluateMap.evaluate){
                    if(evaluateMap.evaluate == 'like'){
                     likeBtn.classList.add('active');
                    }else{
                    dislikeBtn.classList.add('active');
                    }
                }
            }


        }




        async removeEvaluation(id, likeBtn, dislikeBtn) {
             fetch(`/OpusCine/user/evaluate/${id}`,{
             method:'DELETE',
             headers:{'Accept':'application/json','Content-Type':'application/json'}
            })
            .then(res =>{
                if(res.status == '401'){
                    return;
                }
                if(res.ok){
                   likeBtn.classList.remove('active');
                   dislikeBtn.classList.remove('active');
                   this.showEvaluationMessage('평가가 취소되었습니다.', 'info');
                }
            })
            .catch(error =>{
                console.log('평가실패'+ error);
                this.showEvaluationError('오류가 발생했습니다. 다시 시도 해주세요.');
            });

            
            console.log(`🔄 영화 ${id}의 평가가 취소되었습니다.`);
            this.showEvaluationMessage('평가가 취소되었습니다.', 'info');

        }

        updateEvaluationUI(flag, likeBtn, dislikeBtn) {
            // 모든 버튼 초기화
            likeBtn.classList.remove('active');
            dislikeBtn.classList.remove('active');
            
            // 선택된 버튼 활성화
            if (flag === 'like') {
                likeBtn.classList.add('active');
                this.showEvaluationMessage('이 작품을 좋아한다고 표시했습니다.', 'success');
                console.log('👍 좋아요 평가 완료');
            } else if (flag === 'dislike') {
                dislikeBtn.classList.add('active');
                this.showEvaluationMessage('이 작품을 별로라고 표시했습니다.', 'info');
                console.log('👎 싫어요 평가 완료');
            }
        }

        showEvaluationMessage(message, type = 'success') {
            // 기존 메시지 제거
            const existingMessage = document.querySelector('.evaluation-message');
            if (existingMessage) {
                existingMessage.remove();
            }

            // 새 메시지 생성
            const messageDiv = document.createElement('div');
            messageDiv.className = `evaluation-message ${type}`;
            messageDiv.textContent = message;

            // 모달 내부에 메시지 표시
            const modalActions = document.querySelector('.movie-actions');
            if (modalActions) {
                modalActions.parentNode.insertBefore(messageDiv, modalActions.nextSibling);
            }

            // 3초 후 자동 제거
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 3000);
        }

        showEvaluationError(message) {
            this.showEvaluationMessage(message, 'error');
        }
}

/**
 * Hero 캐러셀 클래스
 * 
 * 메인 페이지 상단의 대형 캐러셀을 관리합니다.
 * Netflix/Disney+ 스타일의 자동 회전 캐러셀을 구현합니다.
 * 
 * 주요 기능:
 * 1. 인기 콘텐츠 기반 슬라이드 생성
 * 2. 자동 재생 (7초 간격)
 * 3. 수동 네비게이션 (좌우 버튼, 도트)
 * 4. 호버 시 자동 재생 일시정지
 */
class HeroCarousel {
    constructor() {
        this.currentSlide = 0;
        this.slides = [];
        this.autoPlayInterval = null;
        this.heroContainer = document.getElementById('hero-carousel');
        this.dotsContainer = document.getElementById('hero-dots');
        this.prevBtn = document.getElementById('hero-prev');
        this.nextBtn = document.getElementById('hero-next');
        
        this.init();
    }

    /**
     * 캐러셀 초기화
     * 
     * 동작 흐름:
     * 1. 기본 OpusCine 슬라이드 설정
     * 2. 추천 콘텐츠 로드
     * 3. 이벤트 리스너 설정
     * 4. 자동 재생 시작
     */
    async init() {
        // 기본 OpusCine 슬라이드를 slides 배열에 추가
        const defaultSlide = document.querySelector('.hero-slide[data-slide="0"]');
        if (defaultSlide) {
            this.slides.push(defaultSlide);
        }
        
        await this.loadFeaturedContent();
        this.setupEventListeners();
        this.startAutoPlay();
    }

    /**
     * 추천 콘텐츠 로드 및 슬라이드 생성
     * 
     * 인기 영화와 TV 시리즈를 혼합하여 다양한 콘텐츠를 표시합니다.
     * 각 슬라이드는 고화질 배경과 상세 정보를 포함합니다.
     */
    async loadFeaturedContent() {
        try {
            // 인기 영화와 TV 시리즈를 병렬로 로드
            const service = window.tmdbService || tmdbService;
            const [popularMovies, popularTVShows] = await Promise.all([
                service.getPopularMovies(),
                service.getPopularTVShows()
            ]);
            
            // 영화 3개, TV 시리즈 2개를 섞어서 배치
            const featuredContent = [
                ...popularMovies.results.slice(0, 3).map(item => ({...item, media_type: 'movie'})),
                ...popularTVShows.results.slice(0, 2).map(item => ({...item, media_type: 'tv'}))
            ];
            
            // 추천 콘텐츠 로드 완료

            // 각 콘텐츠에 대해 슬라이드 생성 (기본 슬라이드 다음부터)
            for (let i = 0; i < featuredContent.length; i++) {
                const content = featuredContent[i];
                await this.createContentSlide(content, i + 1); // 기본 슬라이드가 0번이므로 1번부터 시작
            }

            this.updateDots();

        } catch (error) {
            // 추천 콘텐츠 로드 실패 (조용히 무시)
        }
    }

    /**
     * 콘텐츠 슬라이드 생성
     * 
     * @param {Object} content - 영화/TV 시리즈 데이터
     * @param {number} slideIndex - 슬라이드 인덱스
     */
    async createContentSlide(content, slideIndex) {
        try {
            const service = window.tmdbService || tmdbService;
            const title = content.title || content.name;
            const overview = content.overview || '줄거리 정보가 없습니다.';
            const releaseDate = content.release_date || content.first_air_date;
            const year = releaseDate ? new Date(releaseDate).getFullYear() : '';
            const rating = content.vote_average ? content.vote_average.toFixed(1) : 'N/A';
            const backdropUrl = service.getBackdropUrl(content.backdrop_path);
            const mediaTypeDisplay = content.media_type === 'movie' ? '영화' : 'TV 시리즈';

            // 장르 정보 가져오기
            let genres = [];
            try {
                if (content.media_type === 'movie') {
                    const movieDetails = await service.getMovieDetails(content.id);
                    genres = movieDetails.genres || [];
                } else {
                    const tvDetails = await service.getTVShowDetails(content.id);
                    genres = tvDetails.genres || [];
                }
            } catch (error) {
                // 장르 정보 로드 실패 (조용히 무시)
            }

            // 슬라이드 HTML 생성
            const slide = document.createElement('div');
            slide.className = `hero-slide`;
            slide.style.backgroundImage = `url(${backdropUrl})`;
            slide.setAttribute('data-slide', slideIndex.toString());
            
            slide.innerHTML = `
                <div class="hero-content">
                    <div class="hero-media-type">${mediaTypeDisplay}</div>
                    <h1 class="hero-title">${title}</h1>
                    <div class="hero-meta">
                        <span class="hero-year">${year}</span>
                        <span class="hero-rating">★ ${rating}</span>
                    </div>
                    <div class="hero-genres">
                        ${genres.slice(0, 3).map(genre => `<span class="genre-tag">${genre.name}</span>`).join('')}
                    </div>
                    <p class="hero-description">${overview.length > 200 ? overview.substring(0, 200) + '...' : overview}</p>
                    <div class="hero-buttons">
                        <button class="btn btn-play" onclick="mediaModal.show${content.media_type === 'movie' ? 'Movie' : 'TVShow'}(${content.id})">
                            ▶ 재생
                        </button>
                        <button class="btn btn-info" onclick="mediaModal.show${content.media_type === 'movie' ? 'Movie' : 'TVShow'}(${content.id})">
                            ℹ 상세 정보
                        </button>
                    </div>
                </div>
                <div class="hero-fade"></div>
            `;

            // 히어로 컨테이너에 추가
            if (this.heroContainer) {
                this.heroContainer.appendChild(slide);
                this.slides.push(slide);
            }

        } catch (error) {
            // 슬라이드 생성 실패 (조용히 무시)
        }
    }

    /**
     * 도트 네비게이션 업데이트
     */
    updateDots() {
        if (!this.dotsContainer) return;

        this.dotsContainer.innerHTML = '';
        
        // 기본 슬라이드(bg.png) + API 슬라이드들 모두 포함
        this.slides.forEach((_, index) => {
            const dot = document.createElement('button');
            dot.className = `hero-dot ${index === 0 ? 'active' : ''}`;
            dot.addEventListener('click', () => this.goToSlide(index));
            this.dotsContainer.appendChild(dot);
        });
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => this.previousSlide());
        }

        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.nextSlide());
        }

        // 호버 시 자동 재생 일시정지
        if (this.heroContainer) {
            this.heroContainer.addEventListener('mouseenter', () => this.pauseAutoPlay());
            this.heroContainer.addEventListener('mouseleave', () => this.startAutoPlay());
        }
    }

    /**
     * 특정 슬라이드로 이동
     */
    goToSlide(index) {
        this.slides.forEach((slide, i) => {
            slide.classList.toggle('active', i === index);
        });

        const dots = this.dotsContainer?.querySelectorAll('.hero-dot');
        dots?.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });

        this.currentSlide = index;
    }

    /**
     * 다음 슬라이드
     */
    nextSlide() {
        const nextIndex = (this.currentSlide + 1) % this.slides.length;
        this.goToSlide(nextIndex);
    }

    /**
     * 이전 슬라이드
     */
    previousSlide() {
        const prevIndex = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
        this.goToSlide(prevIndex);
    }

    /**
     * 자동 재생 시작
     */
    startAutoPlay() {
        this.pauseAutoPlay();
        this.autoPlayInterval = setInterval(() => {
            this.nextSlide();
        }, 7000);
    }

    /**
     * 자동 재생 일시정지
     */
    pauseAutoPlay() {
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
        }
    }
}

/**
 * 메시지 표시 유틸리티 함수
 * 
 * 사용자에게 성공/에러/정보 메시지를 표시합니다.
 * 토스트 스타일의 임시 메시지를 구현합니다.
 * 
 * @param {string} message - 표시할 메시지
 * @param {string} type - 메시지 타입 ('success', 'error', 'info', 'warning')
 */
function showMessage(message, type = 'info') {
    // 기존 메시지 제거 (중복 방지)
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }

    // 새 메시지 요소 생성
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);

    // 애니메이션을 위한 지연 실행
    setTimeout(() => {
        messageDiv.classList.add('show');
    }, 10);

    // 3초 후 자동 제거 (애니메이션 포함)
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.classList.remove('show');
            // 애니메이션 완료 후 DOM에서 제거
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 300);
        }
    }, 3000);
}

/**
 * 사용자 프로필 dropdown 토글 기능
 * 프로필 이미지 클릭 시 dropdown 메뉴를 표시/숨김
 */
function toggleDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (!dropdown) return;
    
    if (dropdown.classList.contains('show')) {
        hideDropdown();
    } else {
        showDropdown();
    }
}

/**
 * 사용자 프로필 dropdown 표시
 */
function showDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (!dropdown) return;
    
    dropdown.classList.add('show');
    
    // 외부 클릭 시 dropdown 숨기기 위한 이벤트 리스너 추가
    setTimeout(() => {
        document.addEventListener('click', handleOutsideClick);
    }, 100);
}

/**
 * 사용자 프로필 dropdown 숨기기
 */
function hideDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (!dropdown) return;
    
    dropdown.classList.remove('show');
    document.removeEventListener('click', handleOutsideClick);
}

/**
 * dropdown 외부 클릭 감지
 * dropdown 영역 외부 클릭 시 메뉴를 숨김
 */
function handleOutsideClick(event) {
    const dropdown = document.getElementById('userDropdown');
    const profileImg = document.querySelector('.user-profile-img');
    
    if (!dropdown || !profileImg) return;
    
    // 클릭된 요소가 dropdown이나 프로필 이미지가 아닌 경우 dropdown 숨기기
    if (!dropdown.contains(event.target) && !profileImg.contains(event.target)) {
        hideDropdown();
    }
}

/**
 * ESC 키로 dropdown 닫기
 */
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const dropdown = document.getElementById('userDropdown');
        if (dropdown && dropdown.classList.contains('show')) {
            hideDropdown();
        }
    }
});

/**
 * 페이지 로드 시 dropdown 기능 초기화
 */
document.addEventListener('DOMContentLoaded', function() {
    // 기존 초기화 코드가 있다면 여기에 추가
    
    // 프로필 이미지에 클릭 이벤트 리스너 추가 (onclick 대신 사용할 수 있는 대안)
    const profileImg = document.querySelector('.user-profile-img');
    if (profileImg) {
        profileImg.addEventListener('click', function(event) {
            event.stopPropagation(); // 이벤트 버블링 방지
            toggleDropdown();
        });
    }
    
    // 안정적인 hover 제어 추가
    setupStableHover();
    
    // 로그인한 사용자 정보 로드
    //loadCurrentUserProfile();
});

/**
 * 현재 로그인한 사용자의 프로필 정보를 로드하여 UI에 반영
 */
/*async function loadCurrentUserProfile() {
    const userMenu = document.querySelector('.user-menu');
    if (!userMenu) {
        // 로그인하지 않은 상태이므로 사용자 메뉴가 없음
        return;
    }
    
    try {
        const response = await fetch('/OpusCine/user/profile', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const userInfo = await response.json();
            updateUserProfileUI(userInfo);
            // 사용자 정보 업데이트 후 hover 이벤트 재설정
            setupStableHover();
        } else if (response.status === 401) {
            console.log('사용자가 로그인하지 않음');
        } else {
            console.log('사용자 정보를 가져올 수 없습니다.');
        }
    } catch (error) {
        console.error('사용자 프로필 정보 로드 실패:', error);
    }
}*/

/**
 * 사용자 정보를 받아서 UI 업데이트
 */
function updateUserProfileUI(userInfo) {
    // 프로필 이미지 업데이트
    const profileImg = document.querySelector('.user-profile-img');
    if (profileImg && userInfo.profile) {
        // 프로필 경로가 절대 경로가 아니면 앞에 /OpusCine를 추가
        const profilePath = userInfo.profile.startsWith('/OpusCine') ? 
            userInfo.profile : 
            '/OpusCine' + userInfo.profile;
        profileImg.src = profilePath;
        profileImg.alt = `${userInfo.nickNm || userInfo.username}의 프로필`;
    }
    
    // 드롭다운 메뉴에 사용자명 표시 (선택사항)
    const dropdown = document.querySelector('.user-dropdown-content');
    if (dropdown && (userInfo.nickNm || userInfo.username)) {
        // 기존 링크들 앞에 사용자 정보 표시 추가
        const existingLinks = dropdown.innerHTML;
        const userName = userInfo.nickNm || userInfo.username;
        
        dropdown.innerHTML = `
            <div class="user-info-header">
                <span class="user-name">${userName}</span>
                <span class="user-email">${userInfo.email || ''}</span>
            </div>
            ${existingLinks}
        `;
    }
}

/**
 * 안정적인 hover 제어 설정
 * 프로필 이미지와 드롭다운 메뉴 사이의 마우스 이동 시에도 드롭다운이 사라지지 않도록 함
 */
function setupStableHover() {
    const userDropdown = document.querySelector('.user-dropdown');
    const dropdown = document.querySelector('.user-dropdown-content');
    
    if (!userDropdown || !dropdown) {
        return; // 로그인하지 않은 상태
    }
    
    // 이미 이벤트가 설정되었다면 중복 설정 방지
    if (userDropdown.hasAttribute('data-hover-setup')) {
        return;
    }
    
    let hoverTimeout = null;
    
    // 드롭다운 표시 함수
    function showDropdownHover() {
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            hoverTimeout = null;
        }
        dropdown.classList.add('show');
    }
    
    // 드롭다운 숨기기 함수 (지연 적용)
    function hideDropdownHover() {
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
        }
        
        hoverTimeout = setTimeout(() => {
            dropdown.classList.remove('show');
            hoverTimeout = null;
        }, 150); // 150ms 지연 후 숨김
    }
    
    // 프로필 이미지 영역에 hover 이벤트
    userDropdown.addEventListener('mouseenter', showDropdownHover);
    userDropdown.addEventListener('mouseleave', hideDropdownHover);
    
    // 드롭다운 메뉴 자체에 hover 이벤트
    dropdown.addEventListener('mouseenter', showDropdownHover);
    dropdown.addEventListener('mouseleave', hideDropdownHover);
    
    // 클릭으로 드롭다운을 열었을 때는 hover 타이머 정리
    dropdown.addEventListener('click', () => {
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            hoverTimeout = null;
        }
    });
    
    // 이벤트 설정 완료 플래그
    userDropdown.setAttribute('data-hover-setup', 'true');
}

// ===================================
// 인스턴스 생성 및 전역 등록
// ===================================

// 미디어 모달 인스턴스 생성 (이전 movieModal을 대체)
const mediaModal = new MediaModal();
const movieModal = mediaModal; // 하위 호환성을 위한 별칭

// 전역 객체로 등록 (다른 모듈에서 접근 가능)
window.mediaModal = mediaModal;
window.movieModal = movieModal;

// Hero 캐러셀 인스턴스 (전역 변수)
let heroCarousel; 