<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>회원가입 - OpusCine</title>
    <link rel="icon" type="image/x-icon" href="<c:url value='/resources/src/images/favicon.ico'/>">
    <link rel="stylesheet" href="<c:url value='/resources/css/base.css'/>">
    <link rel="stylesheet" href="<c:url value='/resources/css/auth.css'/>">
</head>
<body>
    <div class="auth-container">
        <div class="auth-background">
            <div class="auth-overlay"></div>
        </div>
        
        <div class="auth-content">
            <div class="auth-header">
                <a href="<c:url value='/'/>" class="logo">
                    <h1>OpusCine</h1>
                </a>
            </div>
            
            <div class="auth-form-container">
                <div class="auth-form">
                    <h2>회원가입</h2>
                    <p class="auth-subtitle">OpusCine에 가입하고 수천 편의 영화와 TV 프로그램을 즐기세요</p>
                    
                    <form id="signup-form" action="<c:url value='/join'/>" method="post">

                        <!-- 아이디 입력 -->
                        <div class="form-group">
                            <div class="input-with-button">
                                <input type="text" id="username" name="username" placeholder="아이디" required>
                                <button type="button" class="duplicate-check-btn" id="username-check-btn">중복확인</button>
                            </div>
                            <span class="form-error" id="username-error"></span>
                        </div>

                         <div class="form-group">
                            <input type="text" id="nickNm" name="nickNm" placeholder="닉네임" required>
                            <span class="form-error" id="nickNm-error"></span>

                        </div>
                        
                        <!-- 이메일 입력 -->
                        <div class="form-group">
                            <div class="input-with-button">
                                <input type="email" id="email" name="email" placeholder="이메일 주소" required>
                                <button type="button" class="verify-send-btn" id="email-verify-btn">인증번호 발송</button>
                            </div>
                            <span class="form-error" id="email-error"></span>
                        </div>

                        <!-- 이메일 인증번호 확인 (동적 생성) -->
                        <div class="form-group verification-group" id="verification-group" style="display: none;">
                            <div class="input-with-button">
                                <input type="text" id="verification-code" name="verification-code" placeholder="인증번호 입력" >
                                <button type="button" class="verify-check-btn" id="verify-check-btn">인증확인</button>
                            </div>
                            <div class="verification-info">
                                <span class="verification-timer" id="verification-timer">05:00</span>
                                <button type="button" class="resend-btn" id="resend-btn">재발송</button>
                            </div>
                            <span class="form-error" id="verification-error"></span>
                        </div>
                        
                        <!-- 비밀번호 입력 -->
                        <div class="form-group">
                            <input type="password" id="password" name="password" placeholder="비밀번호" required>
                            <span class="form-error" id="password-error"></span>
                            <div class="password-strength">
                                <div class="strength-bar">
                                    <div class="strength-fill"></div>
                                </div>
                                <span class="strength-text">비밀번호 강도</span>
                            </div>
                        </div>
                        
                        <!-- 비밀번호 확인 -->
                        <div class="form-group">
                            <input type="password" id="confirm-password" name="confirm-password" placeholder="비밀번호 확인" required>
                            <span class="form-error" id="confirm-password-error"></span>
                        </div>

                        <!-- 프로필 이미지 선택 -->
                        <div class="form-group profile-section">
                            <label class="profile-label">프로필 이미지 선택</label>
                            <div class="profile-selector">
                                <div class="profile-images-grid">
                                    <div class="profile-image-item" data-profile="profile1">
                                        <img src="<c:url value='/resources/profiles/profile1.jpg'/>" alt="프로필 1">
                                    </div>
                                    <div class="profile-image-item" data-profile="profile2">
                                        <img src="<c:url value='/resources/profiles/profile2.jpg'/>" alt="프로필 2">
                                    </div>
                                    <div class="profile-image-item" data-profile="profile3">
                                        <img src="<c:url value='/resources/profiles/profile3.jpg'/>" alt="프로필 3">
                                    </div>
                                    <div class="profile-image-item" data-profile="profile4">
                                        <img src="<c:url value='/resources/profiles/profile4.jpg'/>" alt="프로필 4">
                                    </div>
                                    <div class="profile-image-item" data-profile="profile5">
                                        <img src="<c:url value='/resources/profiles/profile5.jpg'/>" alt="프로필 5">
                                    </div>
                                    <div class="profile-image-item" data-profile="profile6">
                                        <img src="<c:url value='/resources/profiles/profile6.jpg'/>" alt="프로필 6">
                                    </div>
                                </div>
                                <input type="hidden" id="selected-profile" name="profile" value="profile1">
                            </div>
                        </div>
                        
                        <!-- 약관 동의 -->
                        <div class="form-group checkbox-group">
                            <label class="checkbox-container">
                                <input type="checkbox" id="terms" name="terms" required>
                                <span class="checkmark"></span>
                                <a href="#" class="terms-link">이용약관</a> 및 <a href="#" class="privacy-link">개인정보처리방침</a>에 동의합니다
                            </label>
                            <span class="form-error" id="terms-error"></span>
                        </div>
                        
                        <!-- 마케팅 수신 동의 -->
                        <div class="form-group checkbox-group">
                            <label class="checkbox-container">
                                <input type="checkbox" id="marketing" name="marketing">
                                <span class="checkmark"></span>
                                마케팅 정보 수신에 동의합니다 (선택)
                            </label>
                        </div>
                        
                        <button type="submit" class="auth-btn">회원가입</button>
                    </form>
                    
                    <div class="auth-divider">
                        <span>또는</span>
                    </div>
                    
                    <div class="social-login">
                        <button class="social-btn google-btn">
                            <svg width="20" height="20" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Google로 가입
                        </button>
                        
                        <button class="social-btn naver-btn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="#03C75A">
                                <path d="M16.273 12.845L7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845z"/>
                            </svg>
                            네이버로 가입
                        </button>
                    </div>
                    
                    <div class="auth-footer">
                        <p>이미 계정이 있으신가요? <a href="<c:url value='/login'/>">로그인하세요</a></p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script src="<c:url value='/resources/js/auth.js'/>"></script>
</body>
</html> 