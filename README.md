# OpusCine
## 프로젝트 소개
OpusCine은 Spring Framework 기반의 웹 애플리케이션 프로젝트입니다.

## 기술 스택
- Backend
  
  - Java 17
  - Spring Framework 5.3.30
  - Spring Security 5.8.5
  - Spring Security OAuth2
  - MyBatis 3.5.14
  - MySQL (mysql-connector-java 8.0.22)
  - HikariCP 5.0.1
- Frontend
  
  - JSP
  - JSTL 1.2
  - WebSocket
- Build Tool
  
  - Maven
## 주요 기능
- 사용자 인증 및 권한 관리 (Spring Security)
- OAuth2 소셜 로그인
- 파일 업로드 기능
- 실시간 통신 (WebSocket)
- 이메일 발송 기능
## 개발 환경 설정
1. 1.
   요구사항
   
   - JDK 17
   - Maven
   - MySQL 데이터베이스
2. 2.
   빌드 및 실행
```
mvn clean install
```
## 프로젝트 구조
```
OpusCine/
├── src/
│   ├── main/
│   │   ├── java/         # Java 소스 코드
│   │   ├── resources/    # 설정 파일
│   │   └── webapp/       # 웹 리소스
└── pom.xml               # Maven 설정 파일
```
## 라이선스
이 프로젝트는 Apache License 2.0 라이선스 하에 있습니다.
