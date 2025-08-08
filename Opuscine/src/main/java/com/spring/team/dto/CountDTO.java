package com.spring.team.dto;

import lombok.Data;

//ai 추천에서 좋아요 누른 장르 가지고 오는 data
@Data
public class CountDTO {
    private String movie_id;
    private String genre;
    private String media_type;
}
