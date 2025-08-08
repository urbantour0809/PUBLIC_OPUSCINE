package com.spring.team.dto;

import lombok.Data;

@Data
public class InterestedDTO {
    private int iterested_id;
    private int user_id;
    private String movie_id;
    private String media_type;
    private String register_date; //관심추가한 날짜
}

