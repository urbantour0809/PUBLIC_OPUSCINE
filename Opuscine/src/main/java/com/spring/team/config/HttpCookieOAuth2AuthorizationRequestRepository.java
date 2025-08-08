package com.spring.team.config;

import com.spring.team.util.CookieUtil;
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.SerializationUtils;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.Base64;

//쿠키 기반 sns가 redirect 했을 때 OAuth2AuthorizationRequest 와 state 확인

public class HttpCookieOAuth2AuthorizationRequestRepository implements AuthorizationRequestRepository<OAuth2AuthorizationRequest> {
    private final static String OAUTH2_COOKIE_NAME = "OAUTH2_AUTH_REQUEST";
    private final static int COOKIE_EXPIRE_SECONDS =1800;
    @Override
    public OAuth2AuthorizationRequest loadAuthorizationRequest(HttpServletRequest request) {
        System.out.println("loadauthorzation");
        return CookieUtil.getCookie(request,OAUTH2_COOKIE_NAME).map(cookie -> deserialize(cookie.getValue())).orElse(null);
    }

    @Override
    public void saveAuthorizationRequest(OAuth2AuthorizationRequest authorizationRequest, HttpServletRequest request, HttpServletResponse response) {
        System.out.println("saveAuthorizationRequest");
        if (authorizationRequest == null){
                removeAuthorizationRequest(request,response);return;
            }
            String serializedRequest = serialize(authorizationRequest);
        CookieUtil.addCookie(OAUTH2_COOKIE_NAME,serializedRequest,response,COOKIE_EXPIRE_SECONDS);
    }

    @Override
    public OAuth2AuthorizationRequest removeAuthorizationRequest(HttpServletRequest request) {
        return loadAuthorizationRequest(request);
    }


    @Override
    public OAuth2AuthorizationRequest removeAuthorizationRequest(HttpServletRequest request, HttpServletResponse response) {
        System.out.println("removeAuthorizationRequest");
        OAuth2AuthorizationRequest oAuth2AuthorizationRequest = loadAuthorizationRequest(request);
        CookieUtil.deleteCookie(request,response,OAUTH2_COOKIE_NAME);
        return oAuth2AuthorizationRequest;
    }

    private String serialize(OAuth2AuthorizationRequest authorizationRequest){
        return Base64.getUrlEncoder().encodeToString(SerializationUtils.serialize(authorizationRequest));
    }

    private OAuth2AuthorizationRequest deserialize(String cookie){
        return (OAuth2AuthorizationRequest) SerializationUtils.deserialize(Base64.getUrlDecoder().decode(cookie));
    }
}
