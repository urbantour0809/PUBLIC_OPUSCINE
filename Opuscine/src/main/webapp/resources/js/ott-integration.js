// OTT 링크 통합 관리 모듈
class OTTIntegration {
    constructor() {
        this.ottDatabase = null;
        this.preferredProviders = ['Netflix', 'Disney Plus', 'Amazon Prime Video', 'Wavve', 'Tving'];
        this.proxyBaseUrl = 'https://port-0-opuscine-mca2bgqj5003cb7a.sel5.cloudtype.app';
        
        // OTT 링크 캐시 (메모리 기반)
        this.ottCache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5분 캐시
        
        // 무한 루프 방지용 플래그
        this.isProcessingModal = false;
        this.processedModals = new Set(); // 처리된 모달 추적
        this.modalProcessingTimeout = null; // 디바운싱용 타이머
        
        this.init();

        //스트리밍 정보 관련 변수
        this.startTime =0;
        this.endTime=0;
        this.runTime=0;
        this.id =0;
    }

    async init() {
        try {
            this.setupPlayButtonListeners();
        } catch (error) {
            // OTT 통합 모듈 초기화 실패 (조용히 무시)
        }
    }

     //영상 시청시간 구함
    videoTime(flag){
            if(flag == 1){//영상 시작
                this.startTime = Date.now();
                return;
            }else{
            console.log("확인");
                this.endTime = Date.now();
                let watchingTime = this.endTime - this.startTime;
                //임의 테스트 시간 설정
                watchingTime = 10;
                //watchingTime = Number(watchingTime);
                if(watchingTime>=1.0){
                const percent =Math.ceil(watchingTime/Number(this.runTime) *100);
                console.log('pser:'+percent+'id:'+this.id);
               //서버로 요청 보냄
               fetch('/OpusCine/user/streaming',{
               method:'POST',
               headers:{'Content-Type':'application/json'},
               body:JSON.stringify({'time':watchingTime,'movieId':this.id,'runTime':this.runTime})
               })
               .then(res=>{
               if(res.status =='401'){
                res.text().then(data =>{console.log(data)});
               }else if(res.status =='204'){
               //화면 시청 표시바
                  
                      const top = document.querySelector('.movie-poster-section');
                         progressBar   = document.createElement('div');
                         progressBar.className = 'progress-bar';

                         const progressFill  = document.createElement('div');
                         progressFill.className = 'modalProgress-fill';
                         progressFill.style.width = percent + '%';

                         progressBar.appendChild(progressFill);
                         top.appendChild(progressBar);
                  
                        progressFill.style.width = percent + '%';
                  
               }
               });//then
                }

            }
        }



    // OTT 링크 조회 (캐시 포함, 실제 proxy 서버 호출)
    async getContentOTTLinks(contentId, contentType) {
        const cacheKey = `${contentType}_${contentId}`;
        const startTime = Date.now();
        console.log(contentType);
        // 요청 시작 로그 (간소화)
        
        // 캐시 확인
        if (this.ottCache.has(cacheKey)) {
            const cached = this.ottCache.get(cacheKey);
            const now = Date.now();
            
            if (now - cached.timestamp < this.cacheExpiry) {
                return cached.data;
            } else {
                this.ottCache.delete(cacheKey);
            }
        }
        
        // 동시 요청 방지
        const requestKey = `requesting_${cacheKey}`;
        if (this.ottCache.has(requestKey)) {
            return [];
        }
        
        // 요청 진행 중 표시
        this.ottCache.set(requestKey, { timestamp: Date.now() });
        
        try {
            // TV 시리즈와 영화 모두 같은 엔드포인트 사용
            const apiUrl = `${this.proxyBaseUrl}/api/movies/${contentId}/ott`;
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                mode: 'cors'
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.ott_links && Array.isArray(data.ott_links)) {
                
                const processedLinks = data.ott_links.map((link, index) => {
                    const processed = {
                        provider: this.normalizeProviderName(link.provider_name || 'Unknown', link.link),
                        link: link.link,
                        logo_path: link.logo_path,
                        display_priority: link.display_priority || (index + 1)
                    };
                    return processed;
                });
                
                // 중복 provider 제거 (첫 번째 링크만 유지)
                const uniqueLinks = [];
                const seenProviders = new Set();
                
                processedLinks
                    .sort((a, b) => (a.display_priority || 1) - (b.display_priority || 1))
                    .forEach(link => {
                        if (!seenProviders.has(link.provider)) {
                            seenProviders.add(link.provider);
                            uniqueLinks.push(link);
                        }
                    });
                
                // 중복 제거 완료
                
                // 요청 완료 표시 제거 및 결과 캐시에 저장
                this.ottCache.delete(`requesting_${cacheKey}`);
                this.ottCache.set(cacheKey, {
                    data: uniqueLinks,
                    timestamp: Date.now()
                });
                
                return uniqueLinks;
            } else {
                // OTT 링크 없음
                
                // 요청 완료 표시 제거 및 빈 결과도 캐시에 저장 (불필요한 재요청 방지)
                this.ottCache.delete(`requesting_${cacheKey}`);
                this.ottCache.set(cacheKey, {
                    data: [],
                    timestamp: Date.now()
                });
                
                return [];
            }
            
        } catch (error) {
            // 에러 발생 시에도 요청 진행 중 표시 제거
            this.ottCache.delete(`requesting_${cacheKey}`);
            
            return [];
        }
    }

    // 프로바이더 이름 정규화 (이름과 URL에서 모두 추출)
    normalizeProviderName(providerName, ottLink = null) {
        const nameMap = {
            'wavve': 'Wavve',
            'tving': 'Tving', 
            'netflix': 'Netflix',
            'disney': 'Disney Plus',
            'disneyplus': 'Disney Plus',
            'amazon': 'Amazon Prime Video',
            'prime': 'Amazon Prime Video',
            'apple': 'Apple TV Plus',
            'watcha': 'Watcha',
            'coupang': 'Coupang Play',
            'youtube': 'YouTube',
            'hulu': 'Hulu'
        };
        
        // 1. 프로바이더 이름에서 먼저 확인
        if (providerName && providerName !== 'Unknown') {
            const lowerName = providerName.toLowerCase();
            for (const [key, value] of Object.entries(nameMap)) {
                if (lowerName.includes(key)) {
                    return value;
                }
            }
        }
        
        // 2. OTT 링크 URL에서 추출 시도
        if (ottLink) {
            const lowerUrl = ottLink.toLowerCase();
            for (const [key, value] of Object.entries(nameMap)) {
                if (lowerUrl.includes(key)) {
                    return value;
                }
            }
            
            // 3. 도메인 기반 추가 매핑
            const domainMap = {
                'netflix.com': 'Netflix',
                'disneyplus.com': 'Disney Plus',
                'primevideo.com': 'Amazon Prime Video',
                'amazon.com': 'Amazon Prime Video',
                'apple.com': 'Apple TV Plus',
                'tv.apple.com': 'Apple TV Plus',
                'wavve.com': 'Wavve',
                'tving.com': 'Tving',
                'watcha.com': 'Watcha',
                'coupangplay.com': 'Coupang Play'
            };
            
            for (const [domain, provider] of Object.entries(domainMap)) {
                if (lowerUrl.includes(domain)) {
                    return provider;
                }
            }
        }
        
        return providerName || 'Unknown';
    }

    getBestOTTLink(ottLinks) {
        if (!ottLinks || !ottLinks.length) return null;

        // display_priority가 낮은 순서로 정렬 후 첫 번째 반환
        const sortedLinks = [...ottLinks].sort((a, b) => (a.display_priority || 1) - (b.display_priority || 1));
        return sortedLinks[0];
    }

    //ott별 클릭 시 stream func 실행
    createOTTDropdown(ottLinks, contentType) {
        if (!ottLinks.length) return null;

        // display_priority 순으로 정렬
        const sortedLinks = ottLinks.sort((a, b) => (a.display_priority || 1) - (b.display_priority || 1));

        const dropdown = document.createElement('div');
        dropdown.className = 'ott-dropdown';
        dropdown.innerHTML = `
            <div class="ott-dropdown-header">

                <span>시청하기</span>
                <span>▼</span>
            </div>
            <div class="ott-dropdown-menu">
                ${sortedLinks.map(ott => `
                    <a href="${ott.link}" target="_blank" class="ott-option" data-provider="${ott.provider}">
                        <div class="ott-icon ${this.getProviderClass(ott.provider)}"></div>
                        <span>${ott.provider}에서 시청</span>
                        <span>↗</span>
                    </a>
                `).join('')}
            </div>
        `;
        let flag = false;
        // 드롭다운 토글 이벤트
        const header = dropdown.querySelector('.ott-dropdown-header');
        
        header.addEventListener('click', (e) => {
                   e.stopPropagation();
                   dropdown.classList.toggle('active');
                   document.querySelector('.ott-option').addEventListener('click',()=>{
                        flag = true;
                   });
                });
        document.addEventListener('visibilitychange',()=>{
            if(document.hidden){
                if(flag){
                    this.videoTime(1);
                }
            }else{
                if(flag){
                    this.videoTime(2);
                    flag = false;
                }
            }
        });

        // 외부 클릭 시 드롭다운 닫기
        document.addEventListener('click', () => {
            dropdown.classList.remove('active');
        });

        return dropdown;
    }

    // OTT 프로바이더별 CSS 클래스 반환 (로컬 이미지 매핑)
    getProviderClass(provider) {
        const classMap = {
            'Netflix': 'ott-logo-netflix',
            'Disney Plus': 'ott-logo-disney', 
            'Amazon Prime Video': 'ott-logo-amazon',
            'Apple TV Plus': 'ott-logo-apple',
            'Wavve': 'ott-logo-wavve',
            'Tving': 'ott-logo-tving',
            'Watcha': 'ott-logo-watcha',
            'Coupang Play': 'ott-logo-coupang',
            'YouTube': 'ott-logo-youtube',
            'Hulu': 'ott-logo-hulu'
        };
        
        return classMap[provider] || 'ott-logo-default';
    }

    // OTT 미제공 버튼 생성
    createNoOTTButton() {
        const button = document.createElement('button');
        button.className = 'btn btn-no-ott';
        button.innerHTML = `
            <span>📺</span>
            <span>OTT 미제공</span>
        `;
        button.disabled = true;
        return button;
    }



    setupPlayButtonListeners() {
        // 영화 상세 모달의 재생 버튼 업데이트
        this.observeModalChanges();
        
        // 히어로 섹션 재생 버튼 업데이트
        this.updateHeroPlayButton();
    }

    observeModalChanges() {
        
        this.modalObserver = new MutationObserver((mutations) => {
            // 이미 처리 중이면 무시
            if (this.isProcessingModal) {
                return;
            }
            
            mutations.forEach((mutation) => {
                // 모달 자체가 새로 추가되거나 display가 변경되는 경우만 감지
                if (mutation.type === 'childList' || mutation.type === 'attributes') {
                    const modal = document.querySelector('#movie-modal');
                    
                    // 모달이 열려있고, 아직 처리되지 않은 경우만 처리
                    if (modal && modal.style.display === 'block') {
                        const modalId = modal.dataset.tmdbId;
                        
                        // 이미 처리된 모달이거나 TMDB ID가 없으면 무시
                        if (!modalId || this.processedModals.has(modalId)) {
                            return;
                        }
                        
                        // 새로운 모달 감지됨
                        
                        // 처리된 모달로 등록 (중복 처리 방지)
                        this.processedModals.add(modalId);
                        
                        // 기존 타이머가 있으면 취소 (디바운싱)
                        if (this.modalProcessingTimeout) {
                            clearTimeout(this.modalProcessingTimeout);
                        }
                        
                        // 300ms 후에 처리 (연속 호출 방지)
                        this.modalProcessingTimeout = setTimeout(() => {
                            if (!this.isProcessingModal) {
                                this.updateModalPlayButton(modal);
                            }
                            this.modalProcessingTimeout = null;
                        }, 300);
                    }
                }
            });
        });

        // 더 정밀한 관찰 옵션 설정 (모달 컨테이너만 관찰)
        this.modalObserver.observe(document.body, {
            childList: true,
            subtree: false, // 하위 요소의 변화는 무시
            attributes: true,
            attributeFilter: ['style'] // style 속성 변화만 감지
        });
        
        // 기존 모달이 이미 열려있는지도 확인
        setTimeout(() => {
            const existingModal = document.querySelector('#movie-modal');
            if (existingModal && existingModal.style.display === 'block') {
                const modalId = existingModal.dataset.tmdbId;
                if (!this.processedModals.has(modalId)) {
                    this.processedModals.add(modalId);
                    this.updateModalPlayButton(existingModal);
                }
            }
        }, 1000);
        
        // 모달이 닫힐 때 처리된 모달 목록 정리
        this.observeModalClose();
    }
    
    observeModalClose() {
        // 모달 닫기 버튼들 감지
        document.addEventListener('click', (event) => {
            const target = event.target;
            
            // 모달 닫기 버튼이나 배경 클릭 감지
            if (target.classList.contains('close') || 
                target.classList.contains('modal-close') ||
                target.id === 'movie-modal') {
                
                this.processedModals.clear();
                this.isProcessingModal = false;
            }
        });
        
        // ESC 키로 모달 닫기 감지
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.processedModals.clear();
                this.isProcessingModal = false;
            }
        });
    }

    async updateModalPlayButton(modal, ...rest) {
         //스트리밍 정보도 같이 가져와야 함
                 if(rest.length>0){
                     this.runTime = rest[0]?.runtime;
                     this.id = rest[0]?.id;
                 }
        
        // 처리 중 플래그 설정
        this.isProcessingModal = true;
        
        try {
            // 다양한 재생 버튼 선택자 시도
            let playButton = modal.querySelector('.btn-play');
            if (!playButton) {
                playButton = modal.querySelector('.play-button');
            }
            if (!playButton) {
                playButton = modal.querySelector('.btn.btn-play');
            }
            if (!playButton) {
                playButton = modal.querySelector('button[class*="play"]');
            }
            if (!playButton) {
                playButton = modal.querySelector('.movie-actions .btn:first-child');
            }
            
            // 이미 OTT 드롭다운이나 OTT 버튼이 있으면 처리하지 않음
            const existingOttElement = modal.querySelector('.ott-dropdown, .btn-no-ott');
            if (existingOttElement) {
                return; // 이미 처리됨
            }
            
            if (!playButton) {
                return; // 재생 버튼이 없으면 조용히 종료
            }

            // 모달에서 TMDB ID와 타입 추출
            const tmdbId = modal.dataset.tmdbId;
            const contentType = modal.dataset.contentType || 'movie';
            
            // 모달 데이터 확인
            
            if (!tmdbId) {
                return; // TMDB ID가 없으면 조용히 종료
            }

            // Observer 일시 중단 (DOM 변경으로 인한 재호출 방지)
            if (this.modalObserver) {
                this.modalObserver.disconnect();
            }
            
            // 로딩 상태 표시
            playButton.innerHTML = '🔄 OTT 링크 확인 중...';
            playButton.disabled = true;
            playButton.style.opacity = '0.7';
            playButton.className = 'btn btn-ott-loading';
            
            // 실시간으로 proxy 서버에서 OTT 링크 조회
            const ottLinks = await this.getContentOTTLinks(parseInt(tmdbId), contentType);
            
            if (ottLinks.length > 0) {
                // 기존 재생 버튼을 OTT 드롭다운으로 교체
                const dropdown = this.createOTTDropdown(ottLinks, contentType);
                if (dropdown) {
                    playButton.parentNode.replaceChild(dropdown, playButton);
                }
            } else {
                // OTT 미제공 버튼으로 교체
                const noOttButton = this.createNoOTTButton();
                playButton.parentNode.replaceChild(noOttButton, playButton);
            }
            
        } catch (error) {
            // 에러 발생 시 에러 상태로 표시 (playButton이 존재할 때만)
            if (playButton) {
                playButton.innerHTML = '❌ OTT 정보 로드 실패';
                playButton.disabled = true;
                playButton.style.opacity = '0.7';
                playButton.className = 'btn btn-ott-error';
                playButton.title = `OTT 링크 정보를 가져올 수 없습니다: ${error.message}`;
            }
        } finally {
            // 처리 완료 후 플래그 해제 및 Observer 재시작
            this.isProcessingModal = false;
            
            // Observer 재시작
            if (this.modalObserver) {
                this.modalObserver.observe(document.body, {
                    childList: true,
                    subtree: false,
                    attributes: true,
                    attributeFilter: ['style']
                });
            }
        }
    }

    async updateHeroPlayButton() {
        const heroPlayButton = document.querySelector('.hero .btn-play');
        if (!heroPlayButton) return;

        // 히어로 섹션의 현재 영화 정보 가져오기
        const heroSection = document.querySelector('.hero');
        const tmdbId = heroSection?.dataset.tmdbId;
        const contentType = heroSection?.dataset.contentType || 'movie';

        if (tmdbId) {
            try {
                const ottLinks = await this.getContentOTTLinks(parseInt(tmdbId), contentType);
                const bestOTTLink = this.getBestOTTLink(ottLinks);
                
                if (bestOTTLink) {
                    heroPlayButton.onclick = (e) => {
                        e.preventDefault();
                        window.open(bestOTTLink.link, '_blank');
                    };
                    
                    // 버튼 텍스트 업데이트
                    heroPlayButton.innerHTML = `<i class="fas fa-play"></i> ${bestOTTLink.provider}에서 시청`;
                }
            } catch (error) {
                // Hero 버튼 OTT 업데이트 실패 (조용히 무시)
            }
        }
    }

    // 캐시 통계 확인 (디버깅용)
    getCacheStats() {
        const stats = {
            totalEntries: this.ottCache.size,
            entries: [],
            cacheHitRatio: 0
        };
        
        const now = Date.now();
        for (const [key, value] of this.ottCache.entries()) {
            const age = Math.round((now - value.timestamp) / 1000);
            const isExpired = (now - value.timestamp) >= this.cacheExpiry;
            
            stats.entries.push({
                key,
                linkCount: value.data.length,
                ageSeconds: age,
                isExpired
            });
        }
        
        // 캐시 통계 확인 완료
        return stats;
    }
    
    // 캐시 초기화
    clearCache() {
        this.ottCache.clear();
    }
    
    // 참고용 함수들 (추후 확장 가능)
    // 영화 카드에 OTT 정보 표시 (추후 구현 예정)
    // 검색 결과에 OTT 정보 추가 (추후 구현 예정)
}

// CSS 스타일은 ott.css 파일에서 별도 관리

// 전역 OTT 통합 인스턴스
let ottIntegration;

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    ottIntegration = new OTTIntegration();
    // 전역 객체로 등록하여 다른 모듈에서 접근 가능하도록 설정
    window.ottIntegration = ottIntegration;
});

// 다른 모듈에서 사용할 수 있도록 export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OTTIntegration;
} 