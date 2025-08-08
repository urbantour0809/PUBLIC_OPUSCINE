<%@ page language="java" contentType="text/html; charset=UTF-8"
    pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MusicMood</title>
<link rel="icon" type="image/x-icon" href="${pageContext.request.contextPath}/static/assets/images/favicon.ico">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link
	href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
	rel="stylesheet">
<link rel="stylesheet" href="${pageContext.request.contextPath}/static/css/style.css?v=1.1">
<link rel="stylesheet" href="${pageContext.request.contextPath}/static/css/animation.css?v=1.1">
<link rel="stylesheet" href="${pageContext.request.contextPath}/static/css/vibe-intro.css?v=1.0">
<link rel="stylesheet" href="${pageContext.request.contextPath}/static/css/search.css?v=1.2">
</head>
<body class="theme-default">

	<header class="header">
		<nav class="nav-container">
			<a href="${pageContext.request.contextPath}/index.do" class="logo">MusicMood</a>
			<div class="nav-links">
				<a href="${pageContext.request.contextPath}/index.do" class="active">홈</a> 
				<a href="${pageContext.request.contextPath}/chart.do">차트</a> 
				<a href="${pageContext.request.contextPath}/playlist.do">플레이리스트</a>
				<a href="#">최신음악</a>
			</div>
			<div class="auth-section">
				<div class="search-container">
					<form class="search-form" autocomplete="off" onsubmit="return false;">
						<input type="text" id="searchInput" class="search-input" placeholder="가수 또는 곡 검색...">
						<button id="searchBtn" class="icon-btn" type="button">🔍</button>
					</form>
				</div>
				<%-- 로그인 상태에 따라 다른 UI 표시 --%>
				<% if(session.getAttribute("user") != null) { 
					// 로그인 된 상태
					dto.UserDTO user = (dto.UserDTO)session.getAttribute("user");
				%>
					<div class="user-menu">
						<span class="user-greeting"><%= user.getName() %></span>
						<div class="user-dropdown">
							<button class="user-dropdown-btn">▼</button>
							<div class="user-dropdown-content">
								<a href="${pageContext.request.contextPath}/playlist.do?action=liked">내 플레이리스트</a>
								<a href="${pageContext.request.contextPath}/profile.do">프로필 설정</a>
								<a href="${pageContext.request.contextPath}/auth/login.do?action=logout">로그아웃</a>
							</div>
						</div>
					</div>
				<% } else { %>
					<%-- 로그인 되지 않은 상태 --%>
					<a href="${pageContext.request.contextPath}/auth/login.do" class="login-btn">로그인</a>
				<% } %>
			</div>
		</nav>
	</header>

	<main>
		<section class="hero-section">
			<div class="hero-slider">
				<div class="slide"
					style="background-image: url('${pageContext.request.contextPath}/static/assets/images/1.png')"></div>
				<div class="slide"
					style="background-image: url('${pageContext.request.contextPath}/static/assets/images/2.png')"></div>
				<div class="slide"
					style="background-image: url('${pageContext.request.contextPath}/static/assets/images/3.png')"></div>
				<div class="slide"
					style="background-image: url('${pageContext.request.contextPath}/static/assets/images/4.png')"></div>
			</div>
			<div class="hero-content">
				<h2>
					당신의 무드에 맞는<br>완벽한 음악을 찾아보세요
				</h2>
				<p>AI가 추천하는 맞춤형 플레이리스트</p>
				<% if(session.getAttribute("user") != null) { %>
				<a href="${pageContext.request.contextPath}/playlist.do" class="cta-button"> <span>나만의 플레이리스트
						만들기</span>
				</a>
				<% } else { %>
				<a href="${pageContext.request.contextPath}/auth/login.do" class="cta-button"> <span>나만의 플레이리스트
						만들기</span>
				</a>
				<% } %>
			</div>
		</section>

		<!-- 무드 섹션을 MusicMood 스타일의 서비스 소개로 변경 -->
		<section class="service-intro-section scroll-animated">
			<div class="intro-text-container">
				<h2 class="intro-heading">
					<span class="gradient-text">기존에 없던,</span><br>
					<span class="gradient-text">새로운 오디오 경험</span>
				</h2>
			</div>

			<div class="audio-features-container">
				<div class="feature-card">
					<div class="feature-icon">🎵</div>
					<h3 class="feature-title">무제한 음악</h3>
					<p class="feature-desc">취향에 맞는 다양한 장르의<br>음악을 무제한으로 즐기세요</p>
				</div>
				<div class="feature-card">
					<div class="feature-icon">🎧</div>
					<h3 class="feature-title">오디오북</h3>
					<p class="feature-desc">아티스트의 보이스로 하루를<br>마무리하는 오디오북</p>
				</div>
				<div class="feature-card">
					<div class="feature-icon">🎤</div>
					<h3 class="feature-title">파티룸</h3>
					<p class="feature-desc">친구들과 함께 음악을 즐기고<br>대화하는 공간</p>
				</div>
				<div class="feature-card">
					<div class="feature-icon">🎬</div>
					<h3 class="feature-title">오디오 무비</h3>
					<p class="feature-desc">눈을 감고 귀로 보는 새로운<br>감각의 오디오 컨텐츠</p>
				</div>
			</div>
		</section>

		<!-- 플레이리스트 슬라이더 섹션 -->
		<section class="playlist-section scroll-animated">
			<div class="section-header">
				<h2 class="section-title">내 취향에 딱 맞는<br>오디오까지 만나보세요</h2>
			</div>

			<div class="playlist-category">
				<h3 class="category-title">MusicMood 추천 플레이리스트</h3>
				<div class="playlist-slider-container">
					<button class="slider-control prev">
						<svg viewBox="0 0 24 24" width="24" height="24" fill="none">
							<path d="M15 18l-6-6 6-6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
					</button>
					<div class="playlist-slider">
						<div class="playlist-card">
							<div class="playlist-thumbnail">
								<img src="${pageContext.request.contextPath}/static/assets/images/playlist-placeholder.png" alt="플레이리스트">
								<div class="play-overlay">
									<button class="play-btn">▶</button>
								</div>
							</div>
							<div class="playlist-info">
								<h4 class="playlist-title">드라이브 플레이리스트</h4>
								<p class="playlist-creator">MusicMood DRIVE</p>
							</div>
						</div>
						<div class="playlist-card">
							<div class="playlist-thumbnail">
								<img src="${pageContext.request.contextPath}/static/assets/images/playlist-placeholder.png" alt="플레이리스트">
								<div class="play-overlay">
									<button class="play-btn">▶</button>
								</div>
							</div>
							<div class="playlist-info">
								<h4 class="playlist-title">잔잔한 플레이리스트</h4>
								<p class="playlist-creator">MusicMood Calm</p>
							</div>
						</div>
						<div class="playlist-card">
							<div class="playlist-thumbnail">
								<img src="${pageContext.request.contextPath}/static/assets/images/playlist-placeholder.png" alt="플레이리스트">
								<div class="play-overlay">
									<button class="play-btn">▶</button>
								</div>
							</div>
							<div class="playlist-info">
								<h4 class="playlist-title">파티 + 클럽 플레이리스트</h4>
								<p class="playlist-creator">MusicMood Party</p>
							</div>
						</div>
						<div class="playlist-card">
							<div class="playlist-thumbnail">
								<img src="${pageContext.request.contextPath}/static/assets/images/playlist-placeholder.png" alt="플레이리스트">
								<div class="play-overlay">
									<button class="play-btn">▶</button>
								</div>
							</div>
							<div class="playlist-info">
								<h4 class="playlist-title">수고했어, 오늘도</h4>
								<p class="playlist-creator">MusicMood Care</p>
							</div>
						</div>
						<div class="playlist-card">
							<div class="playlist-thumbnail">
								<img src="${pageContext.request.contextPath}/static/assets/images/playlist-placeholder.png" alt="플레이리스트">
								<div class="play-overlay">
									<button class="play-btn">▶</button>
								</div>
							</div>
							<div class="playlist-info">
								<h4 class="playlist-title">Summer Hit Kpop</h4>
								<p class="playlist-creator">MusicMood K-Pop</p>
							</div>
						</div>
						<div class="playlist-card">
							<div class="playlist-thumbnail">
								<img src="${pageContext.request.contextPath}/static/assets/images/playlist-placeholder.png" alt="플레이리스트">
								<div class="play-overlay">
									<button class="play-btn">▶</button>
								</div>
							</div>
							<div class="playlist-info">
								<h4 class="playlist-title">Mega Hit Remix</h4>
								<p class="playlist-creator">MusicMood Rap</p>
							</div>
						</div>
						<div class="playlist-card">
							<div class="playlist-thumbnail">
								<img src="${pageContext.request.contextPath}/static/assets/images/playlist-placeholder.png" alt="플레이리스트">
								<div class="play-overlay">
									<button class="play-btn">▶</button>
								</div>
							</div>
							<div class="playlist-info">
								<h4 class="playlist-title">2000년대 사랑노래</h4>
								<p class="playlist-creator">MusicMood BALLAD</p>
							</div>
						</div>
						<div class="playlist-card">
							<div class="playlist-thumbnail">
								<img src="${pageContext.request.contextPath}/static/assets/images/playlist-placeholder.png" alt="플레이리스트">
								<div class="play-overlay">
									<button class="play-btn">▶</button>
								</div>
							</div>
							<div class="playlist-info">
								<h4 class="playlist-title">Workplace Kpop</h4>
								<p class="playlist-creator">workplace kpop</p>
							</div>
						</div>
					</div>
					<button class="slider-control next">
						<svg viewBox="0 0 24 24" width="24" height="24" fill="none">
							<path d="M9 6l6 6-6 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
					</button>
				</div>
			</div>

			<!-- 무한대 모양 이퀄라이저 효과 섹션 -->
			<div class="infinity-equalizer-section scroll-animated">
				<div class="infinity-container">
					<div class="infinity-visualizer">
						<!-- 무한대 모양 SVG와 이퀄라이저 효과는 CSS로 구현 -->
						<div class="infinity-shape"></div>
						<div class="equalizer-bars left">
							<div class="eq-bar"></div>
							<div class="eq-bar"></div>
							<div class="eq-bar"></div>
							<div class="eq-bar"></div>
							<div class="eq-bar"></div>
							<div class="eq-bar"></div>
							<div class="eq-bar"></div>
							<div class="eq-bar"></div>
						</div>
						<div class="equalizer-bars right">
							<div class="eq-bar"></div>
							<div class="eq-bar"></div>
							<div class="eq-bar"></div>
							<div class="eq-bar"></div>
							<div class="eq-bar"></div>
							<div class="eq-bar"></div>
							<div class="eq-bar"></div>
							<div class="eq-bar"></div>
						</div>
					</div>
					<div class="infinity-text">
						<div class="left-text">현재 무드의 따라<br>즐기고 싶은 음악,</div>
						<div class="right-text">MusicMood에서<br>지금 들어보세요.</div>
					</div>
				</div>
			</div>
		</section>
	</main>

	<!-- 새로운 검색 결과 컨테이너 (body 직전에 배치) -->
	<!-- <div id="searchResultsFixed"></div> -->

	<script>
		// contextPath 설정 - 현재 시스템 경로 확인
		const contextPath = '${pageContext.request.contextPath}';
		console.log('JSP에서 설정된 contextPath:', contextPath);
		
		// localStorage에도 저장하여 다른 페이지에서도 사용할 수 있게 함
		if (contextPath) {
			localStorage.setItem('appContextPath', contextPath);
		}

		// 모든 플레이리스트 이미지에 에러 핸들러 추가
		function addImageErrorHandlers() {
			const thumbnailImages = document.querySelectorAll('.playlist-thumbnail img');
			thumbnailImages.forEach(img => {
				img.onerror = function() {
					// 에러 발생 시 기본 이미지로 교체
					this.src = `${contextPath}/static/assets/images/playlist-placeholder.png`;
					// 에러 이벤트 재발생 방지
					this.onerror = null;
				};
			});
		}

		// 초기화 함수에 에러 핸들러 추가
		async function init() {
			try {
				addImageErrorHandlers(); // 추가된 부분
				initUserMenu();
				highlightCurrentNavLink();
				// ... 기존 코드 계속
			} catch (error) {
				console.error('Initialization error:', error);
			}
		}
	</script>
	<script src="${pageContext.request.contextPath}/static/js/search.js?v=1.1"></script>
	<script src="${pageContext.request.contextPath}/static/js/main.js?v=1.1"></script>
</body>
</html>