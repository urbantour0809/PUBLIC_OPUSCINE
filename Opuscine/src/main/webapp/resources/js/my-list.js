// 내가 찜한 콘텐츠 페이지 JavaScript
class MyListPage {
    constructor() {
        this.wishlist = this.loadWishlistFromStorage();
        this.currentFilter = 'all';
        this.currentSort = 'added_date';
        this.currentView = 'grid';
        this.init();
    }

    async init() {
        try {
            //this.updateCounts();
            await this.loadWishlistContent();
            await this.loadRecommendations();
            this.setupEventListeners();
            this.initializeSearch();
            this.setupDynamicExpansion();
            this.checkEmptyState();
        } catch (error) {
            console.error('찜 목록 페이지 초기화 실패:', error);
        }
    }

     loadWishlistFromStorage() {
        /*try {
            const stored = localStorage.getItem('opuscine_wishlist');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('찜 목록 로드 실패:', error);
            return [];
        }*/


    }

    /*saveWishlistToStorage() {
        try {
            localStorage.setItem('opuscine_wishlist', JSON.stringify(this.wishlist));
        } catch (error) {
            console.error('찜 목록 저장 실패:', error);
        }
    }*/

    async loadWishlistContent() {
        const result = await fetch('/OpusCine/user/restInterested');
        const data =  await result.json();
        console.log('확인'+data.length);
        if (data.length === 0) {
            this.showEmptyState();
            return;
        }

        try {
            // 찜한 항목들의 상세 정보 로드
            const detailPromises = data.map(async (item) => {
                try {
                                    const details = item.type === 'movie' 
                    ? await tmdbService.getMovieDetails(item.id)
                    : await tmdbService.getTVShowDetails(item.id);
                    return { ...details, type: item.type, addedDate: item.watched, watched: item.watched || false,interestedId : item.iterestedId};
                } catch (error) {
                    console.error(`항목 ${item.id} 로드 실패:`, error);
                    return null;
                }
            });

            const wishlistDetails = (await Promise.all(detailPromises)).filter(item => item !== null);
            // 카테고리별로 분류
            const recentlyAdded = [...wishlistDetails]
                .sort((a, b) => new Date(b.addedDate) - new Date(a.addedDate))
                .slice(0, 15);

            const movies = wishlistDetails.filter(item => item.type === 'movie').slice(0, 15);
            const tvShows = wishlistDetails.filter(item => item.type === 'tv').slice(0, 15);
            const watchedContent = wishlistDetails.filter(item => item.watched).slice(0, 15);

            // 각 섹션 렌더링
            this.renderMovieSection('recently-added', recentlyAdded);
            this.renderMovieSection('wishlist-movies', movies);
            this.renderMovieSection('wishlist-tv', tvShows);
            //this.renderMovieSection('watched-content', watchedContent);

            // 전체 그리드 렌더링
            this.renderWishlistGrid(wishlistDetails);

            this.hideEmptyState();

        } catch (error) {
            console.error('찜 목록 콘텐츠 로드 실패:', error);
            this.showError('찜한 콘텐츠를 불러오는데 실패했습니다.');
        }
    }

    async loadRecommendations() {
        try {
            // 찜한 콘텐츠 기반 추천 (여기서는 인기 콘텐츠로 대체)
            const [popularMovies, popularTV] = await Promise.all([
                tmdbService.getPopularMovies(1),
                tmdbService.getPopularTVShows(1)
            ]);

            const recommendations = [
                ...popularMovies.results.slice(0, 10),
                ...popularTV.results.slice(0, 10)
            ].sort(() => Math.random() - 0.5).slice(0, 15);

            this.renderMovieSection('recommended-content', recommendations);

        } catch (error) {
            console.error('추천 콘텐츠 로드 실패:', error);
        }
    }

    renderMovieSection(containerId, items) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (items.length === 0) {
            container.innerHTML = '<div class="empty-section">항목이 없습니다.</div>';
            return;
        }

        container.innerHTML = items.map(item => this.createMovieCard(item)).join('');
        
        // 슬라이더 기능 초기화
        this.initializeSlider(container.closest('.movie-slider'));
    }

    createMovieCard(item) {
        const isMovie = item.type === 'movie' || item.title !== undefined;
        const title = isMovie ? item.title : item.name;
        const releaseDate = isMovie ? item.release_date : item.first_air_date;
        const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
        const mediaType = isMovie ? 'movie' : 'tv';
        
        const posterUrl = item.poster_path 
            ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
            : 'https://via.placeholder.com/500x750/1e293b/64748b?text=No+Image';
            
        const backdropUrl = item.backdrop_path
            ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`
            : posterUrl;

        const isInWishlist = ''; /*this.isInWishlist(item.id, mediaType);*/
        const isWatched = item.watched || false;

        return `
            <div class="movie-item ${isWatched ? 'watched' : ''}" data-id="${item.id}" data-type="${mediaType}">
                <img class="poster-image" src="${posterUrl}" alt="${title}" loading="lazy">
                <img class="backdrop-image" src="${backdropUrl}" alt="${title}" loading="lazy">
                <div class="movie-title">${title}</div>
                <div class="movie-info">
                    <span class="movie-rating">⭐ ${rating}</span>
                    <span class="movie-year">${year}</span>
                </div>
                <div class="media-type-badge">${isMovie ? '영화' : 'TV'}</div>
                ${isInWishlist ? '<div class="wishlist-badge">💖</div>' : ''}
                ${isWatched ? '<div class="watched-badge">✅</div>' : ''}
            </div>
        `;
    }

    renderWishlistGrid(items) {
        const container = document.getElementById('wishlist-grid');
        if (!container) return;

        // 필터 및 정렬 적용
        let filteredItems = this.applyFilters(items);
        filteredItems = this.applySorting(filteredItems);

        if (filteredItems.length === 0) {
            container.innerHTML = '<div class="empty-grid">필터 조건에 맞는 항목이 없습니다.</div>';
            return;
        }

        container.innerHTML = filteredItems.map(item => this.createGridItem(item)).join('');
    }

    createGridItem(item) {
        const isMovie = item.type === 'movie' || item.title !== undefined;
        const title = isMovie ? item.title : item.name;
        const year = item.release_date || item.first_air_date ? 
            new Date(item.release_date || item.first_air_date).getFullYear() : 'N/A';
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
        const addedDate = item.addedDate ? new Date(item.addedDate).toLocaleDateString() : '';
        // 설명 텍스트를 30자로 제한
        const overview = item.overview ? 
            (item.overview.length > 30 ? item.overview.substring(0, 30) + '...' : item.overview) : '';
        
        const posterUrl = item.poster_path 
            ? `https://image.tmdb.org/t/p/w200${item.poster_path}`
            : 'https://via.placeholder.com/200x300/1e293b/64748b?text=No+Image';

        return `
            <div class="wishlist-grid-item ${item.watched ? 'watched' : ''}" data-id="${item.id}" data-type="${item.type}">
                <img src="${posterUrl}" alt="${title}" loading="lazy" class="poster-image">
                <div class="grid-item-info">
                    <div class="grid-item-header">
                        <h3 class="movie-title">${title}</h3>
                        <div class="grid-item-meta">
                            <span class="rating">⭐ ${rating}</span>
                            <span class="year">${year}</span>
                            <span class="media-type">${isMovie ? '영화' : 'TV'}</span>
                        </div>
                    </div>
                    <p class="movie-overview">${overview}</p>
                    <div class="grid-item-footer">
                        <div class="grid-item-actions">
                            <button class="remove-btn" data-id="${item.interestedId}">제거</button>
                            <button class="watched-btn ${item.watched ? 'watched' : ''}" 
                                    data-id="${item.id}" 
                                    data-type="${item.type}">
                                ${item.watched ? '시청 완료' : '시청 표시'}
                            </button>
                        </div>
                        <div class="added-date">추가일: ${addedDate}</div>
                    </div>
                </div>
            </div>
        `;
    }

    applyFilters(items) {
        switch (this.currentFilter) {
            case 'movie':
                return items.filter(item => item.type === 'movie');
            case 'tv':
                return items.filter(item => item.type === 'tv');
            case 'watched':
                return items.filter(item => item.watched);
            default:
                return items;
        }
    }

    applySorting(items) {
        switch (this.currentSort) {
            case 'title':
                return items.sort((a, b) => {
                    const titleA = a.title || a.name;
                    const titleB = b.title || b.name;
                    return titleA.localeCompare(titleB);
                });
            case 'rating':
                return items.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
            case 'release_date':
                return items.sort((a, b) => {
                    const dateA = new Date(a.release_date || a.first_air_date || 0);
                    const dateB = new Date(b.release_date || b.first_air_date || 0);
                    return dateB - dateA;
                });
            default: // added_date
                return items.sort((a, b) => new Date(b.addedDate) - new Date(a.addedDate));
        }
    }

    initializeSlider(slider) {
        if (!slider) return;

        const movieList = slider.querySelector('.movie-list');
        const leftArrow = slider.querySelector('.slider-arrow-left');
        const rightArrow = slider.querySelector('.slider-arrow-right');

        if (!movieList || !leftArrow || !rightArrow) return;

        leftArrow.addEventListener('click', () => {
            movieList.scrollBy({ left: -300, behavior: 'smooth' });
        });

        rightArrow.addEventListener('click', () => {
            movieList.scrollBy({ left: 300, behavior: 'smooth' });
        });
    }

    async setupEventListeners() {
        // 영화/TV 카드 클릭 이벤트
        document.addEventListener('click', (e) => {
            const movieItem = e.target.closest('.movie-item, .wishlist-grid-item');
            const removeBtn = e.target.closest('.remove-btn');
            const watchedBtn = e.target.closest('.watched-btn');
            
            if (removeBtn) {
                e.stopPropagation();
                const id = removeBtn.dataset.id;
                this.removeFromWishlist(id);
            } else if (watchedBtn) {
                e.stopPropagation();
                const id = watchedBtn.dataset.id;
                const type = watchedBtn.dataset.type;
                this.toggleWatched(id, type);
            } else if (movieItem) {
                const id = movieItem.dataset.id;
                const type = movieItem.dataset.type;
                this.openMovieModal(id, type);
            }
        });

        // 필터 옵션 이벤트
        document.querySelectorAll('.filter-option').forEach(option => {
            option.addEventListener('click', () => {
                this.handleFilterChange(option.dataset.filter);
            });
        });

        // 정렬 옵션 이벤트
        const sortSelect = document.getElementById('sort-wishlist');
        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                this.handleSortChange(sortSelect.value);
            });
        }

        // 뷰 토글 이벤트
        document.querySelectorAll('.view-toggle').forEach(toggle => {
            toggle.addEventListener('click', () => {
                this.handleViewChange(toggle.dataset.view);
            });
        });
    }

    handleFilterChange(filter) {
        this.currentFilter = filter;
        
        // 활성 필터 업데이트
        document.querySelectorAll('.filter-option').forEach(option => {
            option.classList.toggle('active', option.dataset.filter === filter);
        });

        // 현재 보여지는 모든 아이템 가져오기
        const allItems = document.querySelectorAll('.movie-item, .wishlist-grid-item');
        
        // 필터링 적용
        allItems.forEach(item => {
            const itemType = item.dataset.type;
            const isWatched = item.classList.contains('watched');
            
            let shouldShow = false;
            switch(filter) {
                case 'all':
                    shouldShow = true;
                    break;
                case 'movie':
                    shouldShow = itemType === 'movie';
                    break;
                case 'tv':
                    shouldShow = itemType === 'tv';
                    break;
                case 'watched':
                    shouldShow = isWatched;
                    break;
            }
            
            // 아이템의 부모 요소(.media-card)도 함께 숨김/표시 처리
            const parentCard = item.closest('.media-card');
            if (parentCard) {
                parentCard.style.display = shouldShow ? '' : 'none';
            } else {
                item.style.display = shouldShow ? '' : 'none';
            }
        });

        // 필터링 후 카운트 업데이트
        this.updateFilterCounts();
    }

    updateFilterCounts() {
        const visibleItems = document.querySelectorAll('.movie-item:not([style*="display: none"]), .wishlist-grid-item:not([style*="display: none"])');
        const movieItems = Array.from(visibleItems).filter(item => item.dataset.type === 'movie');
        const tvItems = Array.from(visibleItems).filter(item => item.dataset.type === 'tv');
        const watchedItems = Array.from(visibleItems).filter(item => item.classList.contains('watched'));

        document.getElementById('total-count').textContent = visibleItems.length;
        document.getElementById('movie-count').textContent = movieItems.length;
        document.getElementById('tv-count').textContent = tvItems.length;
        document.getElementById('watched-count').textContent = watchedItems.length;
    }

    handleSortChange(sort) {
        this.currentSort = sort;
        
        // 그리드에 있는 모든 아이템 가져오기
        const gridContainer = document.getElementById('wishlist-grid');
        const items = Array.from(gridContainer.children);
        
        // 정렬 로직 적용
        items.sort((a, b) => {
            const aData = this.extractSortData(a, sort);
            const bData = this.extractSortData(b, sort);
            
            switch(sort) {
                case 'title':
                    return aData.localeCompare(bData);
                case 'rating':
                    return bData - aData; // 높은 평점순
                case 'release_date':
                    return new Date(bData) - new Date(aData); // 최신순
                default: // added_date
                    return new Date(bData) - new Date(aData);
            }
        });
        
        // 정렬된 아이템 다시 삽입
        items.forEach(item => gridContainer.appendChild(item));
    }

    extractSortData(item, sortType) {
        switch(sortType) {
            case 'title':
                return item.querySelector('h3').textContent;
            case 'rating':
                const ratingText = item.querySelector('.rating').textContent;
                return parseFloat(ratingText.replace('⭐ ', '')) || 0;
            case 'release_date':
                return item.querySelector('.year').textContent || '0';
            default: // added_date
                return item.querySelector('.added-date').textContent.replace('추가일: ', '') || '0';
        }
    }

    handleViewChange(view) {
        this.currentView = view;
        
        // 활성 뷰 업데이트
        document.querySelectorAll('.view-toggle').forEach(toggle => {
            toggle.classList.toggle('active', toggle.dataset.view === view);
        });

        // 뷰 변경 로직 (그리드/리스트)
        const wishlistGrid = document.getElementById('wishlist-grid');
        if (wishlistGrid) {
            wishlistGrid.setAttribute('data-view', view);
            
            // 애니메이션을 위한 클래스 추가/제거
            wishlistGrid.classList.remove('grid-transition');
            void wishlistGrid.offsetWidth; // 리플로우 강제
            wishlistGrid.classList.add('grid-transition');
            
            // 로컬 스토리지에 현재 뷰 저장
            localStorage.setItem('wishlist-view', view);
        }
    }

    async removeFromWishlist(id) {
    try{
        const result = await fetch(`/OpusCine/user/delete/interested/${id}`,{
        method:'DELETE',
        headers:{'Content-type':'application/json'}});

        if(result.status == 204){
        //this.updateCounts();
         this.loadWishlistContent();
         //this.checkEmptyState();
        }



       }catch(error){
           console.log(error);
        }
    }

   /* toggleWatched(id, type) {
        const item = this.wishlist.find(item => item.id == id && item.type === type);
        if (item) {
            item.watched = !item.watched;
            this.saveWishlistToStorage();
            this.updateCounts();
            this.loadWishlistContent();
        }
    }*/

    /*isInWishlist(id, type) {
        return this.wishlist.some(item => item.id == id && item.type === type);
    }*/

    updateCounts() {
        const totalCount = this.wishlist.length;
        const movieCount = this.wishlist.filter(item => item.type === 'movie').length;
        const tvCount = this.wishlist.filter(item => item.type === 'tv').length;
        const watchedCount = this.wishlist.filter(item => item.watched).length;

        const totalCountEl = document.getElementById('total-count');
        const movieCountEl = document.getElementById('movie-count');
        const tvCountEl = document.getElementById('tv-count');
        const watchedCountEl = document.getElementById('watched-count');

        if (totalCountEl) totalCountEl.textContent = totalCount;
        if (movieCountEl) movieCountEl.textContent = movieCount;
        if (tvCountEl) tvCountEl.textContent = tvCount;
        if (watchedCountEl) watchedCountEl.textContent = watchedCount;
    }

    /*checkEmptyState() {
        const emptyState = document.getElementById('empty-state');
        const wishlistContent = document.getElementById('wishlist-content');
        
        if (this.wishlist.length === 0) {
            this.showEmptyState();
        } else {
            this.hideEmptyState();
        }
    }*/

    showEmptyState() {
        const emptyState = document.getElementById('empty-state');
        const wishlistContent = document.getElementById('wishlist-content');
        
        if (emptyState) emptyState.style.display = 'block';
        if (wishlistContent) wishlistContent.style.display = 'none';
    }

    hideEmptyState() {
        const emptyState = document.getElementById('empty-state');
        const wishlistContent = document.getElementById('wishlist-content');
        
        if (emptyState) emptyState.style.display = 'none';
        if (wishlistContent) wishlistContent.style.display = 'block';
    }

    async openMovieModal(id, type) {
        try {
            if (type === 'movie') {
                mediaModal.showMovie(id);
            } else {
                mediaModal.showTVShow(id);
            }
        } catch (error) {
            console.error('상세 정보 로드 실패:', error);
        }
    }

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
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    new MyListPage();
}); 