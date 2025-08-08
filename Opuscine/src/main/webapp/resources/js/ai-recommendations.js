// TMDB 서비스 초기화
window.tmdbService = new TMDBService({
    apiKey: 'f1a5550f3ed3cb8e8fa39613b82a2fb2',
    language: 'ko-KR'
});

// MediaModal 초기화 - 싱글톤 패턴 적용
if (!window.mediaModal) {
    window.mediaModal = new MediaModal();
    // 초기화 완료 후 이벤트 리스너 한 번만 등록
    window.mediaModal.waitForMediaModal().then(() => {
        const modal = document.querySelector('.modal');
        if (modal) {
            const wishlistBtn = modal.querySelector('.btn-wishlist');
            const likeBtn = modal.querySelector('.btn-like');
            const dislikeBtn = modal.querySelector('.btn-dislike');
            
            // 기존 이벤트 리스너 제거
            if (wishlistBtn) {
                wishlistBtn.replaceWith(wishlistBtn.cloneNode(true));
            }
            if (likeBtn) {
                likeBtn.replaceWith(likeBtn.cloneNode(true));
            }
            if (dislikeBtn) {
                dislikeBtn.replaceWith(dislikeBtn.cloneNode(true));
            }
        }
    });
}

// OTT 통합 초기화
window.ottIntegration = new OTTIntegration();

// AI 추천 페이지 JavaScript
class AIRecommendations {
    constructor() {
        this.currentPage = 1;
        this.isLoading = false;
        this.isChatMode = false;
        this.apiBaseUrl = 'https://port-0-opuscine-mca2bgqj5003cb7a.sel5.cloudtype.app';
        this.userId = 'test_user_001'; // 실제 구현에서는 로그인된 사용자 ID 사용
        this.streamingData = null; // 시청 기록 데이터 저장
        this.init();
    }

    async init() {
        try {
            // mediaModal이 준비될 때까지 대기
            await this.waitForMediaModal();
            
            await this.loadRecommendations();
            this.setupEventListeners();
            this.initializeSearch();
            this.setupDynamicExpansion();
            this.initializeChat();
            this.setupNavbarScroll();
            this.setupPrimeVideoEffect();
        } catch (error) {
            console.error('AI 추천 페이지 초기화 실패:', error);
        }
    }

    // mediaModal이 로드될 때까지 대기
    async waitForMediaModal() {
        let attempts = 0;
        const maxAttempts = 50; // 5초 대기
        
        while (!window.mediaModal && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.mediaModal) {
            console.warn('mediaModal을 찾을 수 없습니다. 모달 기능이 제한될 수 있습니다.');
        }
    }

    async loadRecommendations() {
        this.isLoading = true;
        
        try {
            // 병렬로 모든 추천 데이터 로드
            const [
                personalizedData,
                similarUsersData,
                genreExplorationData,
                hiddenGemsData
            ] = await Promise.all([
                this.getPersonalizedRecommendations(),
                this.getSimilarUsersRecommendations(),
                this.getGenreExplorationRecommendations(),
                this.getHiddenGems()
            ]);

            // 각 섹션에 데이터 렌더링
            await this.renderMovieSection('personalized-recommendations', personalizedData);
            await this.renderMovieSection('similar-users-picks', similarUsersData);
            await this.renderMovieSection('genre-exploration', genreExplorationData);
            await this.renderMovieSection('hidden-gems', hiddenGemsData);

            // Prime Video 효과 적용
            this.setupPrimeVideoEffect();

        } catch (error) {
            console.error('추천 데이터 로드 실패:', error);
            this.showError('추천 데이터를 불러오는데 실패했습니다.');
        } finally {
            this.isLoading = false;
        }
    }

    async getPersonalizedRecommendations() {
        // 사용자 맞춤 추천 (인기 영화 + TV 시리즈 혼합)
          let movies,tvShows;
          try{
        const result = await fetch("/OpusCine/getGenreIds",{
        headers:{"Accept":"application/json"}
        });

        if(result.status == 401){
          [movies, tvShows] =await Promise.all([
                    tmdbService.getPopularMovies(1),
                    tmdbService.getPopularTVShows(1)
                ]);
          }
        if(result.status == 200){
            const data = await result.json();
            [movies, tvShows] =await Promise.all([
                                tmdbService.getMoviesByGenre(data.movie),
                                tmdbService.getTVShowsByGenre(data.tv)
                            ]);
        }

        }catch(error){
            console.log(error);
        }

        // 영화와 TV 시리즈를 섞어서 반환
        const combined = [...movies.results.slice(0, 10), ...tvShows.results.slice(0, 10)];
        console.log('사이즈'+combined.length);
        return combined;
    }

    async getSimilarUsersRecommendations() {
        // 비슷한 취향 사용자 추천 (높은 평점 영화)
        const topRated = await tmdbService.getTopRatedMovies(1);
        return topRated.results.slice(0, 15);
    }

    async getGenreExplorationRecommendations() {
        // 새로운 장르 도전 (다양한 장르의 영화)
        const genres = [28, 35, 18, 14, 27]; // 액션, 코미디, 드라마, 판타지, 공포
        const recommendations = [];
        
        for (const genreId of genres) {
            try {
                const genreMovies = await tmdbService.getMoviesByGenre(genreId, 1);
                recommendations.push(...genreMovies.results.slice(0, 3));
            } catch (error) {
                console.error(`장르 ${genreId} 영화 로드 실패:`, error);
            }
        }
        
        return this.shuffleArray(recommendations).slice(0, 15);
    }

    async getHiddenGems() {
        // 숨겨진 보석들 (최신 영화 중 평점 좋은 것들)
        const nowPlaying = await tmdbService.getNowPlayingMovies(1);
        return nowPlaying.results
            .filter(movie => movie.vote_average >= 7.0)
            .slice(0, 15);
    }

    // 시청 기록 데이터 가져오기 (main.js의 getStreaming 함수와 동일)
    async getStreaming(ids) {
        try {
            const res = await fetch('/OpusCine/user/streaming?id=' + ids.join(','), { 
                headers: { 'Accept': 'application/json' }
            });
            if (res.status == '401') {
                console.log("권한없음");
                return null;
            }
            const data = await res.json();
            return data;
        } catch (error) {
            console.error('시청 기록 로드 실패:', error);
            return null;
        }
    }

    async renderMovieSection(containerId, movies) {
        const container = document.getElementById(containerId);
        if (!container) return;

        try {
            // 시청 기록 데이터 로드
            const ids = movies.map(movie => movie.id);
            this.streamingData = await this.getStreaming(ids);

            container.innerHTML = '';

            movies.forEach((movie, index) => {
                let percent = 0;
                if (this.streamingData != null) {
                    let streamingTime = this.streamingData[movie.id];
                    if (streamingTime) {
                        for (const [key, value] of Object.entries(streamingTime)) {
                            percent = Math.ceil(Number(key) / Number(value) * 100);
                        }
                    }
                }

                // media-card 래퍼 생성
                const card = document.createElement('div');
                card.className = 'media-card';

                // movie-item 생성 및 추가
                const movieItem = this.createMovieItem(movie, index, percent);
                card.appendChild(movieItem);

                // 진행률 바 추가
                if (percent > 0) {
                    const progressBar = document.createElement('div');
                    progressBar.className = 'progress-bar';

                    const progressFill = document.createElement('div');
                    progressFill.className = 'progress-fill';
                    progressFill.style.width = percent + '%';

                    progressBar.appendChild(progressFill);
                    card.appendChild(progressBar);
                }

                container.appendChild(card);
            });

            // 슬라이더 기능 초기화
            const movieSlider = container.closest('.movie-slider');
            if (movieSlider) {
                this.initializeSlider(movieSlider);
            }

            // Prime Video 효과 적용
            this.setupPrimeVideoEffectForContainer(container);

        } catch (error) {
            console.error('영화 섹션 렌더링 실패:', error);
            container.innerHTML = '<div class="error-message">콘텐츠를 불러오는데 실패했습니다.</div>';
        }
    }

    createMovieItem(movie, index, percent) {
        const title = movie.title || movie.name;
        const year = movie.release_date || movie.first_air_date ? 
            new Date(movie.release_date || movie.first_air_date).getFullYear() : 'N/A';
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
        
        // 영화 아이템 생성
        const movieItem = document.createElement('div');
        movieItem.className = 'movie-item';
        movieItem.style.animationDelay = `${index * 0.1}s`;

        // 트레일러 로딩을 위한 data 속성 추가
        movieItem.dataset.mediaId = movie.id;
        movieItem.dataset.mediaType = movie.first_air_date ? 'tv' : 'movie';
        movieItem.dataset.mediaTitle = title;

        // 클릭 이벤트 리스너 등록
        const thisPercent = percent;
        const clickHandler = async (e) => {
            if (!window.mediaModal) {
                console.warn('mediaModal이 아직 로드되지 않았습니다.');
                return;
            }

            const mediaType = movie.first_air_date ? 'tv' : 'movie';
            try {
                // 모달을 열기 전에 기존 이벤트 리스너 제거
                const modal = document.querySelector('.modal');
                if (modal) {
                    const wishlistBtn = modal.querySelector('.btn-wishlist');
                    const likeBtn = modal.querySelector('.btn-like');
                    const dislikeBtn = modal.querySelector('.btn-dislike');
                    
                    if (wishlistBtn) {
                        const oldClickHandler = wishlistBtn.onclick;
                        if (oldClickHandler) {
                            wishlistBtn.removeEventListener('click', oldClickHandler);
                        }
                    }
                    if (likeBtn) {
                        const oldClickHandler = likeBtn.onclick;
                        if (oldClickHandler) {
                            likeBtn.removeEventListener('click', oldClickHandler);
                        }
                    }
                    if (dislikeBtn) {
                        const oldClickHandler = dislikeBtn.onclick;
                        if (oldClickHandler) {
                            dislikeBtn.removeEventListener('click', oldClickHandler);
                        }
                    }
                }

                // 모달 표시
                if (mediaType === 'movie') {
                    await window.mediaModal.showMovie(movie.id, {"percent": thisPercent});
                } else {
                    await window.mediaModal.showTVShow(movie.id, {"percent": thisPercent});
                }
            } catch (error) {
                console.error('모달 표시 중 오류:', error);
            }
        };

        movieItem.addEventListener('click', clickHandler);

        // 이미지 URL 생성
        const service = window.tmdbService || tmdbService;
        const posterUrl = movie.poster_path ? 
            service.getPosterUrl(movie.poster_path) : 
            'https://via.placeholder.com/300x450/1e293b/64748b?text=No+Image';
        const backdropUrl = movie.backdrop_path ? 
            service.getBackdropUrl(movie.backdrop_path) : 
            'https://via.placeholder.com/1280x720/1e1e3f/94a3b8?text=No+Backdrop';

        movieItem.innerHTML = `
            <div class="poster-wrapper">
                <img class="poster-image" src="${posterUrl}" alt="${title}" loading="lazy">
                <img class="backdrop-image" src="${backdropUrl}" alt="${title} backdrop" loading="lazy">
            </div>
            <div class="movie-info">
                <h3 class="movie-title">${title}</h3>
                <div class="movie-meta">
                    <span class="rating">⭐ ${rating}</span>
                    <span class="year">${year}</span>
                </div>
            </div>
            <div class="trailer-container">
                <!-- 트레일러가 여기에 동적으로 로드됨 -->
            </div>
        `;

        return movieItem;
    }

    createMovieCard(item) {
        // 기존 createMovieCard 함수는 유지하되, 새로운 createMovieItem 사용
        return this.createMovieItem(item, 0, 0).outerHTML;
    }

    initializeSlider(slider) {
        if (!slider) return;

        const movieList = slider.querySelector('.movie-list');
        const leftArrow = slider.querySelector('.slider-arrow-left');
        const rightArrow = slider.querySelector('.slider-arrow-right');

        if (!movieList || !leftArrow || !rightArrow) return;

        leftArrow.addEventListener('click', () => {
            this.scrollSlider(movieList, -1);
        });

        rightArrow.addEventListener('click', () => {
            this.scrollSlider(movieList, 1);
        });
    }

    // main.js의 scrollSlider 함수와 동일
    scrollSlider(movieList, direction, speed = 1) {
        const itemWidth = 296; // 영화 아이템 너비 (280px + 16px gap)
        const scrollDistance = itemWidth * 3 * speed; // 한 번에 3개 아이템씩 스크롤
        
        const currentScroll = movieList.scrollLeft;
        const maxScroll = movieList.scrollWidth - movieList.clientWidth;
        
        let newScroll;
        if (direction === 1) { // 오른쪽
            newScroll = Math.min(currentScroll + scrollDistance, maxScroll);
        } else { // 왼쪽
            newScroll = Math.max(currentScroll - scrollDistance, 0);
        }
        
        movieList.scrollTo({
            left: newScroll,
            behavior: 'smooth'
        });
    }

    setupEventListeners() {
        // 영화 카드 클릭 이벤트는 createMovieItem에서 직접 처리
        // 슬라이더 화살표 이벤트는 initializeSlider에서 처리
    }

    async openMovieModal(id, type) {
        try {
            if (type === 'movie') {
                mediaModal.showMovie(id);
            } else {
                mediaModal.showTVShow(id);
            }
        } catch (error) {
            console.error('영화 상세 정보 로드 실패:', error);
        }
    }

    // === Prime Video 효과 구현 (main.js에서 복사) ===
    
    setupPrimeVideoEffect() {
        // 모든 영화 아이템에 호버 이벤트 추가
        document.querySelectorAll('.movie-list').forEach(movieList => {
            this.setupPrimeVideoEffectForContainer(movieList);
        });
    }

    setupPrimeVideoEffectForContainer(container) {
        const movieItems = container.querySelectorAll('.movie-item');
        
        movieItems.forEach((movieItem, index, allItems) => {
            // 기존 이벤트 리스너 제거 (중복 방지)
            movieItem.removeEventListener('mouseenter', movieItem._primeVideoEnter);
            movieItem.removeEventListener('mouseleave', movieItem._primeVideoLeave);
            
            let hoverTimer = null;
            let trailerLoaded = false;
            
            // 새 이벤트 리스너 생성
            movieItem._primeVideoEnter = () => {
                // 2초 후 펼침 효과 시작
                hoverTimer = setTimeout(() => {
                    const expansionDirection = this.getExpansionDirection(movieItem);
                    this.pushAdjacentItems(movieItem, index, allItems, expansionDirection);
                    
                    // 추가 1.5초 후 트레일러 로드 시작
                    const trailerTimer = setTimeout(async () => {
                        if (!trailerLoaded) {
                            await this.loadTrailerOnHover(movieItem);
                            trailerLoaded = true;
                        }
                    }, 1500);
                    
                    movieItem._trailerTimer = trailerTimer;
                }, 2000);
            };
            
            movieItem._primeVideoLeave = () => {
                // 모든 타이머 취소
                if (hoverTimer) {
                    clearTimeout(hoverTimer);
                    hoverTimer = null;
                }
                
                if (movieItem._trailerTimer) {
                    clearTimeout(movieItem._trailerTimer);
                    movieItem._trailerTimer = null;
                }
                
                // 트레일러 정리
                this.cleanupTrailer(movieItem);
                trailerLoaded = false;
                
                this.resetAdjacentItems(allItems);
            };
            
            // 이벤트 리스너 등록
            movieItem.addEventListener('mouseenter', movieItem._primeVideoEnter);
            movieItem.addEventListener('mouseleave', movieItem._primeVideoLeave);
        });
    }

    getExpansionDirection(movieItem) {
        if (movieItem.classList.contains('expand-left')) {
            return 'left';
        } else if (movieItem.classList.contains('expand-right')) {
            return 'right';
        } else {
            return 'center';
        }
    }

    pushAdjacentItems(hoveredItem, hoveredIndex, allItems, direction) {
        allItems.forEach((item, index) => {
            // 기존 클래스 모두 제거
            item.classList.remove('pushed-left', 'pushed-right', 'pushed-both-left', 'pushed-both-right', 'hovering');
            
            if (index === hoveredIndex) {
                // 호버된 영화에 hovering 클래스 추가
                item.classList.add('hovering');
                
                // 방향에 따른 위치 조정
                item.style.transition = 'all 0.3s ease-out';
                if (direction === 'left') {
                    item.style.transform = 'translateX(-280px) translateY(-20px)';
                } else if (direction === 'right') {
                    item.style.transform = 'translateX(0px) translateY(-20px)';
                } else if (direction === 'center') {
                    item.style.transform = 'translateX(-100px) translateY(-20px)';
                }
            } else {
                // 인접한 영화들 밀어내기
                if (direction === 'left') {
                    if (index < hoveredIndex) {
                        item.classList.add('pushed-left');
                    }
                } else if (direction === 'right') {
                    if (index > hoveredIndex) {
                        item.classList.add('pushed-right');
                    }
                } else if (direction === 'center') {
                    if (index < hoveredIndex) {
                        item.classList.add('pushed-both-left');
                    } else if (index > hoveredIndex) {
                        item.classList.add('pushed-both-right');
                    }
                }
            }
        });
    }

    resetAdjacentItems(allItems) {
        allItems.forEach(item => {
            item.classList.remove('pushed-left', 'pushed-right', 'pushed-both-left', 'pushed-both-right', 'hovering');
            item.style.transform = '';
            item.style.transition = '';
        });
    }

    async loadTrailerOnHover(movieItem) {
        try {
            // 미디어 정보 추출
            const mediaInfo = this.extractMediaInfo(movieItem);
            if (!mediaInfo) return;
            
            // 로딩 인디케이터 표시
            this.showTrailerLoading(movieItem);
            
            // 트레일러 정보 가져오기
            const service = window.tmdbService || tmdbService;
            let trailer = null;
            
            if (mediaInfo.type === 'movie') {
                trailer = await service.getMovieTrailer(mediaInfo.id);
            } else if (mediaInfo.type === 'tv') {
                trailer = await service.getTVShowTrailer(mediaInfo.id);
            }
            
            // 로딩 인디케이터 제거
            this.hideTrailerLoading(movieItem);
            
            if (trailer && trailer.key) {
                this.createTrailerIframe(movieItem, trailer);
            } else {
                this.showTrailerError(movieItem, '트레일러를 찾을 수 없습니다');
            }
            
        } catch (error) {
            this.hideTrailerLoading(movieItem);
            this.showTrailerError(movieItem, '트레일러 로드 실패');
        }
    }

    showTrailerLoading(movieItem) {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'trailer-loading';
        loadingDiv.textContent = '트레일러 로딩 중...';
        movieItem.appendChild(loadingDiv);
    }

    hideTrailerLoading(movieItem) {
        const loadingDiv = movieItem.querySelector('.trailer-loading');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }

    showTrailerError(movieItem, message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'trailer-error';
        errorDiv.textContent = message;
        movieItem.appendChild(errorDiv);
        
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 3000);
    }

    createTrailerIframe(movieItem, trailer) {
        // 기존 트레일러 정리
        this.cleanupTrailer(movieItem);
        
        // iframe 컨테이너 생성
        const trailerContainer = document.createElement('div');
        trailerContainer.className = 'trailer-container';
        
        // YouTube iframe 생성
        const iframe = document.createElement('iframe');
        iframe.className = 'trailer-iframe';
        iframe.src = trailer.url;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = false;
        iframe.frameBorder = '0';
        
        iframe.style.objectFit = 'cover';
        iframe.style.objectPosition = '50% 45%';
        
        // 클릭 방지 투명 div 생성
        const clickBlocker = document.createElement('div');
        clickBlocker.className = 'iframe-click-blocker';
        
        clickBlocker.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // 원래 영화 아이템의 클릭 이벤트 트리거
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            movieItem.dispatchEvent(clickEvent);
        });
        
        // 요소들 조립
        trailerContainer.appendChild(iframe);
        trailerContainer.appendChild(clickBlocker);
        
        // 영화 아이템에 추가
        movieItem.appendChild(trailerContainer);
        
        // 페이드인 애니메이션
        setTimeout(() => {
            trailerContainer.classList.add('active');
        }, 100);
    }

    cleanupTrailer(movieItem) {
        const trailerContainer = movieItem.querySelector('.trailer-container');
        const loadingDiv = movieItem.querySelector('.trailer-loading');
        const errorDiv = movieItem.querySelector('.trailer-error');
        
        if (trailerContainer) {
            trailerContainer.remove();
        }
        if (loadingDiv) {
            loadingDiv.remove();
        }
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    extractMediaInfo(movieItem) {
        try {
            // data 속성에서 정보 추출
            const mediaId = movieItem.dataset.mediaId;
            const mediaType = movieItem.dataset.mediaType;
            const mediaTitle = movieItem.dataset.mediaTitle;
            
            if (mediaId && mediaType) {
                return {
                    id: parseInt(mediaId),
                    type: mediaType,
                    title: mediaTitle || 'Unknown'
                };
            }
            
            return null;
        } catch (error) {
            return null;
        }
    }

    // === 나머지 기존 함수들 ===

    initializeSearch() {
        const searchIcon = document.querySelector('.search-icon');
        const searchModal = document.getElementById('search-modal');
        const searchClose = document.getElementById('search-close');
        const searchInput = document.getElementById('search-input');
        const searchResults = document.getElementById('search-results-grid');
        
        let searchTimeout;

        // 검색 모달 열기
        if (searchIcon) {
            searchIcon.addEventListener('click', () => {
                searchModal.style.display = 'flex';
                searchInput.focus();
            });
        }

        // 검색 모달 닫기
        if (searchClose) {
            searchClose.addEventListener('click', () => {
                searchModal.style.display = 'none';
                searchInput.value = '';
                this.clearSearchResults();
            });
        }

        // ESC 키로 모달 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && searchModal.style.display === 'flex') {
                searchModal.style.display = 'none';
                searchInput.value = '';
                this.clearSearchResults();
            }
        });

        // 검색 입력 이벤트
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                
                clearTimeout(searchTimeout);
                
                if (query.length >= 2) {
                    searchTimeout = setTimeout(() => {
                        this.performSearch(query);
                    }, 300);
                } else {
                    this.clearSearchResults();
                }
            });
        }

        // 인기 검색어 클릭 이벤트
        document.querySelectorAll('.suggestion-tag').forEach(tag => {
            tag.addEventListener('click', () => {
                const query = tag.textContent;
                searchInput.value = query;
                this.performSearch(query);
            });
        });
    }

    async performSearch(query) {
        try {
            const searchContent = document.getElementById('search-content');
            const searchSuggestions = document.querySelector('.search-suggestions');
            const searchResultsGrid = document.getElementById('search-results-grid');
            
            // 검색 결과 영역 표시
            searchSuggestions.style.display = 'none';
            searchContent.style.display = 'block';
            
            // 로딩 표시
            searchResultsGrid.innerHTML = '<div class="search-loading">검색 중...</div>';
            
            // 검색 실행
            const results = await tmdbService.searchMulti(query);
            
            if (results.results && results.results.length > 0) {
                searchResultsGrid.innerHTML = results.results
                    .slice(0, 20)
                    .map(item => this.createSearchResultCard(item))
                    .join('');
            } else {
                searchResultsGrid.innerHTML = '<div class="no-results">검색 결과가 없습니다.</div>';
            }
            
        } catch (error) {
            console.error('검색 실패:', error);
            document.getElementById('search-results-grid').innerHTML = 
                '<div class="search-error">검색 중 오류가 발생했습니다.</div>';
        }
    }

    createSearchResultCard(item) {
        const isMovie = item.media_type === 'movie';
        const title = isMovie ? item.title : item.name;
        const releaseDate = isMovie ? item.release_date : item.first_air_date;
        const year = releaseDate ? new Date(releaseDate).getFullYear() : '';
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
        
        const posterUrl = item.poster_path 
            ? `https://image.tmdb.org/t/p/w300${item.poster_path}`
            : 'https://via.placeholder.com/300x450/1e293b/64748b?text=No+Image';

        return `
            <div class="search-result-item" data-id="${item.id}" data-type="${item.media_type}">
                <img src="${posterUrl}" alt="${title}" loading="lazy">
                <div class="search-result-info">
                    <h3>${title}</h3>
                    <div class="search-result-meta">
                        <span class="rating">⭐ ${rating}</span>
                        <span class="year">${year}</span>
                        <span class="media-type">${isMovie ? '영화' : 'TV'}</span>
                    </div>
                </div>
            </div>
        `;
    }

    clearSearchResults() {
        const searchContent = document.getElementById('search-content');
        const searchSuggestions = document.querySelector('.search-suggestions');
        
        if (searchContent) searchContent.style.display = 'none';
        if (searchSuggestions) searchSuggestions.style.display = 'block';
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    showError(message) {
        console.error(message);
        // 에러 메시지를 사용자에게 표시하는 로직 추가 가능
    }

    // Prime Video 스타일 동적 펼침 방향 감지
    setupDynamicExpansion() {
        console.log('🎯 동적 펼침 방향 감지 설정...');

        // 초기 계산
        setTimeout(() => this.calculateExpansionDirection(), 500); // DOM 완전 로드 후 실행

        // 윈도우 리사이즈 시 재계산
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.calculateExpansionDirection(), 100);
        });

        // 스크롤 시 재계산 (슬라이더 스크롤 포함)
        document.querySelectorAll('.movie-list').forEach(movieList => {
            let scrollTimeout;
            movieList.addEventListener('scroll', () => {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => this.calculateExpansionDirection(), 50);
            });
        });

        // MutationObserver로 새로운 영화 아이템 추가 감지
        const observer = new MutationObserver((mutations) => {
            let shouldRecalculate = false;
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE && 
                            (node.classList.contains('movie-item') || 
                             node.querySelector('.movie-item'))) {
                            shouldRecalculate = true;
                        }
                    });
                }
            });
            
            if (shouldRecalculate) {
                setTimeout(() => this.calculateExpansionDirection(), 100);
            }
        });

        // 모든 movie-list 컨테이너 관찰
        document.querySelectorAll('.movie-list').forEach(movieList => {
            observer.observe(movieList, { 
                childList: true, 
                subtree: true 
            });
        });

        console.log('✅ 동적 펼침 방향 감지 설정 완료');
    }

    // 채팅 기능 초기화
    initializeChat() {
        console.log('🤖 채팅 기능 초기화 중...');
        
        // 초기 입력창 이벤트
        const chatInput = document.getElementById('chat-input');
        const chatSendBtn = document.getElementById('chat-send-btn');
        
        // 대화창 입력창 이벤트
        const chatInputConversation = document.getElementById('chat-input-conversation');
        const chatSendBtnConversation = document.getElementById('chat-send-btn-conversation');
        
        // 초기 입력창 이벤트 리스너
        if (chatInput && chatSendBtn) {
            // 초기 버튼 상태 설정
            chatSendBtn.disabled = true;
            
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleChatSubmit(chatInput.value.trim());
                }
            });
            
            chatSendBtn.addEventListener('click', () => {
                this.handleChatSubmit(chatInput.value.trim());
            });
            
            // 입력값 변경 시 버튼 상태 업데이트
            chatInput.addEventListener('input', () => {
                chatSendBtn.disabled = !chatInput.value.trim();
            });
        }
        
        // 대화창 입력창 이벤트 리스너
        if (chatInputConversation && chatSendBtnConversation) {
            // 초기 버튼 상태 설정
            chatSendBtnConversation.disabled = true;
            
            chatInputConversation.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleChatSubmit(chatInputConversation.value.trim());
                }
            });
            
            chatSendBtnConversation.addEventListener('click', () => {
                this.handleChatSubmit(chatInputConversation.value.trim());
            });
            
            // 입력값 변경 시 버튼 상태 업데이트
            chatInputConversation.addEventListener('input', () => {
                chatSendBtnConversation.disabled = !chatInputConversation.value.trim();
            });
        }
        
        console.log('✅ 채팅 기능 초기화 완료');
    }
    
    // 채팅 메시지 전송 처리
    async handleChatSubmit(message) {
        if (!message || this.isLoading) return;
        
        try {
            this.isLoading = true;
            
            // 채팅 모드로 전환 (처음 메시지 전송 시)
            if (!this.isChatMode) {
                this.switchToChatMode();
            }
            
            // 사용자 메시지 추가
            this.addChatMessage('user', message);
            
            // 입력창 초기화
            this.clearChatInput();
            
            // 로딩 메시지 표시
            const loadingId = this.addLoadingMessage();
            
            // API 요청
            const response = await this.sendChatRequest(message);
            
            // 로딩 메시지 제거
            this.removeLoadingMessage(loadingId);
            
            // 응답 처리
            this.handleChatResponse(response);
            
        } catch (error) {
            console.error('채팅 메시지 전송 실패:', error);
            this.removeLoadingMessage();
            this.addChatMessage('assistant', '죄송합니다. 요청을 처리하지 못했습니다. 다시 시도해주세요.');
        } finally {
            this.isLoading = false;
        }
    }
    
    // 채팅 모드로 UI 전환
    switchToChatMode() {
        console.log('�� 채팅 모드로 전환 중...');
        
        const aiInfoCard = document.getElementById('ai-info-card');
        const chatInputSection = document.getElementById('chat-input-section');
        const chatConversation = document.getElementById('chat-conversation');
        
        // 초기 설명 카드와 입력창 숨기기
        if (aiInfoCard) aiInfoCard.style.display = 'none';
        if (chatInputSection) chatInputSection.style.display = 'none';
        
        // 대화창 표시
        if (chatConversation) chatConversation.style.display = 'flex';
        
        this.isChatMode = true;
        console.log('✅ 채팅 모드로 전환 완료');
    }
    
    // 채팅 메시지 추가
    addChatMessage(sender, content, timestamp = null) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.textContent = content;
        
        const messageTimestamp = document.createElement('div');
        messageTimestamp.className = 'message-timestamp';
        messageTimestamp.textContent = timestamp || this.getCurrentTimestamp();
        
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(messageTimestamp);
        chatMessages.appendChild(messageDiv);
        
        // 스크롤을 최하단으로 이동
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        return messageDiv;
    }
    
    // 로딩 메시지 추가
    addLoadingMessage() {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'chat-message assistant';
        loadingDiv.id = 'loading-message-' + Date.now();
        
        const loadingContent = document.createElement('div');
        loadingContent.className = 'loading-message';
        loadingContent.innerHTML = `
            <span>AI가 응답하는 중</span>
            <div class="loading-dots">
                <div class="loading-dot"></div>
                <div class="loading-dot"></div>
                <div class="loading-dot"></div>
            </div>
        `;
        
        loadingDiv.appendChild(loadingContent);
        chatMessages.appendChild(loadingDiv);
        
        // 스크롤을 최하단으로 이동
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        return loadingDiv.id;
    }
    
    // 로딩 메시지 제거
    removeLoadingMessage(loadingId = null) {
        if (loadingId) {
            const loadingElement = document.getElementById(loadingId);
            if (loadingElement) {
                loadingElement.remove();
            }
        } else {
            // 모든 로딩 메시지 제거
            document.querySelectorAll('.loading-message').forEach(el => {
                el.closest('.chat-message').remove();
            });
        }
    }
    
    // API 요청 전송
    async sendChatRequest(message) {
        const requestData = {
            message: message,
            user_id: this.userId,
            page: 1,
            limit: 20
        };
        
        console.log('📤 API 요청:', requestData);
        
        const response = await fetch(`${this.apiBaseUrl}/api/movies/recommend`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📥 API 응답:', data);
        
        return data;
    }
    
    // 채팅 응답 처리
    handleChatResponse(response) {
        try {
            // 에러 체크
            if (!response.success) {
                this.addChatMessage('assistant', '죄송합니다. 요청을 처리하지 못했습니다.');
                return;
            }
            
            // query_info에서 대화 정보 추출하여 한 번에 합쳐서 표시
            const queryInfo = response.query_info;
            
            if (queryInfo) {
                // 모든 응답 메시지를 하나로 합치기
                const messageParts = [];
                
                if (queryInfo.recommendation_explanation) {
                    messageParts.push(queryInfo.recommendation_explanation);
                }
                
                if (queryInfo.user_intent_analysis) {
                    messageParts.push(queryInfo.user_intent_analysis);
                }
                
                if (queryInfo.follow_up_suggestions) {
                    messageParts.push(queryInfo.follow_up_suggestions);
                }
                
                // 합쳐진 메시지가 있을 때만 표시
                if (messageParts.length > 0) {
                    const combinedMessage = messageParts.join('\n\n');
                    this.addChatMessage('assistant', combinedMessage);
                }
            }
            
            // 영화 데이터가 있으면 추천 섹션에 표시
            if (response.movies && response.movies.length > 0) {
                this.displayRecommendedMovies(response.movies);
                this.addChatMessage('assistant', `총 ${response.movies.length}편의 영화를 추천해드렸습니다. 아래 추천 섹션에서 확인해보세요!`);
            } else {
                this.addChatMessage('assistant', '죄송합니다. 조건에 맞는 영화를 찾지 못했습니다. 다른 조건으로 다시 시도해보세요.');
            }
            
        } catch (error) {
            console.error('응답 처리 중 오류:', error);
            this.addChatMessage('assistant', '응답을 처리하는 중 오류가 발생했습니다.');
        }
    }
    
    // 추천 영화 표시
    displayRecommendedMovies(movies) {
        console.log('🎬 추천 영화 표시:', movies.length + '편');
        
        // "당신을 위한 맞춤 추천" 섹션 찾기
        const personalizedSection = document.getElementById('personalized-recommendations');
        if (!personalizedSection) {
            console.error('추천 섹션을 찾을 수 없습니다.');
            return;
        }

        // 기존 컨텐츠 제거
        personalizedSection.innerHTML = '';

        // 영화 카드 생성 및 추가
        movies.forEach((movie, index) => {
            // media-card 래퍼 생성
            const card = document.createElement('div');
            card.className = 'media-card';

            // createMovieItem 함수 재사용
            const movieItem = this.createMovieItem(movie, index, 0);
            card.appendChild(movieItem);

            personalizedSection.appendChild(card);
        });

        // 섹션 제목 업데이트
        const rowTitle = personalizedSection.closest('.content-row').querySelector('.row-title');
        if (rowTitle) {
            rowTitle.textContent = 'AI 추천 영화';
        }

        // Prime Video 효과 적용
        this.setupPrimeVideoEffectForContainer(personalizedSection);

        console.log(`✅ ${movies.length}편의 영화 렌더링 완료`);
    }
    
    // 영화 상세 정보 가져오기 및 렌더링
    async fetchAndRenderMovieDetails(movies, container) {
        try {
            const movieDetails = [];
            
            // 각 영화의 TMDB 상세 정보 가져오기 (병렬 처리로 성능 개선)
            const detailPromises = movies.map(async (movie) => {
                try {
                    // 서버에서 받은 데이터가 이미 충분한지 확인
                    if (movie.poster_path && movie.backdrop_path && movie.overview) {
                        // 이미 충분한 정보가 있으면 그대로 사용
                        return movie;
                    }
                    
                    // TMDB API에서 추가 정보 가져오기
                    const details = await tmdbService.getMovieDetails(movie.id);
                    
                    // 기본 정보와 TMDB 정보 병합 (서버 데이터 우선)
                    return {
                        ...details,
                        ...movie,
                        // 필수 필드는 서버 데이터 우선 적용
                        title: movie.title || details.title,
                        overview: movie.overview || details.overview,
                        release_date: movie.release_date || details.release_date,
                        vote_average: movie.vote_average !== undefined ? movie.vote_average : details.vote_average,
                        poster_path: movie.poster_path || details.poster_path,
                        backdrop_path: movie.backdrop_path || details.backdrop_path
                    };
                } catch (error) {
                    console.warn(`영화 ID ${movie.id} 상세 정보 로드 실패, 기본 정보 사용:`, error);
                    // 에러가 발생해도 기본 정보라도 표시
                    return movie;
                }
            });
            
            // 모든 Promise 완료 대기
            const resolvedMovies = await Promise.allSettled(detailPromises);
            
            // 성공한 결과만 추출
            resolvedMovies.forEach((result) => {
                if (result.status === 'fulfilled') {
                    movieDetails.push(result.value);
                } else {
                    console.error('영화 데이터 처리 실패:', result.reason);
                }
            });
            
            if (movieDetails.length === 0) {
                container.innerHTML = '<div class="movies-loading">영화 정보를 불러오는데 실패했습니다.</div>';
                return;
            }
            
            // 영화 카드 렌더링
            container.innerHTML = movieDetails.map(movie => this.createMovieCard(movie)).join('');
            
            // 슬라이더 기능 초기화 - 슬라이더가 존재할 때만
            const slider = container.closest('.movie-slider');
            if (slider) {
                this.initializeSlider(slider);
            }
            
            // 동적 펼침 방향 재계산
            setTimeout(() => {
                this.calculateExpansionDirection();
            }, 100);
            
            console.log(`✅ ${movieDetails.length}편의 영화 렌더링 완료`);
            
        } catch (error) {
            console.error('영화 상세 정보 로드 실패:', error);
            container.innerHTML = `
                <div class="movies-loading">
                    <p>영화 정보를 불러오는데 실패했습니다.</p>
                    <p style="font-size: 14px; color: var(--text-secondary); margin-top: 8px;">
                        네트워크 연결을 확인하고 다시 시도해주세요.
                    </p>
                </div>
            `;
        }
    }
    
    // 동적 펼침 방향 계산 (기존 메서드 분리)
    calculateExpansionDirection() {
        document.querySelectorAll('.movie-item').forEach(movieItem => {
            const rect = movieItem.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const expandedWidth = 747;
            const currentWidth = 280;
            
            const rightEdgeIfExpanded = rect.left + expandedWidth;
            const margin = 50;
            
            movieItem.classList.remove('expand-left', 'expand-right', 'expand-center');
            
            if (rightEdgeIfExpanded > viewportWidth - margin) {
                const leftEdgeIfExpandedLeft = rect.left - (expandedWidth - currentWidth);
                
                if (leftEdgeIfExpandedLeft < margin) {
                    movieItem.classList.add('expand-center');
                } else {
                    movieItem.classList.add('expand-left');
                }
            } else {
                movieItem.classList.add('expand-right');
            }
        });
    }
    
    // 입력창 초기화
    clearChatInput() {
        const chatInput = document.getElementById('chat-input');
        const chatInputConversation = document.getElementById('chat-input-conversation');
        
        if (chatInput) {
            chatInput.value = '';
            document.getElementById('chat-send-btn').disabled = true;
        }
        
        if (chatInputConversation) {
            chatInputConversation.value = '';
            document.getElementById('chat-send-btn-conversation').disabled = true;
        }
    }
    
    // 현재 시간 반환
    getCurrentTimestamp() {
        const now = new Date();
        return now.toLocaleTimeString('ko-KR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    // 네비게이션 바 스크롤 효과
    setupNavbarScroll() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;
        
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                navbar.classList.add('scrolled'); // 스크롤 시 배경 추가
            } else {
                navbar.classList.remove('scrolled'); // 상단에서는 투명
            }
        });
        
        console.log('✅ 네비게이션 바 스크롤 효과 초기화 완료');
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔧 AI 추천 페이지 초기화 시작');

    // TMDB 서비스 초기화
    if (!window.tmdbService) {
        console.log('TMDB 서비스 초기화');
        window.tmdbService = new TMDBService({
            apiKey: 'f1a5550f3ed3cb8e8fa39613b82a2fb2',
            language: 'ko-KR'
        });
    }

    // MediaModal 초기화
    if (!window.mediaModal) {
        console.log('MediaModal 초기화');
        window.mediaModal = new MediaModal();
        await window.mediaModal.waitForMediaModal();
    }

    // OTT 통합 초기화
    if (!window.ottIntegration) {
        console.log('OTT 통합 초기화');
        window.ottIntegration = new OTTIntegration();
    }

    // AI 추천 페이지 초기화
    console.log('AIRecommendations 초기화');
    new AIRecommendations();

    console.log('✅ AI 추천 페이지 초기화 완료');
});

// 중복 초기화 방지를 위해 기존 이벤트 리스너 제거
document.removeEventListener('DOMContentLoaded', () => {
    new AIRecommendations();
}); 