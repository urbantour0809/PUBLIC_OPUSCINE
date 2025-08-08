<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="sec" uri="http://www.springframework.org/security/tags" %>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>프로필 설정 - OpusCine</title>
    <link rel="icon" type="image/x-icon" href="<c:url value='/resources/src/images/favicon.ico'/>">
    <link rel="stylesheet" href="<c:url value='/resources/css/base.css'/>">
    <link rel="stylesheet" href="<c:url value='/resources/css/layout.css'/>">
    <link rel="stylesheet" href="<c:url value='/resources/css/components.css'/>">
    <link rel="stylesheet" href="<c:url value='/resources/css/profile.css'/>">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
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
                    <li><a href="<c:url value='/user/my-list'/>" class="nav-link">내가 찜한 콘텐츠</a></li>
                </ul>
            </div>
            <div class="nav-right">
                <div class="search-icon">🔍</div>
                <div class="notifications">🔔</div>

                <sec:authorize access="isAuthenticated()">
                    <div class="user-menu">
                        <div class="user-dropdown">
                        <c:choose>
                            <c:when test="${not empty profile.provider}">
                                <img src="${profile.imgNm}"alt="Profile" class="user-profile-img">
                            </c:when>
                            <c:otherwise>
                            <img src="<c:url value='/resources/profiles/${profile.imgNm}.jpg'/>"
                                                             alt="Profile" class="user-profile-img">
                            </c:otherwise>
                        </c:choose>

                            <div class="user-dropdown-content" id="userDropdown">
                                <a href="<c:url value='/user/profile'/>" class="active">프로필 설정</a>
                                <a href="<c:url value='/logout'/>">로그아웃</a>
                            </div>
                        </div>
                    </div>
                </sec:authorize>
                <sec:authorize access="isAnonymous()">
                    <div class="auth-links">
                        <a href="<c:url value='/login'/>" class="login-link">로그인</a>
                        <a href="<c:url value='/signup'/>" class="signup-link">회원가입</a>
                    </div>
                </sec:authorize>
            </div>
        </div>
    </nav>

    <!-- 프로필 설정 메인 컨테이너 -->
    <div class="profile-container">
        <!-- 헤더 -->
        <div class="profile-header">
            <h1>프로필 설정</h1>
            <p>계정 정보를 관리하고 개인 설정을 변경할 수 있습니다.</p>
        </div>

        <!-- 메시지 표시 영역 -->
        <div id="message" class="message"></div>

        <!-- 프로필 컨텐츠 -->
        <div class="profile-content">
            <!-- 프로필 사이드바 -->
            <div class="profile-sidebar">
                <div class="current-profile">
                <c:choose>
                    <c:when test="${not empty profile.provider}">
                    <img id="current-profile-img" src="${profile.imgNm}"
                                             alt="현재 프로필" class="current-profile-image">
                    </c:when>
                    <c:otherwise>
                    <img id="current-profile-img" src="<c:url value='/resources/profiles/${profile.imgNm}.jpg'/>"
                                             alt="현재 프로필" class="current-profile-image">
                    </c:otherwise>
                </c:choose>
                    <div id="current-username" class="current-username">${profile.nicknmame}</div>
                    <div id="current-email" class="current-email">${profile.email}</div>
                </div>
                
                <div class="profile-stats">
                    <div class="stat-item">
                        <span>가입일</span>
                        <span class="stat-value">${profile.reg_date}</span>
                    </div>
                    <div class="stat-item">
                        <span>찜한 콘텐츠</span>
                        <span class="stat-value">${profile.interest_count}</span>
                    </div>
                    <div class="stat-item">
                        <span>평가한 영화</span>
                        <span class="stat-value">${profile.evaluate_count}</span>
                    </div>
                    <div class="stat-item">
                        <span>시청 시간</span>
                        <span class="stat-value">${profile.streaming_count}</span>
                    </div>
                </div>
            </div>

            <!-- 프로필 설정 폼 -->
            <div class="profile-form-container">
                <form id="profileForm" class="profile-form" >
                <input type="hidden" id="provider" name="provider" value="${profile.provider}">
                    <c:choose>
                        <c:when test="${empty profile.provider}">
                        <!-- 프로필 이미지 변경 섹션 -->
                            <div class="form-section">
                                <h3 class="section-title">
                                    <span class="section-icon">📷</span>
                                    프로필 이미지
                                </h3>
                                <div class="profile-image-selector">
                                    <div class="profile-option" data-profile="profile1" selected>
                                        <img src="<c:url value='/resources/profiles/profile1.jpg'/>" alt="프로필 1">
                                    </div>
                                    <div class="profile-option" data-profile="profile2">
                                        <img src="<c:url value='/resources/profiles/profile2.jpg'/>" alt="프로필 2">
                                    </div>
                                    <div class="profile-option" data-profile="profile3">
                                        <img src="<c:url value='/resources/profiles/profile3.jpg'/>" alt="프로필 3">
                                    </div>
                                    <div class="profile-option" data-profile="profile4">
                                        <img src="<c:url value='/resources/profiles/profile4.jpg'/>" alt="프로필 4">
                                    </div>
                                    <div class="profile-option" data-profile="profile5">
                                        <img src="<c:url value='/resources/profiles/profile5.jpg'/>" alt="프로필 5">
                                    </div>
                                    <div class="profile-option" data-profile="profile6">
                                        <img src="<c:url value='/resources/profiles/profile6.jpg'/>" alt="프로필 6">
                                    </div>
                                </div>
                                <input type="hidden" id="selectedProfile" name="imgNm" value="${profile.imgNm}">
                            </div>
                        </c:when>
                    </c:choose>
                    <input type="hidden" id="selectedProfile" name="imgNm" value="${profile.imgNm}">
                    <!-- 기본 정보 섹션 -->
                    <div class="form-section">
                        <h3 class="section-title">
                            <span class="section-icon">👤</span>
                            기본 정보
                        </h3>
                        
                        <div class="form-group">
                            <label for="nickname" class="form-label">닉네임</label>
                            <input type="text" id="nicknmame" name="nicknmame" class="form-input"
                                   placeholder="닉네임을 입력하세요" maxlength="20">
                        </div>
                        
                        <div class="form-group">
                            <label for="email" class="form-label">이메일</label>
                            <input type="email" id="email" name="email" class="form-input" 
                                   placeholder="이메일을 입력하세요">
                        </div>
                    </div>

                    <!-- 비밀번호 변경 섹션 -->
                    <div class="form-section">
                        <h3 class="section-title">
                            <span class="section-icon">🔒</span>
                            비밀번호 변경
                        </h3>

                        <div class="form-group">
                            <label for="newPassword" class="form-label">새 비밀번호</label>
                            <input type="password" id="newPassword" name="newPassword"
                                   class="form-input" placeholder="새 비밀번호를 입력하세요" minlength="8">
                        </div>

                        <div class="form-group">
                            <label for="confirmPassword" class="form-label">새 비밀번호 확인</label>
                            <input type="password" id="confirmPassword" name="confirmPassword"
                                   class="form-input" placeholder="새 비밀번호를 다시 입력하세요">
                        </div>
                    </div>

                    <input type="hidden" id="user_id" name="user_id" value="${profile.user_id}"/>

                    <!-- 저장 버튼 -->
                    <div class="btn-group">
                        <button type="button" class="profile-btn btn-secondary" onclick="resetForm()">
                            <span>취소</span>
                        </button>
                        <button type="submit" class="profile-btn btn-primary">
                            <span>변경 사항 저장</span>
                        </button>
                    </div>
                </form>

                <!-- 위험 구역 -->
                <div class="danger-zone">
                    <h3 class="section-title">
                        <span class="section-icon">⚠️</span>
                        주의
                    </h3>
                    <p class="danger-warning">
                        회원 탈퇴 시 모든 데이터가 영구적으로 삭제되며, 복구할 수 없습니다. 
                        찜한 콘텐츠, 평가 기록, 시청 기록 등이 모두 사라집니다.
                    </p>
                    <button type="button" class="profile-btn btn-danger" onclick="showDeleteAccountModal()">
                        <span>🗑️</span>
                        <span>회원 탈퇴</span>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- 회원탈퇴 확인 모달 -->
    <div id="deleteAccountModal" class="modal" style="display: none;">
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3>회원 탈퇴 확인</h3>
                <button class="modal-close" onclick="hideDeleteAccountModal()">&times;</button>
            </div>
            <div class="modal-body">
                <p style="color: var(--text-secondary); margin-bottom: 20px; line-height: 1.6;">
                    정말로 회원 탈퇴를 진행하시겠습니까?<br>
                    이 작업은 되돌릴 수 없으며, 모든 데이터가 영구적으로 삭제됩니다.
                </p>
                <div class="form-group">
                    <label for="deleteConfirmPassword" class="form-label">비밀번호 확인</label>
                    <input type="password" id="deleteConfirmPassword" class="form-input" 
                           placeholder="비밀번호를 입력하여 확인하세요">
                </div>
                <div class="btn-group" style="margin-top: 25px;">
                    <button type="button" class="profile-btn btn-secondary" onclick="hideDeleteAccountModal()">
                        취소
                    </button>
                    <button type="button" class="profile-btn btn-danger" onclick="deleteAccount()">
                        회원 탈퇴
                    </button>
                </div>
            </div>
        </div>
    </div>



    
    <script>

        const user_id=document.getElementById('user_id').value;
        // 프로필 이미지 선택 기능
        document.addEventListener('DOMContentLoaded', function() {
            const provider = document.getElementById('provider');
            if(!provider){
            initProfilePage();
            }else{
            document.getElementById('profileForm').addEventListener('submit', handleFormSubmit);}
        });

        function initProfilePage() {
            // 프로필 이미지 선택 이벤트
            const profileOptions = document.querySelectorAll('.profile-option');
            const selectedProfileInput = document.getElementById('selectedProfile');
            const selectedProfileInput_value = selectedProfileInput.value;
            console.log(selectedProfileInput_value);
            const profileOption = document.querySelector('[data-profile="'+selectedProfileInput_value+'"]');
            profileOption.classList.add('selected');
            profileOptions.forEach(option => {
                option.addEventListener('click', function() {
                    // 모든 선택 해제
                    profileOptions.forEach(opt => opt.classList.remove('selected'));

                    // 선택된 프로필 표시
                    this.classList.add('selected');

                    // 값 저장
                    const profileValue = this.dataset.profile;
                    selectedProfileInput.value = profileValue;

                    // 사이드바 이미지 업데이트
                    const currentProfileImg = document.getElementById('current-profile-img');
                    currentProfileImg.src = this.querySelector('img').src;
                });
            });

            // 폼 제출 이벤트
            document.getElementById('profileForm').addEventListener('submit', handleFormSubmit);
        }



        // 폼 제출 처리
        async function handleFormSubmit(event) {
            event.preventDefault();

            const submitBtn = event.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;

            try {
                // 로딩 상태 표시
                submitBtn.classList.add('btn-loading');
                submitBtn.innerHTML = '<span>저장 중...</span>';

                // 필드 값 가져오기
                const newPassword = document.getElementById('newPassword').value;
                const confirmPassword = document.getElementById('confirmPassword').value;
                const nickname = document.getElementById('nicknmame').value;
                const email = document.getElementById('email').value;
                let selectedProfileElem = document.getElementById('selectedProfile');
                let selectedProfile =  selectedProfileElem.value;

                // 비밀번호 확인
                if (newPassword !== confirmPassword) {
                    showMessage('비밀번호가 일치하지 않습니다.', 'error');
                    return; // 요청 중단
                }

                // 필수 값 확인
                if (!nickname || !email || !confirmPassword) {
                    showMessage('필수 항목을 입력해주세요.', 'error');
                    return; // 요청 중단
                }

                const formData = {
                    user_id: user_id,
                    email: email,
                    nicknmame: nickname,
                    imgNm: selectedProfile,
                    pwd: confirmPassword
                };

                const res = await fetch('/OpusCine/user/updateProfile', {
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    method: "PATCH",
                    body: JSON.stringify(formData)
                });

                if (res.ok) {
                    showMessage('프로필이 성공적으로 업데이트되었습니다.', 'success');
                    // 비밀번호 필드 초기화
                    document.getElementById('currentPassword').value = '';
                    document.getElementById('newPassword').value = '';
                    document.getElementById('confirmPassword').value = '';
                } else {
                    showMessage('프로필 업데이트에 실패했습니다.', 'error');
                }

            } catch (error) {
                console.error('프로필 업데이트 실패:', error);
                showMessage(error.message || '프로필 업데이트에 실패했습니다.', 'error');
            } finally {
                // 로딩 상태 해제
                submitBtn.classList.remove('btn-loading');
                submitBtn.innerHTML = originalText;
            }
        }


        // 폼 리셋
        function resetForm() {
            if (confirm('변경사항을 취소하시겠습니까?')) {
                document.getElementById('profileForm').reset();
                loadUserProfile();
            }
        }

        // 회원탈퇴 모달 표시
        function showDeleteAccountModal() {
            document.getElementById('deleteAccountModal').style.display = 'flex';
        }

        // 회원탈퇴 모달 숨김
        function hideDeleteAccountModal() {
            document.getElementById('deleteAccountModal').style.display = 'none';
            document.getElementById('deleteConfirmPassword').value = '';
        }

        // 회원탈퇴 처리
        async function deleteAccount() {
            const password = document.getElementById('deleteConfirmPassword').value;

            if (!password) {
                showMessage('비밀번호를 입력해주세요.', 'error');
                return;
            }

            if (!confirm('정말로 회원탈퇴를 진행하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                return;
            }

            try {

                 const response = await fetch('/OpusCine/user/delete', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({'pwd': password,'user_id':user_id })
                 });

                 if(response.status ==204){
                alert('회원탈퇴가 완료되었습니다.');
                window.location.href = '/OpusCine';
                }

            } catch (error) {
                console.error('회원탈퇴 실패:', error);
                showMessage('회원탈퇴에 실패했습니다. 다시 시도해주세요.', 'error');
            }
        }

        // 메시지 표시
        function showMessage(message, type) {
            const messageEl = document.getElementById('message');
            messageEl.textContent = message;
            messageEl.className = `message ${type}`;
            messageEl.style.display = 'block';

            // 3초 후 자동 숨김
            setTimeout(() => {
                messageEl.style.display = 'none';
            }, 3000);
        }
    </script>
</body>
</html> 