<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>테스트 로그인 - OpusCine</title>
    <link rel="icon" type="image/x-icon" href="<c:url value='/resources/src/images/favicon.ico'/>">
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 400px;
            margin: 100px auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .test-container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .test-buttons {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        .test-btn {
            padding: 12px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            transition: background-color 0.3s;
        }
        .login-btn {
            background-color: #007bff;
            color: white;
        }
        .login-btn:hover {
            background-color: #0056b3;
        }
        .logout-btn {
            background-color: #dc3545;
            color: white;
        }
        .logout-btn:hover {
            background-color: #c82333;
        }
        .status {
            margin-bottom: 20px;
            padding: 10px;
            border-radius: 5px;
            text-align: center;
        }
        .logged-in {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .logged-out {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
    </style>
</head>
<body>
    <div class="test-container">
        <h2>OpusCine 테스트 로그인</h2>
        
        <% 
            Object user = session.getAttribute("user");
            if (user != null) {
        %>
            <div class="status logged-in">
                현재 로그인 상태입니다.
            </div>
            <div class="test-buttons">
                <form method="post" action="">
                    <input type="hidden" name="action" value="logout">
                    <button type="submit" class="test-btn logout-btn">로그아웃</button>
                </form>
                <a href="<c:url value='/'/>" class="test-btn login-btn" style="text-decoration: none; display: block; text-align: center;">
                    홈으로 가기
                </a>
            </div>
        <% } else { %>
            <div class="status logged-out">
                현재 로그아웃 상태입니다.
            </div>
            <div class="test-buttons">
                <form method="post" action="">
                    <input type="hidden" name="action" value="login">
                    <button type="submit" class="test-btn login-btn">테스트 로그인</button>
                </form>
                <a href="<c:url value='/'/>" class="test-btn logout-btn" style="text-decoration: none; display: block; text-align: center;">
                    홈으로 가기
                </a>
            </div>
        <% } %>
    </div>

    <%
        String action = request.getParameter("action");
        if ("login".equals(action)) {
            // 테스트용 사용자 객체 생성 (실제 환경에서는 User 클래스 사용)
            java.util.Map<String, String> testUser = new java.util.HashMap<>();
            testUser.put("name", "테스트 사용자");
            testUser.put("email", "test@opuscine.com");
            testUser.put("profileImage", "/resources/profiles/profile1.jpg");
            
            session.setAttribute("user", testUser);
            response.sendRedirect(request.getRequestURI());
        } else if ("logout".equals(action)) {
            session.removeAttribute("user");
            response.sendRedirect(request.getRequestURI());
        }
    %>
</body>
</html> 