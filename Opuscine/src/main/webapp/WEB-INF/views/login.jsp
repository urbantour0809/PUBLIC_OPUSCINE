<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>로그인 - OpusCine</title>
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
                    <h2>로그인</h2>
                    <p class="auth-subtitle">OpusCine에서 무제한 영화와 TV 프로그램을 시청하세요</p>
                    
                    <form id="login-form" action="<c:url value='/login'/>" method="post">
                        <div class="form-group">
                              <input type="text" id="username" name="username" placeholder="아이디" required>
                              <span class="form-error" id="email-error"></span>
                        </div>
                        
                        <div class="form-group">
                            <input type="password" id="password" name="password" placeholder="비밀번호" required>
                            <span class="form-error" id="password-error"></span>
                        </div>
                        
                        <button type="submit" class="auth-btn">로그인</button>
                        
                        <div class="form-options">
                            <label class="checkbox-container">
                                <input type="checkbox" id="remember-me" name="remember-me">
                                <span class="checkmark"></span>
                                로그인 상태 유지
                            </label>
                            <a href="#" class="forgot-password">비밀번호를 잊으셨나요?</a>
                        </div>
                    </form>
                    <c:if test="${not empty loginError}">
                        <p style="color:red">${loginError}</p>
                    </c:if>
                    
                    <div class="auth-divider">
                        <span>또는</span>
                    </div>
                    
                    <div class="social-login">
                        <button class="social-btn google-btn" onclick="location.href='oauth2/authorization/google'">
                            <svg width="20" height="20" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Google로 로그인
                        </button>

                        <button class="social-btn naver-btn" onclick="location.href='oauth2/authorization/naver'">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="#03C75A">
                                <path d="M16.273 12.845L7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845z"/>
                            </svg>
                            네이버로 로그인
                        </button>
                    </div>
                    
                    <div class="auth-footer">
                        <p>OpusCine가 처음이신가요? <a href="<c:url value='/signup'/>">지금 가입하세요</a></p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script src="<c:url value='/resources/js/auth.js'/>"></script>
</body>
</html> 