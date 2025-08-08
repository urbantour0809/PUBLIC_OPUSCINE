<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="sec" uri="http://www.springframework.org/security/tags" %>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>내가 찜한 콘텐츠 - OpusCine</title>
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
    <!-- 네비게이션 바 -->
    <nav class="navbar">
        <div class="nav-container">
            <div class="nav-left">
                <div class="logo">OPUSCINE</div>
                <ul class="nav-menu">
                    <li><a href="<c:url value='/'/>" class="nav-link">홈</a></li>
                    <li><a href="<c:url value='/ai-recommendations'/>" class="nav-link">AI 추천</a></li>
                    <li><a href="<c:url value='/movies'/>" class="nav-link">영화</a></li>
                    <li><a href="<c:url value='/trending'/>" class="nav-link">트렌딩</a></li>
                    <li><a href="<c:url value='/my-list'/>" class="nav-link active">내가 찜한 콘텐츠</a></li>
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
            <h1 class="page-title">💖 내가 찜한 콘텐츠</h1>
            <p class="page-subtitle">나중에 볼 영화와 TV 시리즈를 관리하세요</p>
        </div>
    </section>

    <!-- 찜 목록 필터 -->
    <section class="wishlist-filter-section">
        <div class="wishlist-filter-container">
            <div class="filter-options">
                <button class="filter-option active" data-filter="all">전체 (<span id="total-count">0</span>)</button>
                <button class="filter-option" data-filter="movie">영화 (<span id="movie-count">0</span>)</button>
                <button class="filter-option" data-filter="tv">TV 시리즈 (<span id="tv-count">0</span>)</button>
                <button class="filter-option" data-filter="watched">시청 완료 (<span id="watched-count">0</span>)</button>
            </div>
            <div class="sort-options">
                <select id="sort-wishlist">
                    <option value="added_date">추가한 날짜순</option>
                    <option value="title">제목순</option>
                    <option value="rating">평점순</option>
                    <option value="release_date">출시일순</option>
                </select>
            </div>
        </div>
    </section>

    <!-- 메인 콘텐츠 -->
    <main class="main-content">
        <!-- 빈 상태 -->
        <section class="empty-state" id="empty-state" style="display: none;">
            <div class="empty-state-content">
                <div class="empty-icon">📝</div>
                <h2>아직 찜한 콘텐츠가 없습니다</h2>
                <p>마음에 드는 영화나 TV 시리즈를 찜해보세요!</p>
                <a href="<c:url value='/'/>" class="btn btn-primary">콘텐츠 둘러보기</a>
            </div>
        </section>

        <!-- 찜한 콘텐츠 목록 -->
        <section class="wishlist-content" id="wishlist-content">
            <!-- 최근 추가된 콘텐츠 -->
            <section class="content-row">
                <h2 class="row-title">🆕 최근 추가</h2>
                <div class="movie-slider">
                    <button class="slider-arrow slider-arrow-left" data-direction="left">❮</button>
                    <div class="movie-list" id="recently-added">
                        <!-- JavaScript로 동적 생성 -->
                    </div>
                    <button class="slider-arrow slider-arrow-right" data-direction="right">❯</button>
                </div>
            </section>

            <!-- 찜한 영화 -->
            <section class="content-row">
                <h2 class="row-title">🎬 찜한 영화</h2>
                <div class="movie-slider">
                    <button class="slider-arrow slider-arrow-left" data-direction="left">❮</button>
                    <div class="movie-list" id="wishlist-movies">
                        <!-- JavaScript로 동적 생성 -->
                    </div>
                    <button class="slider-arrow slider-arrow-right" data-direction="right">❯</button>
                </div>
            </section>

            <!-- 찜한 TV 시리즈 -->
            <section class="content-row">
                <h2 class="row-title">📺 찜한 TV 시리즈</h2>
                <div class="movie-slider">
                    <button class="slider-arrow slider-arrow-left" data-direction="left">❮</button>
                    <div class="movie-list" id="wishlist-tv">
                        <!-- JavaScript로 동적 생성 -->
                    </div>
                    <button class="slider-arrow slider-arrow-right" data-direction="right">❯</button>
                </div>
            </section>



            <!-- 전체 목록 그리드 -->
            <section class="wishlist-grid-section">
                <div class="grid-header">
                    <h2 class="section-title">📋 전체 목록</h2>
                    <div class="grid-controls">
                        <button class="view-toggle active" data-view="grid">⊞</button>
                        <button class="view-toggle" data-view="list">☰</button>
                    </div>
                </div>
                <div class="wishlist-grid" id="wishlist-grid">
                    <!-- JavaScript로 동적 생성 -->
                </div>
            </section>
        </section>

        <!-- 추천 콘텐츠 -->
        <section class="content-row">
            <h2 class="row-title">💡 이런 콘텐츠는 어떠세요?</h2>
            <div class="movie-slider">
                <button class="slider-arrow slider-arrow-left" data-direction="left">❮</button>
                <div class="movie-list" id="recommended-content">
                    <!-- JavaScript로 동적 생성 -->
                </div>
                <button class="slider-arrow slider-arrow-right" data-direction="right">❯</button>
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
                            <button class="btn btn-play modal-btn">▶ 재생</button>
                            <button class="btn btn-watch-together modal-btn watch-together-button" onclick="window.location.href='/OpusCine/watch-together'">👥 같이보기</button>
                            <button class="btn btn-wishlist modal-btn wishlist-button">+ 찜하기</button>
                            <button class="btn btn-like modal-btn">👍</button>
                            <button class="btn btn-dislike modal-btn">👎</button>
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

    <script src="<c:url value='/resources/js/api.js'/>"></script>
    <script src="<c:url value='/resources/js/ui.js'/>"></script>
    <script src="<c:url value='/resources/js/my-list.js'/>"></script>
</body>
</html> 