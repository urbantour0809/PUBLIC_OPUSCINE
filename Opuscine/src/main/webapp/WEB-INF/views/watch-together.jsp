<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OpusCine - 같이보기</title>
    
    <!-- 기존 CSS -->
    <link rel="stylesheet" href="<c:url value='/resources/css/base.css'/>">
    <link rel="stylesheet" href="<c:url value='/resources/css/layout.css'/>">
    <link rel="stylesheet" href="<c:url value='/resources/css/components.css'/>">
    
    <!-- 같이보기 전용 CSS -->
    <link rel="stylesheet" href="<c:url value='/resources/css/watch-together.css'/>">
</head>
<body>
    <div class="watch-together-container">
        <!-- 비디오 영역 -->
        <div class="video-section">
            <!-- 비디오 오버레이 컨트롤 -->
            <div class="video-overlay">
                <!-- 상단 컨트롤 -->
                <div class="top-controls">
                    <a href="/OpusCine" class="home-button">
                        <svg width="24" height="24" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                        </svg>
                        홈으로
                    </a>
                </div>
                
                <!-- 하단 컨트롤 -->
                <div class="bottom-controls">
                    <button class="fullscreen-button">
                        <svg width="24" height="24" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                        </svg>
                    </button>
                </div>
            </div>
            
            <div class="video-container">
                <div id="player"></div>
            </div>
        </div>

        <!-- 채팅 영역 -->
        <div class="chat-section">
            <div class="chat-container">
                <!-- 채팅 헤더 -->
                <div class="chat-header">
                    <h2>실시간 채팅</h2>
                </div>

                <!-- 채팅 메시지 영역 -->
                <div class="chat-messages" id="chatMessages">
                    <!-- 메시지들이 여기에 동적으로 추가됨 -->
                </div>

                <!-- 이모티콘 영역 추가 -->
                <div class="emoji-section">
                    <div class="emoji-list">
                        <span class="emoji" data-emoji="😊">😊</span>
                        <span class="emoji" data-emoji="😂">😂</span>
                        <span class="emoji" data-emoji="😍">😍</span>
                        <span class="emoji" data-emoji="😒">😒</span>
                        <span class="emoji" data-emoji="😜">😜</span>
                        <span class="emoji" data-emoji="😎">😎</span>
                    </div>
                </div>

                <!-- 채팅 입력 영역 -->
                <div class="chat-input-area">
                    <input type="text" id="chatInput" placeholder="메시지를 입력하세요...">
                    <button id="sendMessage">전송</button>
                </div>
            </div>
        </div>

        <!-- 채팅 토글 버튼 (채팅 섹션 밖으로 이동) -->
        <button class="chat-toggle-btn">
            <span class="toggle-icon">◀</span>
        </button>
    </div>

    <!-- 기존 JS -->
    <script src="<c:url value='/resources/js/api.js'/>"></script>
    <!-- TMDB 서비스 초기화 -->
    <script>
        // TMDB 서비스 초기화
        const tmdbService = new TMDBService({
            apiKey: 'f1a5550f3ed3cb8e8fa39613b82a2fb2',
            language: 'ko-KR'
        });
    </script>
    <!-- 같이보기 전용 JS -->
    <script src="<c:url value='/resources/js/watch-together.js'/>"></script>
</body>
</html>
