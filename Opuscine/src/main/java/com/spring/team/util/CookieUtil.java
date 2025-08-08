package com.spring.team.util;

import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.swing.text.html.Option;
import java.util.Optional;

public class CookieUtil {
    public static Optional<Cookie> getCookie(HttpServletRequest request, String name){
        if (request.getCookies() == null) return Optional.empty();
        for (Cookie cookie: request.getCookies()){
            if (cookie.getName().equals(name)){
                return Optional.of(cookie);
            }
        }
        return Optional.empty();
    }

    public static void addCookie(String name,String value,HttpServletResponse response,int maxAge){
        Cookie cookie = new Cookie(name,value);
        cookie.setPath("/");
        cookie.setHttpOnly(true);
        cookie.setMaxAge(maxAge);
        response.addCookie(cookie);
    }

    public static void deleteCookie(HttpServletRequest request,HttpServletResponse response,String name){
        if(request.getCookies() == null) return;
        for(Cookie cookie : request.getCookies()){
            if (cookie.getName().equals(name)){
                cookie.setValue("");
                cookie.setPath("/");
                cookie.setMaxAge(0);
                response.addCookie(cookie);
            }
        }
    }
}
