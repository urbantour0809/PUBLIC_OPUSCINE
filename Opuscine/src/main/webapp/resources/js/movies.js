// 영화 페이지 JavaScript
class MoviesPage {
    constructor() {
        this.currentPage = 1;
        this.isLoading = false;
        this.isFilterLoading = false; // 필터 로딩 상태 추가
        this.currentFilters = {
            genre: '',
            year: '',
            sort: 'popularity.desc'
        };
        this.streamingData = null; // 시청 기록 데이터 저장
        this.init();
    }

    async init() {
        try {
            // mediaModal이 준비될 때까지 대기
            await this.waitForMediaModal();
            
            // 필터 요소들이 준비될 때까지 대기
            await this.waitForFilterElements();
            
            await this.loadMovieData();
            this.setupEventListeners();
            this.initializeSearch();
            this.setupDynamicExpansion();
            this.setupNavbarScroll();
            this.setupPrimeVideoEffect();
            
        } catch (error) {
            console.error('❌ 영화 페이지 초기화 실패:', error);
        }
    }

    // 필터 요소들이 준비될 때까지 대기
    async waitForFilterElements() {
        let attempts = 0;
        const maxAttempts = 20; // 2초 대기
        
        while (attempts < maxAttempts) {
            const genreFilter = document.getElementById('genre-filter');
            const yearFilter = document.getElementById('year-filter');
            const sortFilter = document.getElementById('sort-filter');
            const applyBtn = document.getElementById('apply-filters');
            const resetBtn = document.getElementById('reset-filters');
            
            if (genreFilter && yearFilter && sortFilter && applyBtn && resetBtn) {
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        console.warn('⚠️ 일부 필터 요소가 준비되지 않았습니다. 계속 진행합니다.');
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

    async loadMovieData() {
        this.isLoading = true;
        
        try {
            // 병렬로 모든 영화 데이터 로드
            const [
                popularMovies,
                nowPlayingMovies,
                upcomingMovies,
                topRatedMovies,
                actionMovies,
                comedyMovies,
                horrorMovies
            ] = await Promise.all([
                tmdbService.getPopularMovies(1),
                tmdbService.getNowPlayingMovies(1),
                tmdbService.getUpcomingMovies(1),
                tmdbService.getTopRatedMovies(1),
                tmdbService.getMoviesByGenre(28, 1), // 액션
                tmdbService.getMoviesByGenre(35, 1), // 코미디
                tmdbService.getMoviesByGenre(27, 1) // 공포
            ]);

            // 각 섹션에 데이터 렌더링
            await this.renderMovieSection('popular-movies', popularMovies.results);
            await this.renderMovieSection('now-playing-movies', nowPlayingMovies.results);
            await this.renderMovieSection('upcoming-movies', upcomingMovies.results);
            await this.renderMovieSection('top-rated-movies', topRatedMovies.results);
            await this.renderMovieSection('action-movies', actionMovies.results);
            await this.renderMovieSection('comedy-movies', comedyMovies.results);
            await this.renderMovieSection('horror-movies', horrorMovies.results);

            // Prime Video 효과 적용
            this.setupPrimeVideoEffect();

        } catch (error) {
            console.error('영화 데이터 로드 실패:', error);
            this.showError('영화 데이터를 불러오는데 실패했습니다.');
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

    async renderMovieSection(containerId, movies) {
        const container = document.getElementById(containerId);
        if (!container) return;

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

            // 래퍼 div 생성
            const card = document.createElement('div');
            card.className = 'media-card';

            const movieItem = this.createMovieItem(movie, index, percent);
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

    createMovieItem(movie, index, percent) {
        const title = movie.title;
        const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
        
        // 영화 아이템 생성
        const movieItem = document.createElement('div');
        movieItem.className = 'movie-item';
        movieItem.style.animationDelay = `${index * 0.1}s`;

        // 트레일러 로딩을 위한 data 속성 추가
        movieItem.dataset.mediaId = movie.id;
        movieItem.dataset.mediaType = 'movie';
        movieItem.dataset.mediaTitle = title;

        // 클릭 이벤트 리스너 등록
        const thisPercent = percent;
        movieItem.addEventListener('click', () => {
            if (window.mediaModal) {
                window.mediaModal.showMovie(movie.id, {"percent": thisPercent});
            } else {
                console.warn('mediaModal이 아직 로드되지 않았습니다.');
                // 잠시 후 다시 시도
                setTimeout(() => {
                    if (window.mediaModal) {
                        window.mediaModal.showMovie(movie.id, {"percent": thisPercent});
                    }
                }, 500);
            }
        });

        // 이미지 URL 생성
        const service = window.tmdbService || tmdbService;
        const posterUrl = service.getPosterUrl(movie.poster_path);
        const backdropUrl = service.getBackdropUrl(movie.backdrop_path);

        movieItem.innerHTML = `
            <img class="poster-image" src="${posterUrl}" alt="${title}" loading="lazy">
            <img class="backdrop-image" src="${backdropUrl}" alt="${title} backdrop" loading="lazy">
            <div class="media-type-badge">영화</div>
            <div class="movie-title">${title}</div>
            <div class="movie-info">
                <span class="movie-rating">★ ${rating}</span>
                <span class="movie-year">${year}</span>
            </div>
        `;

        return movieItem;
    }

    createMovieCard(movie) {
        // 기존 createMovieCard 함수는 유지하되, 새로운 createMovieItem 사용
        return this.createMovieItem(movie, 0, 0).outerHTML;
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
            // 필터 적용 버튼
            const applyFiltersBtn = document.getElementById('apply-filters');
            
            if (applyFiltersBtn) {
                // 기존 이벤트 리스너 제거 (중복 방지)
                if (this.handleApplyFilters) {
                    applyFiltersBtn.removeEventListener('click', this.handleApplyFilters);
                }
                
                // 새 이벤트 리스너 추가
                this.handleApplyFilters = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.applyFilters();
                };
                
                applyFiltersBtn.addEventListener('click', this.handleApplyFilters);
            }

            // 필터 초기화 버튼
            const resetFiltersBtn = document.getElementById('reset-filters');
            
            if (resetFiltersBtn) {
                // 기존 이벤트 리스너 제거 (중복 방지)
                if (this.handleResetFilters) {
                    resetFiltersBtn.removeEventListener('click', this.handleResetFilters);
                }
                
                // 새 이벤트 리스너 추가
                this.handleResetFilters = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.resetFilters();
                };
                
                resetFiltersBtn.addEventListener('click', this.handleResetFilters);
            }

            // 더 보기 버튼 (동적으로 생성되므로 나중에 처리)
            const setupLoadMoreBtn = () => {
                const loadMoreBtn = document.getElementById('load-more-movies');
                if (loadMoreBtn && !loadMoreBtn.hasAttribute('data-listener-attached')) {
                    loadMoreBtn.setAttribute('data-listener-attached', 'true');
                    
                    this.handleLoadMore = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.loadMoreMovies();
                    };
                    
                    loadMoreBtn.addEventListener('click', this.handleLoadMore);
                }
            };
            
            // 주기적으로 더 보기 버튼 확인
            const loadMoreChecker = setInterval(() => {
                setupLoadMoreBtn();
            }, 1000);
            
            // 10초 후 체커 중단
            setTimeout(() => clearInterval(loadMoreChecker), 10000);
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
    }

    // 필터 적용
    async applyFilters() {
        // 이미 로딩 중인 경우 중복 실행 방지
        if (this.isFilterLoading) {
            this.showMessage('필터 작업이 진행 중입니다. 잠시 후 다시 시도해주세요.', 'warning');
            return;
        }
        
        this.isFilterLoading = true;
        
        // 버튼 비활성화
        const applyBtn = document.getElementById('apply-filters');
        const resetBtn = document.getElementById('reset-filters');
        
        if (applyBtn) {
            applyBtn.disabled = true;
            applyBtn.textContent = '적용 중...';
        }
        if (resetBtn) {
            resetBtn.disabled = true;
        }
        
        try {
            const genreFilter = document.getElementById('genre-filter');
            const yearFilter = document.getElementById('year-filter');
            const sortFilter = document.getElementById('sort-filter');

            // 필터 요소 존재 여부 재확인
            if (!genreFilter || !yearFilter || !sortFilter) {
                this.showMessage('필터 요소를 찾을 수 없습니다. 페이지를 새로고침해 주세요.', 'error');
                return;
            }

            this.currentFilters = {
                genre: genreFilter.value,
                year: yearFilter.value,
                sort: sortFilter.value || 'popularity.desc'
            };

            this.currentPage = 1;
            
            this.showFilterLoading();
            
            const filteredMovies = await this.getFilteredMovies();
            
            this.showFilteredResults(filteredMovies);
            
            // 필터링된 결과에도 Prime Video 효과 적용
            setTimeout(() => {
                this.setupPrimeVideoEffect();
            }, 300);
            
            // 성공 메시지 표시
            this.showMessage('필터가 적용되었습니다.', 'success');
            
        } catch (error) {
            console.error('❌ 필터 적용 실패:', error);
            this.showFilterError('필터를 적용하는데 실패했습니다.');
        } finally {
            // 로딩 상태 해제 및 버튼 활성화
            this.isFilterLoading = false;
            
            if (applyBtn) {
                applyBtn.disabled = false;
                applyBtn.textContent = '필터 적용';
            }
            if (resetBtn) {
                resetBtn.disabled = false;
            }
        }
    }

    async getFilteredMovies() {
        const params = {
            page: this.currentPage,
            sort_by: this.currentFilters.sort,
            language: 'ko-KR',
            region: 'KR'
        };

        // 장르 필터 적용
        if (this.currentFilters.genre) {
            params.with_genres = this.currentFilters.genre;
        }

        // 연도 필터 적용
        if (this.currentFilters.year) {
            params.year = this.currentFilters.year;
            params.primary_release_year = this.currentFilters.year;
        }

        return await tmdbService.discoverMovies(params);
    }

    showFilteredResults(moviesData) {
        const filteredResults = document.getElementById('filtered-results');
        const filteredMoviesGrid = document.getElementById('filtered-movies-grid');
        const loadMoreBtn = document.getElementById('load-more-movies');

        if (!filteredResults || !filteredMoviesGrid) return;

        // 필터 결과 섹션 표시
        filteredResults.style.display = 'block';

        // 첫 페이지인 경우 기존 결과 초기화
        if (this.currentPage === 1) {
            filteredMoviesGrid.innerHTML = '';
        }

        // 필터 정보 표시
        this.updateFilterResultsTitle(moviesData);

        // 영화 카드들 추가 (slider 형태)
        moviesData.results.forEach((movie, index) => {
            const card = document.createElement('div');
            card.className = 'media-card';

            const movieItem = this.createMovieItem(movie, index, 0);
            card.appendChild(movieItem);

            filteredMoviesGrid.appendChild(card);
        });

        // 슬라이더 기능 초기화
        const movieSlider = filteredResults.querySelector('.movie-slider');
        if (movieSlider) {
            this.initializeSlider(movieSlider);
        }

        // Prime Video 효과 적용
        this.setupPrimeVideoEffectForContainer(filteredMoviesGrid);

        // 더 보기 버튼 표시/숨김
        if (loadMoreBtn) {
            loadMoreBtn.style.display = moviesData.page < moviesData.total_pages ? 'block' : 'none';
        }

        // 필터링 결과로 스크롤
        if (this.currentPage === 1) {
            filteredResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    updateFilterResultsTitle(moviesData) {
        const resultTitle = document.querySelector('#filtered-results .row-title');
        if (!resultTitle) return;

        let titleParts = ['🔍 필터 결과'];
        
        // 필터 조건 표시
        const conditions = [];
        if (this.currentFilters.genre) {
            const genreSelect = document.getElementById('genre-filter');
            const genreName = genreSelect.options[genreSelect.selectedIndex].text;
            conditions.push(genreName);
        }
        
        if (this.currentFilters.year) {
            conditions.push(`${this.currentFilters.year}년`);
        }

        if (conditions.length > 0) {
            titleParts.push(`(${conditions.join(', ')})`);
        }

        // 결과 수 표시
        titleParts.push(`- 총 ${moviesData.total_results.toLocaleString()}편`);

        resultTitle.textContent = titleParts.join(' ');
    }

    showFilterLoading() {
        const filteredResults = document.getElementById('filtered-results');
        const filteredMoviesGrid = document.getElementById('filtered-movies-grid');
        
        if (!filteredResults || !filteredMoviesGrid) return;

        filteredResults.style.display = 'block';
        filteredMoviesGrid.innerHTML = `
            <div class="filter-loading">
                <div class="loading-spinner"></div>
                <p>필터링된 영화를 검색하는 중...</p>
            </div>
        `;

        // 필터 결과로 스크롤
        filteredResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    showFilterError(message) {
        const filteredMoviesGrid = document.getElementById('filtered-movies-grid');
        if (!filteredMoviesGrid) return;

        filteredMoviesGrid.innerHTML = `
            <div class="filter-error">
                <div class="error-icon">⚠️</div>
                <p>${message}</p>
                <button class="retry-btn" onclick="location.reload()">다시 시도</button>
            </div>
        `;
    }

    async loadMoreMovies() {
        if (this.isLoading) return;

        this.currentPage++;
        
        try {
            this.isLoading = true;
            

            
            // 로딩 상태 표시
            const loadMoreBtn = document.getElementById('load-more-movies');
            const originalText = loadMoreBtn.textContent;
            loadMoreBtn.textContent = '로딩 중...';
            loadMoreBtn.disabled = true;
            
            const moreMovies = await this.getFilteredMovies();
            this.showFilteredResults(moreMovies);
            
            // 버튼 상태 복원
            loadMoreBtn.textContent = originalText;
            loadMoreBtn.disabled = false;
            
        } catch (error) {
            console.error('추가 영화 로드 실패:', error);
            this.currentPage--; // 실패 시 페이지 번호 되돌리기
            
            // 버튼 상태 복원
            const loadMoreBtn = document.getElementById('load-more-movies');
            loadMoreBtn.textContent = '더 보기';
            loadMoreBtn.disabled = false;
            
            this.showMessage('추가 영화를 불러오는데 실패했습니다.', 'error');
        } finally {
            this.isLoading = false;
        }
    }

    // 필터 초기화 기능
    resetFilters() {
        // 로딩 중인 경우 실행 방지
        if (this.isFilterLoading) {
            this.showMessage('필터 작업이 진행 중입니다. 잠시 후 다시 시도해주세요.', 'warning');
            return;
        }
        
        try {
            // 필터 폼 초기화
            const genreFilter = document.getElementById('genre-filter');
            const yearFilter = document.getElementById('year-filter');
            const sortFilter = document.getElementById('sort-filter');
            
            if (genreFilter) genreFilter.value = '';
            if (yearFilter) yearFilter.value = '';
            if (sortFilter) sortFilter.value = 'popularity.desc';

            // 필터 결과 숨기기
            const filteredResults = document.getElementById('filtered-results');
            if (filteredResults) {
                filteredResults.style.display = 'none';
            }

            // 필터 상태 초기화
            this.currentFilters = {
                genre: '',
                year: '',
                sort: 'popularity.desc'
            };
            this.currentPage = 1;

            console.log('✅ 필터 초기화 완료');
            this.showMessage('필터가 초기화되었습니다.', 'info');
            
        } catch (error) {
            console.error('❌ 필터 초기화 실패:', error);
            this.showMessage('필터 초기화에 실패했습니다.', 'error');
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
        const filterSection = document.querySelector('.filter-section');
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
            
            // 영화만 검색
            const results = await tmdbService.searchMovies(query);
            
            if (results.results && results.results.length > 0) {
                searchResultsGrid.innerHTML = results.results
                    .slice(0, 20)
                    .map(movie => this.createSearchResultCard(movie))
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

    createSearchResultCard(movie) {
        const title = movie.title;
        const year = movie.release_date ? new Date(movie.release_date).getFullYear() : '';
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
        
        const posterUrl = movie.poster_path 
            ? `https://image.tmdb.org/t/p/w300${movie.poster_path}`
            : 'https://via.placeholder.com/300x450/1e293b/64748b?text=No+Image';

        return `
            <div class="search-result-item" data-id="${movie.id}" data-type="movie">
                <img src="${posterUrl}" alt="${title}" loading="lazy">
                <div class="search-result-info">
                    <h3>${title}</h3>
                    <div class="search-result-meta">
                        <span class="rating">⭐ ${rating}</span>
                        <span class="year">${year}</span>
                        <span class="media-type">영화</span>
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
    new MoviesPage();
});

// 페이지 로드 시 MoviesPage 인스턴스 생성
document.addEventListener('DOMContentLoaded', function() {
    new MoviesPage();
}); 