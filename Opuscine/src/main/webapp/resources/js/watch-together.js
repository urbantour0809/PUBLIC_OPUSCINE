/**
 * OpusCine Watch Together 모듈
 * 
 * 같이보기 기능을 위한 채팅과 비디오 동기화를 관리합니다.
 */
class WatchTogether {
    constructor() {
        // 기존 속성들
        this.chatSection = document.querySelector('.chat-section');
        this.toggleBtn = document.querySelector('.chat-toggle-btn');
        this.chatInput = document.getElementById('chatInput');
        this.sendButton = document.getElementById('sendMessage');
        this.chatMessages = document.getElementById('chatMessages');
        
        // 새로운 속성들
        this.videoSection = document.querySelector('.video-section');
        this.videoOverlay = document.querySelector('.video-overlay');
        this.fullscreenButton = document.querySelector('.fullscreen-button');
        this.movieId = window.location.pathname.split('/').pop(); // URL에서 영화 ID 추출
        
        this.isCollapsed = false;
        this.isFullscreen = false;
        this.overlayTimeout = null;
        this.currentUser = null;
        
        this.init();
        this.websocket =null;
        this.user;
    }

    /**
     * 트레일러 로드 및 재생
     */
    async loadTrailer() {
        try {
            const service = window.tmdbService || tmdbService;
            const trailer = await service.getMovieTrailer(this.movieId);
            
            if (trailer) {
                const player = document.getElementById('player');
                if (player) {
                    const iframe = document.createElement('iframe');
                    iframe.src = trailer.url;
                    iframe.width = '100%';
                    iframe.height = '100%';
                    iframe.frameBorder = '0';
                    iframe.allowFullscreen = true;
                    
                    player.innerHTML = '';
                    player.appendChild(iframe);
                }
            } else {
                console.warn('트레일러를 찾을 수 없습니다.');
            }
        } catch (error) {
            console.error('트레일러 로드 실패:', error);
        }
    }

    /**
     * 초기화 함수
     * - 이벤트 리스너 설정
     * - 사용자 정보 로드
     * - 채팅 UI 초기화
     */
    async init() {
        this.setupEventListeners();
        await this.loadCurrentUser();
        await this.loadTrailer(); // 트레일러 로드 추가
        this.initializeChatUI();
        this.setupOverlayBehavior();
        this.setupEmojiListeners(); // 이모티콘 리스너 추가
        this.acceptSocketMassage();
        const home =document.querySelector('.home-button');
        home.addEventListener('click',()=>{
            console.log('나가기');
            this.websocket.close();
        });

    }

    /**
     * 이모티콘 클릭 이벤트 설정
     */
    setupEmojiListeners() {
        const emojis = document.querySelectorAll('.emoji');
        emojis.forEach(emoji => {
            emoji.addEventListener('click', () => {
                const emojiChar = emoji.getAttribute('data-emoji');
                this.sendEmoji(emojiChar);
            });
        });
    }

    /**
     * 이모티콘 전송
     */
    sendEmoji(emoji) {
        if (this.currentUser) {
            this.websocket.send(emoji);
            this.addChatMessage({
                user: this.currentUser,
                message: emoji,
                timestamp: new Date()
            });
        } else {
            alert('이모티콘을 전송하려면 로그인이 필요합니다.');
        }
    }

    acceptSocketMassage(){
        this.websocket.addEventListener("message",(event)=>{
            let acceptMassage = event.data.split('_');
            let statue = acceptMassage[0] =='entry'?'입장':'전달';
            if(statue =='입장'){ //배열 길이 3
                console.log('처음들어옴 '+event.data);
                
                // 알림 요소 생성
                const notification = document.createElement('div');
                notification.className = 'chat-notification';
                
                // 관리자 프로필 이미지 설정
                let profile = acceptMassage[2].split("/")[1];
                const adminProfilePath =  `/OpusCine/resources/profiles/${profile}.jpg`;
                
                // 알림 내용 구성
                notification.innerHTML = `
                    <div class="user-avatar">
                        <img src="${adminProfilePath}" alt="관리자">
                    </div>
                    <div class="notification-content">
                        ${event.data.split('_')[1]}
                    </div>
                `;
                
                this.chatSection.appendChild(notification);
                
                setTimeout(() => {
                    if (notification && notification.parentNode) {
                        notification.remove();
                    }
                }, 3000);
            }
            else{ //배열 길이 3
                let time = acceptMassage[1];
                let text = acceptMassage[0];
                let nickNmWithProfile = acceptMassage[2];
                let nick = nickNmWithProfile.split("/")[0];
                let profile = nickNmWithProfile.split("/")[1];
                time = this.formatKoreanTimestamp(time);
                
                const messageElement = document.createElement('div');
                const isMyMessage = nick === this.currentUser.nickNm;
                messageElement.className = `chat-message ${isMyMessage ? 'my-message' : 'other-message'}`;

                // 프로필 이미지 경로 처리
                const profilePath = `/OpusCine/resources/profiles/${profile}.jpg`;
                
                messageElement.innerHTML = `
                    <div class="user-avatar">
                        <img src="${profilePath}" alt="${nick}의 프로필">
                    </div>
                    <div class="message-content">
                        <div class="message-header">
                            <span class="user-name">${nick}</span>
                            <span class="message-time">${time}</span>
                        </div>
                        <p class="message-text">${this.escapeHtml(text)}</p>
                    </div>
                `;

                this.chatMessages.appendChild(messageElement);
                this.scrollToBottom();
            }
        });
    }

    /**
     * 서버 문자열(예: "2025-07-08 13:25")을 한국 시각 기준으로 예쁘게 포맷
     *  └ 같은 날  →  "오전/오후 n시 mm분"      (hour12, ko-KR)
     *  └ 다른 날  →  "YYYY-MM-DD HH:mm"
     */
     formatKoreanTimestamp(str) {
      // 1) 안전하게 파싱 (브라우저마다 "YYYY-MM-DD HH:mm" 직파싱이 불안정)
      const [datePart, timePart] = str.trim().split(' ');
      const [y, m, d]  = datePart.split('-').map(Number);
      const [H, mi]    = timePart.split(':').map(Number);
      const dt         = new Date(y, m - 1, d, H, mi);   // 로컬타임존(서울) 기준

      // 2) 오늘 날짜와 비교
      const today = new Date();
      const sameDay =
        dt.getFullYear() === today.getFullYear() &&
        dt.getMonth()     === today.getMonth() &&
        dt.getDate()      === today.getDate();

      if (sameDay) {
        /* "오후 1시 25분" or "오후 1시" */
        return dt.toLocaleTimeString('ko-KR', {
          hour:   'numeric',
          minute: '2-digit',   // ← 분까지 표시하지 않으려면 이 줄 제거
          hour12: true
        });
      }

      /* "2025-07-08 13:25" 형식(24시간제) */
      const z = (n) => String(n).padStart(2, '0');
      return `${y}-${z(m)}-${z(d)} ${z(H)}:${z(mi)}`;
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 기존 이벤트 리스너들
        this.toggleBtn.addEventListener('click', () => this.toggleChat());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.chatMessages.addEventListener('scroll', () => this.handleScroll());

        // 새로운 이벤트 리스너들
        this.fullscreenButton.addEventListener('click', () => this.toggleFullscreen());
        
        // ESC 키로 전체화면 해제
        document.addEventListener('fullscreenchange', () => {
            this.isFullscreen = !!document.fullscreenElement;
            this.videoSection.classList.toggle('fullscreen', this.isFullscreen);
        });
    }

    /**
     * 오버레이 동작 설정
     */
    setupOverlayBehavior() {
        let lastMouseMove = Date.now();
        
        // 마우스 움직임 감지
        this.videoSection.addEventListener('mousemove', () => {
            lastMouseMove = Date.now();
            this.showOverlay();
        });

        // 주기적으로 마우스 움직임 체크
        setInterval(() => {
            const timeSinceLastMove = Date.now() - lastMouseMove;
            if (timeSinceLastMove > 3000) { // 3초 동안 움직임이 없으면
                this.hideOverlay();
            }
        }, 1000);
    }

    /**
     * 오버레이 표시
     */
    showOverlay() {
        this.videoOverlay.classList.remove('hidden');
    }

    /**
     * 오버레이 숨기기
     */
    hideOverlay() {
        this.videoOverlay.classList.add('hidden');
    }

    /**
     * 전체화면 토글
     */
    async toggleFullscreen() {
        try {
            if (!document.fullscreenElement) {
                await this.videoSection.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (err) {
            console.error('전체화면 전환 중 오류 발생:', err);
        }
    }

    /**
     * 현재 사용자 정보 로드
     */
    async loadCurrentUser() {
        try {
            const response = await fetch('/OpusCine/user/watchTogether', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json','Accept':'application/json'
                }
            });
            if (response.ok) {
                this.currentUser = await response.json();
                console.log(this.currentUser);
                this.websocket = new WebSocket("ws://localhost:8080/OpusCine/watchTogether");
                this.websocket.addEventListener("open",()=>{
                        console.log('연결');
                        this.websocket.send(`entry_${this.currentUser.nickNm}님이 입장하셨습니다.`);
                    });

            } else {
                console.error('사용자 정보를 불러올 수 없습니다.');
            }
        } catch (error) {
            console.error('사용자 정보 로드 실패:', error);
        }
    }

    /**
     * 채팅 UI 초기화
     */
    initializeChatUI() {
        // 예시 메시지 추가
        this.addChatMessage({
            user: {
                nickNm: 'OpusCine',
                profile: 'profile1'
            },
            message: '같이보기 채팅방에 오신 것을 환영합니다! 🎬',
            timestamp: new Date()
        });
    }

    /**
     * 채팅창 토글
     */
    toggleChat() {
        this.isCollapsed = !this.isCollapsed;
        
        // 비디오 섹션과 채팅 섹션 참조
        const videoSection = document.querySelector('.video-section');
        
        // 상태 변경 전 현재 비디오 섹션 크기 로깅
        console.log('Toggle 전 비디오 섹션 크기:', {
            width: videoSection.offsetWidth,
            height: videoSection.offsetHeight
        });

        // 채팅창 상태 변경
        this.chatSection.classList.toggle('collapsed', this.isCollapsed);
        
        // 토글 아이콘 방향 변경
        const toggleIcon = this.toggleBtn.querySelector('.toggle-icon');
        toggleIcon.textContent = this.isCollapsed ? '▶' : '◀';
        
        // 트랜지션 완료 후 비디오 섹션 크기 확인
        setTimeout(() => {
            console.log('Toggle 후 비디오 섹션 크기:', {
                width: videoSection.offsetWidth,
                height: videoSection.offsetHeight
            });
            
            // 비디오 플레이어 리사이즈
            this.handleVideoResize();
        }, 300);
    }

    /**
     * 메시지 전송
     */
    sendMessage() {

        const message = this.chatInput.value.trim();
        this.websocket.send(message);
        if (!message) return;

        if (this.currentUser) {
            this.addChatMessage({
                user: this.currentUser,
                message: message,
                timestamp: new Date()
            });
        } else {
            // 로그인하지 않은 경우
            alert('채팅을 위해 로그인이 필요합니다.');
        }

        this.chatInput.value = '';
    }

    /**
     * 채팅 메시지 추가
     */
    addChatMessage({ user, message, timestamp }) {
        const messageElement = document.createElement('div');
        const isMyMessage = user.nickNm === this.currentUser.nickNm;
        
        messageElement.className = `chat-message ${isMyMessage ? 'my-message' : 'other-message'}`;

        // 프로필 이미지 경로 처리
        const profilePath = '/OpusCine/resources/profiles/'+user.profile+'.jpg';
        
        messageElement.innerHTML = `
            <div class="user-avatar">
                <img src="${profilePath}" alt="${user.nickNm}의 프로필">
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="user-name">${user.nickNm}</span>
                    <span class="message-time">${this.formatTime(timestamp)}</span>
                </div>
                <p class="message-text">${this.escapeHtml(message)}</p>
            </div>
        `;

        this.chatMessages.appendChild(messageElement);
        this.scrollToBottom();
    }

    /**
     * 채팅창 스크롤 처리
     */
    handleScroll() {
        // 스크롤이 맨 위에 도달하면 이전 메시지 로드
        if (this.chatMessages.scrollTop === 0) {
            this.loadPreviousMessages();
        }
    }

    /**
     * 이전 메시지 로드
     */
    loadPreviousMessages() {
        // TODO: 이전 메시지 로드 로직 구현
    }

    /**
     * 채팅창 맨 아래로 스크롤
     */
    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    /**
     * 시간 포맷팅
     */
    formatTime(date) {
        return new Intl.DateTimeFormat('ko-KR', {
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    /**
     * HTML 이스케이프
     */
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /**
     * 비디오 플레이어 리사이즈 처리
     */
    handleVideoResize() {
        const videoSection = document.querySelector('.video-section');
        const videoContainer = document.querySelector('.video-container');
        
        // 비디오 컨테이너 크기 조정
        if (videoContainer) {
            videoContainer.style.width = '100%';
            videoContainer.style.height = '100%';
        }

        // 플레이어 리사이즈
        if (window.player && typeof window.player.resize === 'function') {
            window.player.resize();
        }
        
        // 일반 비디오 요소 리사이즈
        const videoElement = document.querySelector('#player video');
        if (videoElement) {
            videoElement.style.width = '100%';
            videoElement.style.height = '100%';
            const event = new Event('resize');
            videoElement.dispatchEvent(event);
        }

        // 최종 크기 확인
        console.log('최종 비디오 섹션 크기:', {
            sectionWidth: videoSection.offsetWidth,
            sectionHeight: videoSection.offsetHeight,
            containerWidth: videoContainer?.offsetWidth,
            containerHeight: videoContainer?.offsetHeight,
            playerWidth: videoElement?.offsetWidth,
            playerHeight: videoElement?.offsetHeight
        });
    }
}

// 인스턴스 생성
document.addEventListener('DOMContentLoaded', () => {
    window.watchTogether = new WatchTogether();
}); 