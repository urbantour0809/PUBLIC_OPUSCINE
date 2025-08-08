package com.spring.team.dto;

import lombok.*;

import java.util.Date;

//사용자 data class
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserDTO {
    private int userId;
    private int evaluateId;
    private int iterestedId;
    private String username;
    private String password;
    private String nickNm;
    private String email;
    private String profile;
    private final String role = "USER";
    private boolean rememberMe;
    private String movieId;
    private String evaluate; //좋아요
    private int time;//시청시간
    private int epi;//tv 에피소드
    private String contentType;
    private int runTime;//러닝타임
    private String genre; //장르
    private String mediaType; //tv or movie
    private Date regdate;
    private String provider;//sns로그인 시 분류(naver.google...)
}
