// 트렌딩 페이지 JavaScript
class TrendingPage {
    constructor() {
        this.currentPeriod = 'day';
        this.currentType = 'all';
        this.isLoading = false;
        this.streamingData = null; // 시청 기록 데이터 저장
        this.init();
    }

    async init() {
        try {
            // mediaModal이 준비될 때까지 대기
            await this.waitForMediaModal();
            
            await this.loadTrendingData();
            this.setupEventListeners();
            this.updateStats();
            this.initializeSearch();
            this.setupDynamicExpansion();
            this.setupNavbarScroll();
            this.setupPrimeVideoEffect();
        } catch (error) {
            console.error('트렌딩 페이지 초기화 실패:', error);
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

    async loadTrendingData() {
        this.isLoading = true;
        
        try {
            // 병렬로 트렌딩 데이터 로드
            const [
                trendingToday,
                trendingWeek,
                trendingMovies,
                trendingTV,
                risingContent
            ] = await Promise.all([
                tmdbService.getTrendingAll('day', 1),
                tmdbService.getTrendingAll('week', 1),
                tmdbService.getTrendingMovies(this.currentPeriod, 1),
                tmdbService.getTrendingTVShows(this.currentPeriod, 1),
                tmdbService.getPopularMovies(1) // 급상승 콘텐츠 대신 인기 영화 사용
            ]);

            // 각 섹션에 데이터 렌더링
            await this.renderMovieSection('trending-today', trendingToday.results);
            await this.renderMovieSection('trending-week', trendingWeek.results);
            await this.renderMovieSection('trending-movies', trendingMovies.results);
            await this.renderMovieSection('trending-tv', trendingTV.results);
            await this.renderMovieSection('rising-content', risingContent.results);

            // 랭킹 렌더링
            this.renderTrendingRanking(trendingToday.results.slice(0, 10));

            // Prime Video 효과 적용
            this.setupPrimeVideoEffect();

        } catch (error) {
            console.error('트렌딩 데이터 로드 실패:', error);
            this.showError('트렌딩 데이터를 불러오는데 실패했습니다.');
        } finally {
            this.isLoading = false;
        }
    }

    // 시청 기록 데이터 가져오기
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

    async renderMovieSection(containerId, items) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // 시청 기록 데이터 로드
        const ids = items.map(item => item.id);
        this.streamingData = await this.getStreaming(ids);

        container.innerHTML = '';

        items.forEach((item, index) => {
            let percent = 0;
            if (this.streamingData != null) {
                let streamingTime = this.streamingData[item.id];
                if (streamingTime) {
                    for (const [key, value] of Object.entries(streamingTime)) {
                        percent = Math.ceil(Number(key) / Number(value) * 100);
                    }
                }
            }

            // 래퍼 div 생성
            const card = document.createElement('div');
            card.className = 'media-card';

            const movieItem = this.createMovieItem(item, index, percent);
            card.appendChild(movieItem);

            // 진행률 바 추가
            if (percent != 0) {
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
        this.initializeSlider(container.closest('.movie-slider'));
        
        // Prime Video 효과 적용
        this.setupPrimeVideoEffectForContainer(container);
    }

    createMovieItem(item, index, percent) {
        const isMovie = item.media_type === 'movie' || item.title !== undefined;
        const title = isMovie ? item.title : item.name;
        const releaseDate = isMovie ? item.release_date : item.first_air_date;
        const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
        const mediaType = isMovie ? 'movie' : 'tv';
        
        // 영화 아이템 생성
        const movieItem = document.createElement('div');
        movieItem.className = 'movie-item';
        movieItem.style.animationDelay = `${index * 0.1}s`;

        // 트레일러 로딩을 위한 data 속성 추가
        movieItem.dataset.mediaId = item.id;
        movieItem.dataset.mediaType = mediaType;
        movieItem.dataset.mediaTitle = title;

        // 클릭 이벤트 리스너 등록
        const thisPercent = percent;
        movieItem.addEventListener('click', () => {
            if (window.mediaModal) {
                if (mediaType === 'movie') {
                    window.mediaModal.showMovie(item.id, {"percent": thisPercent});
                } else if (mediaType === 'tv') {
                    window.mediaModal.showTVShow(item.id, {"percent": thisPercent});
                }
            } else {
                console.warn('mediaModal이 아직 로드되지 않았습니다.');
                // 잠시 후 다시 시도
                setTimeout(() => {
                    if (window.mediaModal) {
                        if (mediaType === 'movie') {
                            window.mediaModal.showMovie(item.id, {"percent": thisPercent});
                        } else if (mediaType === 'tv') {
                            window.mediaModal.showTVShow(item.id, {"percent": thisPercent});
                        }
                    }
                }, 500);
            }
        });

        // 이미지 URL 생성
        const service = window.tmdbService || tmdbService;
        const posterUrl = service.getPosterUrl(item.poster_path);
        const backdropUrl = service.getBackdropUrl(item.backdrop_path);

        const mediaTypeDisplay = isMovie ? '영화' : 'TV';

        movieItem.innerHTML = `
            <img class="poster-image" src="${posterUrl}" alt="${title}" loading="lazy">
            <img class="backdrop-image" src="${backdropUrl}" alt="${title} backdrop" loading="lazy">
            <div class="media-type-badge">${mediaTypeDisplay}</div>
            <div class="movie-title">${title}</div>
            <div class="movie-info">
                <span class="movie-rating">★ ${rating}</span>
                <span class="movie-year">${year}</span>
            </div>
        `;

        return movieItem;
    }

    createMovieCard(item) {
        // 기존 createMovieCard 함수는 유지하되, 새로운 createMovieItem 사용
        return this.createMovieItem(item, 0, 0).outerHTML;
    }

    renderTrendingRanking(items) {
        const container = document.getElementById('trending-ranking');
        if (!container) return;

        container.innerHTML = items.map((item, index) => {
            const isMovie = item.media_type === 'movie' || item.title !== undefined;
            const title = isMovie ? item.title : item.name;
            const releaseDate = isMovie ? item.release_date : item.first_air_date;
            const year = releaseDate ? new Date(releaseDate).getFullYear() : '';
            const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
            
            const posterUrl = item.poster_path 
                ? `https://image.tmdb.org/t/p/w200${item.poster_path}`
                : 'https://via.placeholder.com/200x300/1e293b/64748b?text=No+Image';

            return `
                <div class="ranking-item" data-id="${item.id}" data-type="${item.media_type}">
                    <div class="ranking-number">${index + 1}</div>
                    <img class="ranking-poster" src="${posterUrl}" alt="${title}">
                    <div class="ranking-info">
                        <h3>${title}</h3>
                        <p>${year} • ⭐ ${rating} • ${isMovie ? '영화' : 'TV 시리즈'}</p>
                    </div>
                </div>
            `;
        }).join('');

        // 랭킹 아이템 클릭 이벤트 추가
        container.querySelectorAll('.ranking-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                const type = item.dataset.type;
                this.openMovieModal(id, type);
            });
        });
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
        // DOM이 준비될 때까지 추가 대기
        const setupFilters = () => {
            // 필터 탭 이벤트
            const filterTabs = document.querySelectorAll('.filter-tab');
            
            filterTabs.forEach((tab, index) => {
                // 기존 이벤트 리스너 제거 (중복 방지)
                const newHandler = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handlePeriodChange(tab.dataset.period);
                };
                
                // 이벤트 리스너를 새로 등록
                tab.removeEventListener('click', tab._periodHandler);
                tab._periodHandler = newHandler;
                tab.addEventListener('click', newHandler);
            });

            // 필터 타입 이벤트
            const filterTypes = document.querySelectorAll('.filter-type');
            
            filterTypes.forEach((type, index) => {
                // 기존 이벤트 리스너 제거 (중복 방지)
                const newHandler = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleTypeChange(type.dataset.type);
                };
                
                // 이벤트 리스너를 새로 등록
                type.removeEventListener('click', type._typeHandler);
                type._typeHandler = newHandler;
                type.addEventListener('click', newHandler);
            });
        };

        // DOM이 완전히 준비된 후 실행
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupFilters);
        } else {
            // 이미 DOM이 준비되었다면 바로 실행
            setupFilters();
        }

        // 추가 안전장치: 조금 더 기다린 후 다시 시도
        setTimeout(() => {
            setupFilters();
        }, 500);

        // 1초 후에도 한 번 더 시도
        setTimeout(() => {
            setupFilters();
        }, 1000);
    }

    async handlePeriodChange(period) {
        if (this.currentPeriod === period || this.isLoading) return;

        this.currentPeriod = period;
        
        // 활성 탭 업데이트
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.period === period);
        });

        // 로딩 상태 표시
        this.showFilterLoading(`${period === 'day' ? '오늘' : '이번 주'} 트렌딩 데이터 로딩 중...`);

        try {
            // 데이터 다시 로드
            await this.loadFilteredData();
            
            // 성공 메시지 표시
            this.showMessage(`${period === 'day' ? '오늘' : '이번 주'} 트렌딩 데이터로 업데이트되었습니다.`, 'success');
            
        } catch (error) {
            console.error('기간 필터 변경 실패:', error);
            
            // 이전 상태로 복원
            this.currentPeriod = period === 'day' ? 'week' : 'day';
            document.querySelectorAll('.filter-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.period === this.currentPeriod);
            });
            
            this.showMessage('트렌딩 데이터를 불러오는데 실패했습니다.', 'error');
        }
    }

    async handleTypeChange(type) {
        if (this.currentType === type || this.isLoading) return;

        this.currentType = type;
        
        // 활성 타입 업데이트
        document.querySelectorAll('.filter-type').forEach(typeBtn => {
            typeBtn.classList.toggle('active', typeBtn.dataset.type === type);
        });

        // 로딩 상태 표시
        const typeNames = { all: '전체', movie: '영화', tv: 'TV 시리즈' };
        this.showFilterLoading(`${typeNames[type]} 트렌딩 데이터 로딩 중...`);

        try {
            // 필터된 데이터 로드
            await this.loadFilteredData();
            
            // 성공 메시지 표시
            this.showMessage(`${typeNames[type]} 트렌딩 데이터로 업데이트되었습니다.`, 'success');
            
        } catch (error) {
            console.error('타입 필터 변경 실패:', error);
            
            // 이전 상태로 복원
            const previousType = this.currentType === 'all' ? 'movie' : 'all';
            this.currentType = previousType;
            document.querySelectorAll('.filter-type').forEach(typeBtn => {
                typeBtn.classList.toggle('active', typeBtn.dataset.type === previousType);
            });
            
            this.showMessage('트렌딩 데이터를 불러오는데 실패했습니다.', 'error');
        }
    }

    async loadFilteredData() {
        this.isLoading = true;
        
        try {
            let trendingData;
            
            // 타입에 따른 API 호출
            switch (this.currentType) {
                case 'movie':
                    trendingData = await tmdbService.getTrendingMovies(this.currentPeriod, 1);
                    break;
                case 'tv':
                    trendingData = await tmdbService.getTrendingTVShows(this.currentPeriod, 1);
                    break;
                default:
                    trendingData = await tmdbService.getTrendingAll(this.currentPeriod, 1);
            }

            // 메인 트렌딩 섹션 업데이트
            await this.renderFilteredTrendingSection(trendingData.results);
            
            // 랭킹 업데이트
            this.renderTrendingRanking(trendingData.results.slice(0, 10));
            
            // 통계 업데이트
            this.updateFilteredStats(trendingData);

        } catch (error) {
            console.error('필터된 트렌딩 데이터 로드 실패:', error);
            throw error; // 에러를 다시 던져서 호출부에서 처리
        } finally {
            this.isLoading = false;
        }
    }

    async renderFilteredTrendingSection(items) {
        // 오늘의 트렌딩 섹션을 필터링 결과로 업데이트
        const trendingTodayContainer = document.getElementById('trending-today');
        if (!trendingTodayContainer) return;

        // 섹션 제목 업데이트
        const sectionTitle = trendingTodayContainer.closest('.content-row').querySelector('.row-title');
        if (sectionTitle) {
            const periodText = this.currentPeriod === 'day' ? '오늘' : '이번 주';
            const typeText = this.currentType === 'movie' ? ' 영화' : 
                           this.currentType === 'tv' ? ' TV 시리즈' : '';
            sectionTitle.textContent = `📈 ${periodText}의 트렌딩${typeText}`;
        }

        // 시청 기록 데이터 로드
        const ids = items.map(item => item.id);
        this.streamingData = await this.getStreaming(ids);

        trendingTodayContainer.innerHTML = '';

        items.forEach((item, index) => {
            let percent = 0;
            if (this.streamingData != null) {
                let streamingTime = this.streamingData[item.id];
                if (streamingTime) {
                    for (const [key, value] of Object.entries(streamingTime)) {
                        percent = Math.ceil(Number(key) / Number(value) * 100);
                    }
                }
            }

            // 래퍼 div 생성
            const card = document.createElement('div');
            card.className = 'media-card';

            const movieItem = this.createMovieItem(item, index, percent);
            card.appendChild(movieItem);

            // 진행률 바 추가
            if (percent != 0) {
                const progressBar = document.createElement('div');
                progressBar.className = 'progress-bar';

                const progressFill = document.createElement('div');
                progressFill.className = 'progress-fill';
                progressFill.style.width = percent + '%';

                progressBar.appendChild(progressFill);
                card.appendChild(progressBar);
            }

            trendingTodayContainer.appendChild(card);
        });
        
        // 슬라이더 기능 초기화
        this.initializeSlider(trendingTodayContainer.closest('.movie-slider'));
        
        // Prime Video 효과 적용
        this.setupPrimeVideoEffectForContainer(trendingTodayContainer);
    }

    updateFilteredStats(trendingData) {
        // 현재 필터에 따른 통계 업데이트
        const totalResults = trendingData.total_results || trendingData.results.length;
        
        if (this.currentType === 'movie') {
            const movieCountEl = document.getElementById('total-trending-movies');
            if (movieCountEl) movieCountEl.textContent = totalResults;
            
            // TV 항목은 0으로 설정
            const tvCountEl = document.getElementById('total-trending-tv');
            if (tvCountEl) tvCountEl.textContent = '0';
            
        } else if (this.currentType === 'tv') {
            const tvCountEl = document.getElementById('total-trending-tv');
            if (tvCountEl) tvCountEl.textContent = totalResults;
            
            // 영화 항목은 0으로 설정
            const movieCountEl = document.getElementById('total-trending-movies');
            if (movieCountEl) movieCountEl.textContent = '0';
            
        } else {
            // 전체인 경우 기본 통계 유지
            this.updateStats();
        }

        // 평균 평점 계산
        if (trendingData.results && trendingData.results.length > 0) {
            const totalRating = trendingData.results.reduce((sum, item) => sum + (item.vote_average || 0), 0);
            const avgRating = (totalRating / trendingData.results.length).toFixed(1);
            
            const ratingEl = document.getElementById('avg-rating');
            if (ratingEl) ratingEl.textContent = avgRating;
        }

        console.log(`📊 통계 업데이트 완료: ${this.currentType} (${totalResults}개 항목)`);
    }

    showFilterLoading(message = '데이터 로딩 중...') {
        // 메인 트렌딩 섹션에 로딩 표시
        const trendingTodayContainer = document.getElementById('trending-today');
        if (trendingTodayContainer) {
            trendingTodayContainer.innerHTML = `
                <div class="filter-loading">
                    <div class="loading-spinner"></div>
                    <p>${message}</p>
                </div>
            `;
        }

        // 랭킹 섹션에도 로딩 표시
        const rankingContainer = document.getElementById('trending-ranking');
        if (rankingContainer) {
            rankingContainer.innerHTML = `
                <div class="ranking-loading">
                    <div class="loading-spinner"></div>
                    <p>랭킹 업데이트 중...</p>
                </div>
            `;
        }
    }

    // 메시지 표시 함수
    showMessage(message, type = 'info') {
        // 기존 메시지 제거
        const existingMessage = document.querySelector('.filter-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // 새 메시지 생성
        const messageDiv = document.createElement('div');
        messageDiv.className = `filter-message ${type}`;
        messageDiv.textContent = message;

        // 필터 섹션 다음에 삽입
        const filterSection = document.querySelector('.trending-filter-section');
        if (filterSection) {
            filterSection.parentNode.insertBefore(messageDiv, filterSection.nextSibling);
        }

        // 3초 후 자동 제거
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 3000);
    }

    // 필터 상태 초기화 함수
    resetFilters() {
        console.log('🔄 트렌딩 필터 초기화');
        
        // 기본 상태로 복원
        this.currentPeriod = 'day';
        this.currentType = 'all';
        
        // UI 업데이트
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.period === 'day');
        });
        
        document.querySelectorAll('.filter-type').forEach(type => {
            type.classList.toggle('active', type.dataset.type === 'all');
        });
        
        // 데이터 다시 로드
        this.loadTrendingData();
        
        this.showMessage('필터가 초기화되었습니다.', 'info');
    }

    updateStats() {
        // 통계 업데이트 (실제로는 API에서 가져와야 함)
        const stats = {
            totalTrendingMovies: 156,
            totalTrendingTV: 89,
            totalViewers: '2.4M',
            avgRating: '8.2'
        };

        const movieCountEl = document.getElementById('total-trending-movies');
        const tvCountEl = document.getElementById('total-trending-tv');
        const viewersEl = document.getElementById('total-viewers');
        const ratingEl = document.getElementById('avg-rating');

        if (movieCountEl) movieCountEl.textContent = stats.totalTrendingMovies;
        if (tvCountEl) tvCountEl.textContent = stats.totalTrendingTV;
        if (viewersEl) viewersEl.textContent = stats.totalViewers;
        if (ratingEl) ratingEl.textContent = stats.avgRating;
    }

    async openMovieModal(id, type) {
        try {
            if (window.mediaModal) {
                if (type === 'movie') {
                    window.mediaModal.showMovie(id);
                } else {
                    window.mediaModal.showTVShow(id);
                }
            } else {
                console.warn('mediaModal이 아직 로드되지 않았습니다.');
            }
        } catch (error) {
            console.error('상세 정보 로드 실패:', error);
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

    showError(message) {
        console.error(message);
        // 에러 메시지를 사용자에게 표시하는 로직 추가 가능
    }

    // Prime Video 스타일 동적 펼침 방향 감지
    setupDynamicExpansion() {
        console.log('🎯 동적 펼침 방향 감지 설정...');
        
        // 모든 영화 아이템에 대해 펼침 방향 계산
        const calculateExpansionDirection = () => {
            document.querySelectorAll('.movie-item').forEach(movieItem => {
                const rect = movieItem.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
                const expandedWidth = 747; // 펼쳐진 상태의 너비
                const currentWidth = 280; // 현재 너비
                
                // 현재 위치에서 오른쪽으로 펼쳤을 때의 끝 위치
                const rightEdgeIfExpanded = rect.left + expandedWidth;
                
                // 화면 경계에서 여유 공간 (스크롤바 등 고려)
                const margin = 50;
                
                // 기존 클래스 제거
                movieItem.classList.remove('expand-left', 'expand-right', 'expand-center');
                
                // 펼침 방향 결정 로직
                if (rightEdgeIfExpanded > viewportWidth - margin) {
                    // 오른쪽으로 펼치면 화면을 벗어남
                    const leftEdgeIfExpandedLeft = rect.left - (expandedWidth - currentWidth);
                    
                    if (leftEdgeIfExpandedLeft < margin) {
                        // 왼쪽으로도 완전히 펼칠 수 없음 - 중간 위치
                        movieItem.classList.add('expand-center');
                    } else {
                        // 왼쪽으로 펼치기
                        movieItem.classList.add('expand-left');
                    }
                } else {
                    // 오른쪽으로 펼치기 (기본)
                    movieItem.classList.add('expand-right');
                }
            });
        };

        // 초기 계산
        setTimeout(calculateExpansionDirection, 500); // DOM 완전 로드 후 실행

        // 윈도우 리사이즈 시 재계산
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(calculateExpansionDirection, 100);
        });

        // 스크롤 시 재계산 (슬라이더 스크롤 포함)
        document.querySelectorAll('.movie-list').forEach(movieList => {
            let scrollTimeout;
            movieList.addEventListener('scroll', () => {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(calculateExpansionDirection, 50);
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
                setTimeout(calculateExpansionDirection, 100);
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
document.addEventListener('DOMContentLoaded', () => {
    new TrendingPage();
});

// 페이지 로드 시 TrendingPage 인스턴스 생성
document.addEventListener('DOMContentLoaded', function() {
    new TrendingPage();
}); 