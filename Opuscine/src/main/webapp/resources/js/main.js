/**
 * OpusCine 메인 페이지 관리 모듈
 * 
 * 메인 페이지의 모든 기능을 관리하는 핵심 모듈입니다.
 * 
 * 주요 기능:
 * 1. 초기 미디어 데이터 로딩 (영화, TV 시리즈)
 * 2. 미디어 카드 생성 및 렌더링
 * 3. 슬라이더 UI 관리 (Netflix 스타일)
 * 4. 동적 확장 방향 감지 (Prime Video 스타일)
 * 5. 검색 기능 통합
 * 6. 네비게이션 바 스크롤 효과
 */

/**
 * 미디어 카드 목록 생성 함수
 * 
 * 영화와 TV 시리즈를 구분하여 카드 형태로 렌더링합니다.
 * 각 카드는 클릭 시 상세 모달을 열도록 이벤트가 설정됩니다.
 * 
 * @param {string} containerId - 렌더링할 컨테이너 ID
 * @param {Array} items - 미디어 아이템 배열
 * @param {string} apiType - API 타입 (구분용)
 * 
 * 동작 흐름:
 * 1. 컨테이너 요소 확인 및 초기화
 * 2. 각 아이템의 미디어 타입 결정 (movie/tv)
 * 3. 클릭 이벤트 리스너 등록
 * 4. 포스터/배경 이미지 URL 생성
 * 5. HTML 요소 생성 및 DOM에 추가
 */
async function createMediaList(containerId, items, apiType) {

    let ids =[];//서버로 해당 영화 시청정보 요청

    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container with id '${containerId}' not found`);
        return;
    }

    items.forEach(i =>{
        ids.push(i.id);
    });
    let streamingMap = await getStreaming(ids);




    container.innerHTML = '';

    items.forEach((item, index) => {
        let percent=0;
        if(streamingMap != null){
          let streamingTime =  streamingMap[item.id];
          if(streamingTime){
                for(const [key,value] of Object.entries(streamingTime)){ //key:시청시간 , value:러닝타임
                    percent = Math.ceil(Number(key)/Number(value)*100);
                        }
                    }
                  }

        // ① 래퍼 div
        const card = document.createElement('div');
        card.className = 'media-card';

        const mediaItem = document.createElement('div'); //스라이스 추가할 부분
        mediaItem.className = 'movie-item';
        mediaItem.style.animationDelay = `${index * 0.1}s`; // 순차적 애니메이션

        // 미디어 타입 자동 감지 로직
        let mediaType = item.media_type;
        if (!mediaType) {
            // API 타입에 따라 미디어 타입 결정
            if (apiType && apiType.includes('tv')) {
                mediaType = 'tv';
            } else if (apiType && (apiType.includes('movie') || apiType === 'popular' || apiType === 'action' || apiType === 'romance')) {
                mediaType = 'movie';
            } else {
                mediaType = item.title ? 'movie' : 'tv'; // 제목 필드로 구분
            }
        }

        // 트레일러 로딩을 위한 data 속성 추가
        mediaItem.dataset.mediaId = item.id;
        mediaItem.dataset.mediaType = mediaType;
        mediaItem.dataset.mediaTitle = item.title || item.name;

  const thisPercent = percent;
        // 모달 열기 이벤트 리스너 등록
        mediaItem.addEventListener('click', () => {
            if (mediaType === 'movie') {
            console.log("mediaType"+mediaType);
                mediaModal.showMovie(item.id,{"percent":thisPercent});
            } else if (mediaType === 'tv') {
                mediaModal.showTVShow(item.id,{"percent":thisPercent});
            }
        });



        const service = window.tmdbService || tmdbService;
        const posterUrl = service.getPosterUrl(item.poster_path);
        const backdropUrl = service.getBackdropUrl(item.backdrop_path);

        // 제목과 날짜 처리 (영화 vs TV 시리즈 구분)
        const title = item.title || item.name;
        const releaseDate = item.release_date || item.first_air_date;
        const releaseYear = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

        const mediaTypeDisplay = mediaType === 'movie' ? '영화' : 'TV';

        mediaItem.innerHTML = `
            <img class="poster-image" src="${posterUrl}" alt="${title}" loading="lazy">
            <img class="backdrop-image" src="${backdropUrl}" alt="${title} backdrop" loading="lazy">
            <div class="media-type-badge">${mediaTypeDisplay}</div>
            <div class="movie-title">${title}</div>
            <div class="movie-info">
                <span class="movie-rating">★ ${rating}</span>
                <span class="movie-year">${releaseYear}</span>
            </div>

        `;
        card.appendChild(mediaItem);   // 먼저 포스터

           if(percent != 0){
           console.log('퍼센트'+percent);
           progressBar   = document.createElement('div');
           progressBar.className = 'progress-bar';

           const progressFill  = document.createElement('div');
           progressFill.className = 'progress-fill';
           progressFill.style.width = percent + '%';

           progressBar.appendChild(progressFill);
            card.appendChild(progressBar);
            percent =0;
            }
        container.appendChild(card);
    });

    
    // 새로 추가된 영화들에 Prime Video 효과 적용
    setupPrimeVideoEffectForContainer(container);
}



/*서버에 해당하는 영화의 시청정보 요청
 * @param {string} ids - 영화 정보의 ID 들
*/
async function getStreaming(ids){
    const res = await fetch('/OpusCine/user/streaming?id='+ids.join(','),{ headers: { 'Accept': 'application/json' }});
    if(res.status =='401'){
        console.log("권한없음");
        return null;
    }
    const data = await res.json();
    return data;
}





/**
 * 네비게이션 바 스크롤 효과
 * 스크롤 위치에 따라 네비게이션 바의 투명도를 조절합니다.
 */
function handleNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            navbar.classList.add('scrolled'); // 스크롤 시 배경 추가
        } else {
            navbar.classList.remove('scrolled'); // 상단에서는 투명
        }
    });
}

/**
 * 히어로 섹션 버튼 이벤트 리스너 설정
 */
function setupButtonListeners() {
    const playBtn = document.querySelector('.btn-play');
    const infoBtn = document.querySelector('.btn-info');

    if (playBtn) {
        playBtn.addEventListener('click', () => {
            showMessage('AI 추천 기능은 개발 중입니다!', 'info');
        });
    }

    if (infoBtn) {
        infoBtn.addEventListener('click', () => {
            showMessage('OpusCine은 AI 기반 영화 추천 서비스입니다.', 'info');
        });
    }
}

/**
 * 알림 및 프로필 기능 설정
 */
function setupNotifications() {
    const notificationIcon = document.querySelector('.notifications');
    
    if (notificationIcon) {
        notificationIcon.addEventListener('click', () => {
            showMessage('새로운 알림이 없습니다.', 'info');
        });
    }
}

function setupProfile() {
    const profileImg = document.querySelector('.profile img');
    
    if (profileImg) {
        profileImg.addEventListener('click', () => {
            showMessage('프로필 기능은 개발 중입니다!', 'info');
        });
    }
}

/**
 * 초기 미디어 데이터 로딩 함수
 * 
 * 애플리케이션 시작 시 모든 섹션의 미디어 데이터를 병렬로 로드합니다.
 * 에러 처리와 대체 데이터 로직이 포함되어 있습니다.
 * 
 * 동작 흐름:
 * 1. TMDB 서비스 연결 확인
 * 2. API 연결 테스트 수행
 * 3. 다양한 카테고리의 데이터를 병렬로 요청
 * 4. 각 섹션에 데이터 렌더링
 * 5. 슬라이더 초기화
 * 6. 에러 발생 시 더미 데이터 표시
 */
async function loadInitialMedia() {
    try {
        // tmdbService 존재 확인
        if (!window.tmdbService && !tmdbService) {
            return;
        }
        
        const service = window.tmdbService || tmdbService;
        
        // API 연결 테스트
        const testResponse = await service.getPopularMovies(1);
        
        // 병렬로 다양한 카테고리의 데이터 요청
        // Promise.all을 사용하여 모든 요청을 동시에 실행하므로 로딩 시간 단축
        const [popularMovies, upcomingMovies, topRatedMovies, actionMovies, popularTVShows, animationMovies, japaneseAnimation] = await Promise.all([
            service.getMultiplePages(service.getPopularMovies.bind(service), 3).catch(err => { return { results: [] }; }),
            service.getMultiplePages(service.getUpcomingMovies.bind(service), 2).catch(err => { return { results: [] }; }),
            service.getMultiplePages(service.getTopRatedMovies.bind(service), 2).catch(err => { return { results: [] }; }),
            service.getMultiplePages(() => service.getMoviesByGenre(28), 3).catch(err => { return { results: [] }; }), // 액션
            service.getMultiplePages(service.getPopularTVShows.bind(service), 3).catch(err => { return { results: [] }; }),
            service.getMultiplePages(service.getAnimationMovies.bind(service), 2).catch(err => { return { results: [] }; }),
            service.getMultiplePages(service.getJapaneseAnimationTVShows.bind(service), 2).catch(err => { return { results: [] }; })
        ]);

        // 각 섹션에 미디어 데이터 렌더링
        // 데이터가 있는 경우에만 렌더링하여 빈 섹션 방지
        if (popularMovies.results.length > 0) {
            createMediaList('trending', popularMovies.results, 'popular');
        }
        
        if (upcomingMovies.results.length > 0) {
            createMediaList('originals', upcomingMovies.results, 'upcoming');
        }
        
        if (topRatedMovies.results.length > 0) {
            createMediaList('documentaries', topRatedMovies.results, 'top_rated');
        }
        
        if (actionMovies.results.length > 0) {
            createMediaList('action', actionMovies.results, 'action');
        }
        
        // TV 시리즈와 애니메이션 섹션
        if (popularTVShows.results.length > 0) {
            createMediaList('tv_shows', popularTVShows.results, 'tv_popular');
        }

        if (animationMovies.results.length > 0) {
            createMediaList('animation', animationMovies.results, 'animation_movies');
        }

        if (japaneseAnimation.results.length > 0) {
            createMediaList('japanese_animation', japaneseAnimation.results, 'japanese_animation');
        }

        // 슬라이더 기능 초기화
        initializeSliders();

        showMessage('영화 및 TV 시리즈 데이터가 성공적으로 로드되었습니다!', 'success');

    } catch (error) {
        showMessage('미디어 데이터 로딩에 실패했습니다. API 키를 확인해주세요.', 'error');
        
        // 기본 더미 데이터 표시
        loadDummyMedia();
    }
}

/**
 * 더미 미디어 데이터 로드 (API 실패 시 대체)
 * API 호출이 실패했을 때 빈 화면을 방지하기 위한 대체 데이터를 표시합니다.
 */
async function loadDummyMedia() {
    const dummyMedia = [
        {
            id: 1,
            title: "미디어 데이터 로딩 실패",
            poster_path: null,
            release_date: "2024-01-01",
            vote_average: 0
        }
    ];

    ['trending', 'originals', 'action', 'documentaries', 'tv_shows', 'animation', 'japanese_animation'].forEach(sectionId => {
        createMediaList(sectionId, dummyMedia, 'movie');
    });
}

/**
 * 슬라이더 기능 초기화
 * 
 * Netflix 스타일의 가로 스크롤 슬라이더를 초기화합니다.
 * 각 섹션마다 독립적인 슬라이더 기능을 제공합니다.
 * 
 * 주요 기능:
 * 1. 좌우 화살표 클릭 이벤트
 * 2. 스무스 스크롤 애니메이션
 * 3. 동적 확장 방향 계산
 */
function initializeSliders() {
    
    // 모든 슬라이더에 대해 이벤트 리스너 추가
    const sliders = document.querySelectorAll('.movie-slider');
    
    sliders.forEach(slider => {
        const movieList = slider.querySelector('.movie-list');
        const leftArrow = slider.querySelector('.slider-arrow-left');
        const rightArrow = slider.querySelector('.slider-arrow-right');
        
        if (!movieList) return;
        
        // 화살표 클릭 이벤트 등록
        if (leftArrow) {
            leftArrow.addEventListener('click', () => {
                scrollSlider(movieList, -1); // 왼쪽으로 스크롤
            });
        }
        
        if (rightArrow) {
            rightArrow.addEventListener('click', () => {
                scrollSlider(movieList, 1); // 오른쪽으로 스크롤
            });
        }
    });
    
    // Prime Video 스타일 동적 펼침 방향 설정
    setupDynamicExpansion();
    setupPrimeVideoEffect();
}

/**
 * Prime Video 스타일 동적 펼침 방향 감지
 * 
 * 영화 카드에 마우스를 올렸을 때의 확장 방향을 동적으로 계산합니다.
 * 현재 슬라이더에서 보이는 영화들의 위치를 기준으로 방향을 결정합니다.
 * 
 * 확장 방향 결정 로직:
 * 1. 현재 슬라이더 컨테이너 내에서의 상대적 위치 확인
 * 2. 왼쪽에 위치한 영화 → 오른쪽으로 확장
 * 3. 오른쪽에 위치한 영화 → 왼쪽으로 확장
 * 4. 중간에 위치한 영화 → 적절한 방향으로 확장
 */
function setupDynamicExpansion() {
    
    // 모든 영화 아이템에 대해 펼침 방향 계산하는 핵심 함수
    const calculateExpansionDirection = () => {
        document.querySelectorAll('.movie-list').forEach(movieList => {
            const sliderRect = movieList.getBoundingClientRect();
            const sliderCenter = sliderRect.left + sliderRect.width / 2;
            
            // 각 슬라이더 내의 영화 아이템들 처리
            movieList.querySelectorAll('.movie-item').forEach(movieItem => {
                const itemRect = movieItem.getBoundingClientRect();
                const itemCenter = itemRect.left + itemRect.width / 2;
                
                // 기존 클래스 제거
                movieItem.classList.remove('expand-left', 'expand-right', 'expand-center');
                
                // 슬라이더 내에서의 상대적 위치로 방향 결정
                const relativePosition = (itemCenter - sliderRect.left) / sliderRect.width;
                
                // 확장된 크기 (747px)를 고려한 여유 공간 계산
                const expandedWidth = 747;
                const currentWidth = 280;
                const expansionNeeded = expandedWidth - currentWidth; // 467px
                
                // 오른쪽으로 확장했을 때 슬라이더를 벗어나는지 확인
                const rightExpansionEnd = itemRect.right + expansionNeeded;
                const canExpandRight = rightExpansionEnd <= sliderRect.right + 20; // 20px 여유
                
                // 왼쪽으로 확장했을 때 슬라이더를 벗어나는지 확인  
                const leftExpansionStart = itemRect.left - expansionNeeded;
                const canExpandLeft = leftExpansionStart >= sliderRect.left - 20; // 20px 여유
                
                let direction = '';
                if (relativePosition < 0.4 && canExpandRight) {
                    // 슬라이더 왼쪽 40% 구간 → 오른쪽으로 확장
                    movieItem.classList.add('expand-right');
                    direction = 'right';
                } else if (relativePosition > 0.6 && canExpandLeft) {
                    // 슬라이더 오른쪽 40% 구간 → 왼쪽으로 확장
                    movieItem.classList.add('expand-left');
                    direction = 'left';
                } else {
                    // 중간 구간 또는 제약이 있는 경우 → 중앙 확장
                    movieItem.classList.add('expand-center');
                    direction = 'center';
                }

                // 시청기록 바 방향성 설정
                const progressBar = movieItem.parentElement.querySelector('.progress-bar');
                if (progressBar) {
                    // 기존 방향 클래스 제거
                    progressBar.classList.remove('expand-left', 'expand-right', 'expand-center');
                    // 새 방향 클래스 추가
                    progressBar.classList.add(`expand-${direction}`);
                }
            });
        });
    };

    // 초기 계산 (DOM 완전 로드 후 실행)
    setTimeout(calculateExpansionDirection, 500);

    // 윈도우 리사이즈 시 재계산 (디바운싱 적용)
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
}

/**
 * Amazon Prime Video 스타일 호버 효과
 * 
 * 영화 카드 호버 시 인접한 영화들을 직접 이동시켜서
 * 아마존 프라임처럼 자연스러운 밀어내기 효과를 구현합니다.
 */
function setupPrimeVideoEffect() {
    
    // 모든 영화 아이템에 호버 이벤트 추가
    document.querySelectorAll('.movie-list').forEach(movieList => {
        movieList.querySelectorAll('.movie-item').forEach((movieItem, index, allItems) => {
            
                    let hoverTimer = null;
        let trailerLoaded = false;
        
        movieItem.addEventListener('mouseenter', () => {
            // 2초 후 펼침 효과 시작
            hoverTimer = setTimeout(() => {
                const expansionDirection = getExpansionDirection(movieItem);
                pushAdjacentItems(movieItem, index, allItems, expansionDirection);
                
                // 추가 1.5초 후 트레일러 로드 시작 (총 3.5초)
                const trailerTimer = setTimeout(async () => {
                    if (!trailerLoaded) {
                        await loadTrailerOnHover(movieItem);
                        trailerLoaded = true;
                    }
                }, 1500);
                
                // trailerTimer를 저장해서 나중에 정리할 수 있도록
                movieItem._trailerTimer = trailerTimer;
            }, 2000);
        });
        
        movieItem.addEventListener('mouseleave', () => {
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
            cleanupTrailer(movieItem);
            trailerLoaded = false;
            
            resetAdjacentItems(allItems);
        });
        });
    });
}

/**
 * 영화의 확장 방향 결정
 */
function getExpansionDirection(movieItem) {
    if (movieItem.classList.contains('expand-left')) {
        return 'left';
    } else if (movieItem.classList.contains('expand-right')) {
        return 'right';
    } else {
        return 'center';
    }
}

/**
 * 인접한 영화들을 밀어내기
 */
function pushAdjacentItems(hoveredItem, hoveredIndex, allItems, direction) {
    allItems.forEach((item, index) => {
        // 기존 클래스 모두 제거
        item.classList.remove('pushed-left', 'pushed-right', 'pushed-both-left', 'pushed-both-right', 'hovering');
        
        // 해당 영화의 시청기록 바 찾기
        const progressBar = item.parentElement.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.classList.remove('hovering-left', 'hovering-right', 'hovering-center');
        }
        
        if (index === hoveredIndex) {
            // 호버된 영화에 hovering 클래스 추가
            item.classList.add('hovering');
            
            // 호버된 영화의 시청기록 바에 방향성 클래스 추가
            if (progressBar) {
                if (direction === 'left') {
                    progressBar.classList.add('hovering-left');
                } else if (direction === 'right') {
                    progressBar.classList.add('hovering-right');
                } else if (direction === 'center') {
                    progressBar.classList.add('hovering-center');
                }
            }
            
            // 방향에 따른 위치 조정
            item.style.transition = 'all 0.3s ease-out';
            if (direction === 'left') {
                item.style.transform = 'translateX(-280px) translateY(-20px)';
            } else if (direction === 'right') {
                item.style.transform = 'translateX(0px) translateY(-20px)'; /* 제자리에서 오른쪽으로 확장 */
            } else if (direction === 'center') {
                item.style.transform = 'translateX(-100px) translateY(-20px)'; /* 중앙 확장 시 조정 */
            }
        } else {
            // 인접한 영화들 밀어내기
            if (direction === 'left') {
                // 왼쪽으로 확장 → 왼쪽에 있는 영화들을 더 왼쪽으로 밀어냄
                if (index < hoveredIndex) {
                    item.classList.add('pushed-left');
                }
            } else if (direction === 'right') {
                // 오른쪽으로 확장 → 오른쪽에 있는 영화들을 더 오른쪽으로 밀어냄
                if (index > hoveredIndex) {
                    item.classList.add('pushed-right');
                }
            } else if (direction === 'center') {
                // 중앙으로 확장 → 양쪽 영화들을 각각 밀어냄
                if (index < hoveredIndex) {
                    item.classList.add('pushed-both-left');
                } else if (index > hoveredIndex) {
                    item.classList.add('pushed-both-right');
                }
            }
        }
    });
}

/**
 * 모든 영화들을 원래 위치로 복원
 */
function resetAdjacentItems(allItems) {
    allItems.forEach(item => {
        item.classList.remove('pushed-left', 'pushed-right', 'pushed-both-left', 'pushed-both-right', 'hovering');
        item.style.transform = ''; // 인라인 스타일 제거
        item.style.transition = ''; // 트랜지션도 제거
        
        // 시청기록 바의 호버 클래스도 제거
        const progressBar = item.parentElement.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.classList.remove('hovering-left', 'hovering-right', 'hovering-center');
        }
    });
}

/**
 * 호버 시 트레일러 로드 및 재생 (펼쳐짐 효과에 맞춤)
 */
async function loadTrailerOnHover(movieItem) {
    try {
        // 미디어 정보 추출
        const mediaInfo = extractMediaInfo(movieItem);
        if (!mediaInfo) return;
        
        // 로딩 인디케이터 표시
        showTrailerLoading(movieItem);
        
        // 트레일러 정보 가져오기
        const service = window.tmdbService || tmdbService;
        let trailer = null;
        
        if (mediaInfo.type === 'movie') {
            trailer = await service.getMovieTrailer(mediaInfo.id);
        } else if (mediaInfo.type === 'tv') {
            trailer = await service.getTVShowTrailer(mediaInfo.id);
        }
        
        // 로딩 인디케이터 제거
        hideTrailerLoading(movieItem);
        
        if (trailer && trailer.key) {
            createTrailerIframe(movieItem, trailer);
        } else {
            showTrailerError(movieItem, '트레일러를 찾을 수 없습니다');
        }
        
    } catch (error) {
        hideTrailerLoading(movieItem);
        showTrailerError(movieItem, '트레일러 로드 실패');
    }
}

/**
 * 트레일러 로딩 인디케이터 표시
 */
function showTrailerLoading(movieItem) {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'trailer-loading';
    loadingDiv.textContent = '트레일러 로딩 중...';
    movieItem.appendChild(loadingDiv);
}

/**
 * 트레일러 로딩 인디케이터 숨기기
 */
function hideTrailerLoading(movieItem) {
    const loadingDiv = movieItem.querySelector('.trailer-loading');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

/**
 * 트레일러 에러 메시지 표시
 */
function showTrailerError(movieItem, message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'trailer-error';
    errorDiv.textContent = message;
    movieItem.appendChild(errorDiv);
    
    // 3초 후 자동 제거
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 3000);
}

/**
 * 펼쳐짐 효과에 맞춰 트레일러 iframe 생성 및 재생
 */
function createTrailerIframe(movieItem, trailer) {
    // 기존 트레일러 정리
    cleanupTrailer(movieItem);
    
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
    
    // CSS에서 스타일을 관리하므로 인라인 스타일 제거
    // object-fit과 object-position은 CSS의 .trailer-iframe 및 .movie-item.hovering .trailer-iframe에서 처리
    
    // 클릭 방지 투명 div 생성 (상세 모달 참고)
    const clickBlocker = document.createElement('div');
    clickBlocker.className = 'iframe-click-blocker';
    
    // 클릭 시 원래 영화 클릭 이벤트 실행
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

/**
 * 트레일러 정리
 */
function cleanupTrailer(movieItem) {
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

/**
 * 영화 아이템에서 미디어 정보 추출 (개선된 버전)
 */
function extractMediaInfo(movieItem) {
    try {
        // data 속성에서 정보 추출 (우선순위)
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
        
        // 대체 방법: 클릭 이벤트에서 미디어 정보 추출
        const clickHandler = movieItem.onclick;
        if (clickHandler) {
            const handlerStr = clickHandler.toString();
            const movieMatch = handlerStr.match(/showMovie\((\d+)\)/);
            const tvMatch = handlerStr.match(/showTVShow\((\d+)\)/);
            
            if (movieMatch) {
                return {
                    id: parseInt(movieMatch[1]),
                    type: 'movie',
                    title: movieItem.querySelector('.movie-title')?.textContent || 'Unknown'
                };
            } else if (tvMatch) {
                return {
                    id: parseInt(tvMatch[1]),
                    type: 'tv',
                    title: movieItem.querySelector('.movie-title')?.textContent || 'Unknown'
                };
            }
        }
        
        return null;
    } catch (error) {
        return null;
    }
}

/**
 * 특정 컨테이너의 영화들에 Prime Video 효과 적용
 */
function setupPrimeVideoEffectForContainer(container) {
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
                const expansionDirection = getExpansionDirection(movieItem);
                pushAdjacentItems(movieItem, index, allItems, expansionDirection);
                
                // 추가 1.5초 후 트레일러 로드 시작
                const trailerTimer = setTimeout(async () => {
                    if (!trailerLoaded) {
                        await loadTrailerOnHover(movieItem);
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
            cleanupTrailer(movieItem);
            trailerLoaded = false;
            
            resetAdjacentItems(allItems);
        };
        
        // 이벤트 리스너 등록
        movieItem.addEventListener('mouseenter', movieItem._primeVideoEnter);
        movieItem.addEventListener('mouseleave', movieItem._primeVideoLeave);
    });
}

/**
 * 슬라이더 스크롤 함수
 * 
 * @param {Element} movieList - 스크롤할 영화 목록 요소
 * @param {number} direction - 스크롤 방향 (1: 오른쪽, -1: 왼쪽)
 * @param {number} speed - 스크롤 속도 배수
 */
function scrollSlider(movieList, direction, speed = 1) {
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

/**
 * 페이지 로드 시 초기화 함수
 * 
 * DOMContentLoaded 이벤트에서 호출되는 메인 초기화 함수입니다.
 * 모든 기능을 순차적으로 초기화합니다.
 * 
 * 초기화 순서:
 * 1. 기본 이벤트 리스너 설정
 * 2. Hero 캐러셀 초기화 (API 키 확인 후)
 * 3. 초기 미디어 데이터 로드
 */
document.addEventListener('DOMContentLoaded', () => {
    // 각종 이벤트 리스너 설정
    handleNavbarScroll();
    setupButtonListeners();
    setupNotifications();
    setupProfile();
    initializeSearch();
    
    // Hero 캐러셀 초기화 (API 키가 있을 때만)
    const service = window.tmdbService || tmdbService;
    if (service && service.apiKey && service.apiKey !== 'YOUR_API_KEY_HERE') {
        heroCarousel = new HeroCarousel();
    }
    
    // 초기 미디어 데이터 로드
    loadInitialMedia();
});

// ... 나머지 코드 (CSS 스타일, 검색 기능 등)는 기존과 동일

// 추가 CSS 스타일 동적 추가
const additionalStyles = `
    .modal-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 400px;
        color: var(--text-secondary);
    }

    .loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid var(--border-color);
        border-top: 3px solid var(--primary-color);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 20px;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .movie-item {
        cursor: pointer;
        user-select: none;
        position: relative;
    }

    .movie-item:active {
        transform: scale(0.98);
    }

    .media-type-badge {
        position: absolute;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 600;
        z-index: 5;
        opacity: 0;
        transition: opacity 0.3s ease;
    }

    .movie-item:hover .media-type-badge {
        opacity: 1;
    }

    .hero-media-type {
        color: var(--primary-color);
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    /* 사진 기반 버튼 디자인 CSS */
    .movie-actions {
        margin: 24px 0;
    }

    .action-buttons-row {
        display: flex;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;
    }

    /* 시청하기 버튼 - 드롭다운 스타일 */
    .play-button {
        background: linear-gradient(90deg, #4A90E2 0%, #7B68EE 100%);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 6px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
        min-width: 120px;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .play-button::after {
        content: '▼';
        font-size: 12px;
        margin-left: 8px;
    }

    .play-button:hover {
        background: linear-gradient(90deg, #357ABD 0%, #6A5ACD 100%);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
    }

    /* 같이보기 버튼 - 그라데이션 스타일 */
    .watch-together-button {
        background: linear-gradient(90deg, #00C9A7 0%, #F39C12 100%);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 6px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
        min-width: 120px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .watch-together-button:hover {
        background: linear-gradient(90deg, #00A085 0%, #E67E22 100%);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 201, 167, 0.3);
    }

    /* 반응형 디자인 */
    @media (max-width: 768px) {
        .action-buttons-row {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
        }

        .play-button,
        .watch-together-button,
        .wishlist-button {
            width: 100%;
            min-width: unset;
            justify-content: center;
        }

        .like-box-btn,
        .dislike-box-btn {
            width: 100%;
            min-width: unset;
        }
    }

    @media (max-width: 480px) {
        .action-buttons-row {
            gap: 6px;
        }

        .play-button,
        .watch-together-button,
        .wishlist-button {
            padding: 10px 16px;
            font-size: 14px;
        }

        .like-box-btn,
        .dislike-box-btn {
            padding: 10px 16px;
            font-size: 12px;
            min-width: 80px;
        }
    }

    /* 평가 메시지 스타일 */
    .evaluation-message {
        padding: 12px 16px;
        border-radius: 6px;
        margin: 12px 0;
        font-size: 14px;
        animation: slideIn 0.3s ease;
    }

    .evaluation-message.success {
        background: rgba(34, 197, 94, 0.1);
        border: 1px solid rgba(34, 197, 94, 0.3);
        color: #22c55e;
    }

    .evaluation-message.info {
        background: rgba(59, 130, 246, 0.1);
        border: 1px solid rgba(59, 130, 246, 0.3);
        color: #3b82f6;
    }

    .evaluation-message.error {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        color: #ef4444;
    }

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;

// 스타일 추가
const mainStyleSheet = document.createElement('style');
mainStyleSheet.textContent = additionalStyles;
document.head.appendChild(mainStyleSheet);

// 검색 기능 초기화
function initializeSearch() {
    const searchIcon = document.querySelector('.search-icon');
    const searchModal = document.getElementById('search-modal');
    const searchInput = document.getElementById('search-input');
    const searchClose = document.getElementById('search-close');
    const searchResults = document.getElementById('search-results');
    const searchContent = document.getElementById('search-content');
    const searchResultsGrid = document.getElementById('search-results-grid');
    const suggestionTags = document.querySelectorAll('.suggestion-tag');
    
    let searchTimeout;
    
    // 검색 모달 열기
    if (searchIcon) {
        searchIcon.addEventListener('click', () => {
            searchModal.classList.add('active');
            searchInput.focus();
            document.body.style.overflow = 'hidden';
        });
    }
    
    // 검색 모달 닫기
    if (searchClose) {
        searchClose.addEventListener('click', closeSearchModal);
    }
    
    if (searchModal) {
        searchModal.addEventListener('click', (e) => {
            if (e.target === searchModal) {
                closeSearchModal();
            }
        });
    }
    
    // ESC 키로 모달 닫기
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && searchModal && searchModal.classList.contains('active')) {
            closeSearchModal();
        }
    });
    
    function closeSearchModal() {
        if (searchModal) {
            searchModal.classList.remove('active');
            document.body.style.overflow = '';
        }
        if (searchInput) {
            searchInput.value = '';
        }
        if (searchContent) {
            searchContent.style.display = 'none';
        }
        const suggestions = document.querySelector('.search-suggestions');
        if (suggestions) {
            suggestions.style.display = 'block';
        }
    }
    
    // 검색 입력 처리
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            clearTimeout(searchTimeout);
            
            if (query.length === 0) {
                if (searchContent) searchContent.style.display = 'none';
                const suggestions = document.querySelector('.search-suggestions');
                if (suggestions) suggestions.style.display = 'block';
                return;
            }
            
            if (query.length < 2) return;
            
            searchTimeout = setTimeout(() => {
                performSearch(query);
            }, 300);
        });
    }
    
    // 인기 검색어 클릭 처리
    suggestionTags.forEach(tag => {
        tag.addEventListener('click', () => {
            const query = tag.textContent;
            if (searchInput) {
                searchInput.value = query;
                performSearch(query);
            }
        });
    });
    
    // 검색 실행
    async function performSearch(query) {
        try {
            // 로딩 표시
            showSearchLoading();
            
            // 영화, TV 쇼 동시 검색
            const service = window.tmdbService || tmdbService;
            const [movieResults, tvResults] = await Promise.all([
                service.searchMovies(query).catch(() => ({ results: [] })),
                service.searchTVShows(query).catch(() => ({ results: [] }))
            ]);
            
            // 결과 합치기 및 정렬
            const allResults = [
                ...movieResults.results.map(item => ({ ...item, media_type: 'movie' })),
                ...tvResults.results.map(item => ({ ...item, media_type: 'tv' }))
            ].sort((a, b) => b.popularity - a.popularity);
            
            displaySearchResults(allResults, query);
            
        } catch (error) {
            console.error('검색 오류:', error);
            showSearchError();
        }
    }
    
    function showSearchLoading() {
        const suggestions = document.querySelector('.search-suggestions');
        if (suggestions) suggestions.style.display = 'none';
        if (searchContent) searchContent.style.display = 'block';
        if (searchResultsGrid) {
            searchResultsGrid.innerHTML = `
                <div class="search-loading">
                    <div class="search-spinner"></div>
                </div>
            `;
        }
    }
    
    function showSearchError() {
        if (searchResultsGrid) {
            searchResultsGrid.innerHTML = `
                <div class="search-no-results">
                    검색 중 오류가 발생했습니다. 다시 시도해주세요.
                </div>
            `;
        }
    }
    
    function displaySearchResults(results, query) {
        const suggestions = document.querySelector('.search-suggestions');
        if (suggestions) suggestions.style.display = 'none';
        if (searchContent) searchContent.style.display = 'block';
        
        if (!searchResultsGrid) return;
        
        if (results.length === 0) {
            searchResultsGrid.innerHTML = `
                <div class="search-no-results">
                    "${query}"에 대한 검색 결과가 없습니다.
                </div>
            `;
            return;
        }
        
        searchResultsGrid.innerHTML = results.map(item => {
            const title = item.title || item.name;
            const year = item.release_date || item.first_air_date;
            const rating = item.vote_average;
            const posterPath = item.poster_path;
            const mediaType = item.media_type === 'movie' ? '영화' : 'TV';
            
            return `
                <div class="search-result-item" data-id="${item.id}" data-type="${item.media_type}">
                    <div class="search-result-type">${mediaType}</div>
                    <img class="search-result-poster" 
                         src="${posterPath ? `https://image.tmdb.org/t/p/w300${posterPath}` : 'https://via.placeholder.com/300x450?text=No+Image'}" 
                         alt="${title}">
                    <div class="search-result-info">
                        <h3 class="search-result-title">${title}</h3>
                        <div class="search-result-meta">
                            ${year ? `<span class="search-result-year">${year.split('-')[0]}</span>` : ''}
                            ${rating > 0 ? `<span class="search-result-rating">★ ${rating.toFixed(1)}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // 검색 결과 클릭 이벤트
        searchResultsGrid.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                const type = item.dataset.type;
                
                closeSearchModal();
                
                // 모달 열기
                if (window.mediaModal) {
                    if (type === 'movie') {
                        window.mediaModal.showMovie(id);
                    } else {
                        window.mediaModal.showTVShow(id);
                    }
                }
            });
        });
    }
} 