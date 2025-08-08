<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="sec" uri="http://www.springframework.org/security/tags" %>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI 추천 - OpusCine</title>
    <link rel="icon" type="image/x-icon" href="<c:url value='/resources/src/images/favicon.ico'/>">
    <link rel="stylesheet" href="<c:url value='/resources/css/base.css'/>">
    <link rel="stylesheet" href="<c:url value='/resources/css/layout.css'/>">
    <link rel="stylesheet" href="<c:url value='/resources/css/components.css'/>">
    <link rel="stylesheet" href="<c:url value='/resources/css/ott.css'/>">

    <style>
        .progress-bar {
          width: 100%;
          height: 6px;
          background: #eee;
          border-radius: 4px;
          margin-top: 4px;
          pointer-events: none;
          transition: all 0.3s ease-out;
        }
        .progress-fill {
          height: 100%;
          background: #f04747;
          border-radius: 4px;
          width: 0%;
          transition: width 0.3s ease;
        }
        .modalProgress-fill {
            height: 100%;
            background: #f04747;
            border-radius: 4px;
            width: 0%;
            transition: width 0.3s ease;
          }
        
          /* 시청기록 바 방향성 스타일 */
          .progress-bar.expand-right .progress-fill {
              transform-origin: left;
              border-radius: 4px 4px 4px 4px;
          }
          
          .progress-bar.expand-left .progress-fill {
              transform-origin: right;
              border-radius: 4px 4px 4px 4px;
              background: linear-gradient(to left, #f04747, #ff6b6b);
          }
          
          .progress-bar.expand-center .progress-fill {
              transform-origin: center;
              border-radius: 4px;
              background: linear-gradient(to right, #ff6b6b, #f04747, #ff6b6b);
          }
          
          /* 호버 상태에서 시청기록 바 확장 */
          .progress-bar.hovering-right {
              width: 747px; /* backdrop 이미지 안전 영역에 맞춤 */
              transform: translateX(0px); /* 오른쪽 펼침 시 더 안쪽으로 이동 */
              z-index: 21;
              position: relative;
          }
          
          .progress-bar.hovering-left {
              width: 747px; /* backdrop 이미지 안전 영역에 맞춤 */
              transform: translateX(-280px); /* 왼쪽 펼침 시 backdrop 안전 영역 내 정렬 (유지) */
              z-index: 21;
              position: relative;
          }
          
          .progress-bar.hovering-center {
              width: 747px; /* backdrop 이미지 안전 영역에 맞춤 */
              transform: translateX(-100px); /* 중앙 펼침 시 더 왼쪽으로 이동하여 안전 영역 확보 */
              z-index: 21;
              position: relative;
          }
      </style>
      
</head>
<body>
    <!-- 네비게이션 -->
    <nav class="navbar">
        <div class="nav-container">
            <div class="nav-left">
                <div class="logo">OPUSCINE</div>
                <ul class="nav-menu">
                    <li><a href="<c:url value='/'/>" class="nav-link">홈</a></li>
                    <li><a href="<c:url value='/ai-recommendations'/>" class="nav-link active">AI 추천</a></li>
                    <li><a href="<c:url value='/movies'/>" class="nav-link">영화</a></li>
                    <li><a href="<c:url value='/trending'/>" class="nav-link">트렌딩</a></li>
                    <li><a href="<c:url value='/user/my-list'/>" class="nav-link">내가 찜한 콘텐츠</a></li>
                </ul>
            </div>
            <div class="nav-right">
                <div class="search-icon">🔍</div>
                <div class="notifications">🔔</div>
                
                <sec:authorize access="isAuthenticated()">
                    <%-- 로그인 된 상태 --%>
                    <div class="user-menu">
                        <div class="user-dropdown">
                            <c:choose>
                                <c:when test="${not empty provider}">
                                <img src="${provider}"
                                     alt="Profile" class="user-profile-img">
                                </c:when>
                                <c:otherwise>
                                <img src="<c:url value='/resources/profiles/${img}.jpg'/>"
                                     alt="Profile" class="user-profile-img">
                                </c:otherwise>
                            </c:choose>
                            <div class="user-dropdown-content" id="userDropdown">
                                <a href="<c:url value='/user/profile'/>">프로필 설정</a>
                                <a href="<c:url value='/logout'/>">로그아웃</a>
                            </div>
                        </div>
                    </div>
                </sec:authorize>
                <sec:authorize access="isAnonymous()">
                    <%-- 로그인 되지 않은 상태 --%>
                    <div class="auth-links">
                        <a href="<c:url value='/login'/>" class="login-link">로그인</a>
                        <a href="<c:url value='/signup'/>" class="signup-link">회원가입</a>
                    </div>
                </sec:authorize>

            </div>
        </div>
    </nav>

    <!-- 페이지 헤더 -->
    <section class="page-header">
        <div class="page-header-content">
            <h1 class="page-title">🤖 AI 추천</h1>
            <p class="page-subtitle">당신의 취향을 분석하여 맞춤형 콘텐츠를 추천해드립니다</p>
        </div>
    </section>

    <!-- 메인 콘텐츠 -->
    <main class="main-content">
        <!-- AI 추천 알고리즘 설명 / 채팅 섹션 -->
        <section class="ai-info-section" id="ai-info-section">
            <!-- 초기 설명 화면 -->
            <div class="ai-info-card" id="ai-info-card">
                <div class="ai-info-content">
                    <h2>🧠 AI 추천 시스템</h2>
                    <p>OpusCine의 AI는 다음 요소들을 분석하여 개인화된 추천을 제공합니다:</p>
                    <ul class="ai-features">
                        <li>시청 기록 및 평점 패턴</li>
                        <li>선호 장르 및 감독</li>
                        <li>시청 시간대 및 빈도</li>
                        <li>유사한 취향의 사용자 데이터</li>
                    </ul>
                </div>
                <div class="ai-info-visual">
                    <div class="ai-brain">🤖</div>
                </div>
            </div>
            
            <!-- 채팅 입력창 (초기 상태) -->
            <div class="chat-input-section" id="chat-input-section">
                <div class="chat-input-container">
                    <input type="text" id="chat-input" placeholder="어떤 영화를 찾고 계신가요? (예: 마블 영화 추천해줘)" maxlength="500">
                    <button class="chat-send-btn" id="chat-send-btn">
                        <span class="send-icon">➤</span>
                    </button>
                </div>
            </div>
            
            <!-- 채팅 대화창 (숨김 상태) -->
            <div class="chat-conversation" id="chat-conversation" style="display: none;">
                <div class="chat-messages" id="chat-messages">
                    <!-- 대화 메시지들이 여기에 추가됩니다 -->
                </div>
                <div class="chat-input-container">
                    <input type="text" id="chat-input-conversation" placeholder="메시지를 입력하세요..." maxlength="500">
                    <button class="chat-send-btn" id="chat-send-btn-conversation">
                        <span class="send-icon">➤</span>
                    </button>
                </div>
            </div>
        </section>

        <!-- 개인화 추천 섹션들 -->
        <section class="content-row">
            <h2 class="row-title">당신을 위한 맞춤 추천</h2>
            <div class="movie-slider">
                <button class="slider-arrow slider-arrow-left" data-direction="left">❮</button>
                <div class="movie-list" id="personalized-recommendations">
                    <!-- JavaScript로 동적 생성 -->
                </div>
                <button class="slider-arrow slider-arrow-right" data-direction="right">❯</button>
            </div>
        </section>

        <section class="content-row">
            <h2 class="row-title">별점이 높은 작품</h2>
            <div class="movie-slider">
                <button class="slider-arrow slider-arrow-left" data-direction="left">❮</button>
                <div class="movie-list" id="similar-users-picks">
                    <!-- JavaScript로 동적 생성 -->
                </div>
                <button class="slider-arrow slider-arrow-right" data-direction="right">❯</button>
            </div>
        </section>

        <!-- AI 추천 통계 -->
        <section class="ai-stats-section">
            <h2 class="section-title">📊 추천 정확도</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">94%</div>
                    <div class="stat-label">추천 만족도</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">1,247</div>
                    <div class="stat-label">분석된 영화</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">89%</div>
                    <div class="stat-label">시청 완료율</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">4.7★</div>
                    <div class="stat-label">평균 평점</div>
                </div>
            </div>
        </section>
    </main>

    <!-- 검색 모달 -->
    <div id="search-modal" class="search-modal">
        <div class="search-modal-content">
            <div class="search-header">
                <div class="search-input-container">
                    <input type="text" id="search-input" placeholder="제목, 장르, 배우를 검색해보세요" autocomplete="off">
                    <button class="search-close" id="search-close">✕</button>
                </div>
            </div>
            <div class="search-results" id="search-results">
                <div class="search-suggestions">
                    <h3>인기 검색어</h3>
                    <div class="suggestion-tags">
                        <span class="suggestion-tag">진격의 거인</span>
                        <span class="suggestion-tag">스파이더맨</span>
                        <span class="suggestion-tag">어벤져스</span>
                        <span class="suggestion-tag">기생충</span>
                        <span class="suggestion-tag">오징어 게임</span>
                        <span class="suggestion-tag">스트레인저 띵스</span>
                    </div>
                </div>
                <div class="search-content" id="search-content" style="display: none;">
                    <div class="search-results-grid" id="search-results-grid">
                        <!-- 검색 결과가 여기에 표시됩니다 -->
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 영화 상세 모달 -->
    <div id="movie-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
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
                                <button class="btn btn-watch-together modal-btn watch-together-button">👥 같이보기</button>
                                <button class="btn btn-wishlist modal-btn wishlist-button" data-id="">+ 찜하기</button>
                                <button class="btn btn-like modal-btn like-box-btn" data-id="">👍</button>
                                <button class="btn btn-dislike modal-btn dislike-box-btn" data-id="">👎</button>
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
            </div>
        </div>
    </div>

    <!-- 푸터 -->
    <footer class="footer">
        <div class="footer-content">
            <div class="footer-links">
                <div class="footer-column">
                    <a href="#">API 문서</a>
                    <a href="#">개발자 가이드</a>
                    <a href="#">개인정보 처리방침</a>
                    <a href="#">고객 센터</a>
                </div>
                <div class="footer-column">
                    <a href="#">TMDB API</a>
                    <a href="#">AI 모델 정보</a>
                    <a href="#">법적 고지</a>
                    <a href="#">계정</a>
                </div>
                <div class="footer-column">
                    <a href="#">지원 디바이스</a>
                    <a href="#">채용 정보</a>
                    <a href="#">쿠키 설정</a>
                    <a href="#">성능 테스트</a>
                </div>
                <div class="footer-column">
                    <a href="#">이용 약관</a>
                    <a href="#">오픈소스</a>
                    <a href="#">회사 정보</a>
                    <a href="#">문의하기</a>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2024 OpusCine. Powered by TMDB API & AI Technology.</p>
            </div>
        </div>
    </footer>

    <!-- 기본 라이브러리 -->
    <script src="<c:url value='/resources/js/api.js'/>"></script>
    <script src="<c:url value='/resources/js/ui.js'/>"></script>
    <script src="<c:url value='/resources/js/ott-integration.js'/>"></script>
    <script src="<c:url value='/resources/js/ai-recommendations.js'/>"></script>
</body>
</html> 