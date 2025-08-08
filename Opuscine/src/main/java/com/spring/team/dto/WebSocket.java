package com.spring.team.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class WebSocket {
    private String id;
    private String nickname;
    private String profile;

}
