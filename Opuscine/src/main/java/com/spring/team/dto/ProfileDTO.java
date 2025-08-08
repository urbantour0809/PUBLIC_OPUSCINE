package com.spring.team.dto;

import lombok.Data;

import java.util.Date;
//프로필 페이지 데이터 클래스
@Data
public class ProfileDTO {
    private int user_id;
    private String pwd;
    private String nicknmame;
    private String email;
    private String imgNm;
    private String reg_date;
    private int streaming_count;
    private int interest_count;
    private int evaluate_count;
    private String provider;//sns
}
