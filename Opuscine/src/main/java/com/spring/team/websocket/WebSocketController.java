package com.spring.team.websocket;



import com.spring.team.dto.WebSocket;

import javax.servlet.http.HttpSession;
import javax.websocket.*;
import javax.websocket.server.ServerEndpoint;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

@ServerEndpoint(value="/watchTogether",configurator = HttpSessionConfigurator.class)
public class WebSocketController {
        private static Set<Session> clients = Collections.synchronizedSet(new HashSet<>());
    @OnOpen
    public void onOpen(Session ws, EndpointConfig config){
        HttpSession httpSession = (HttpSession) config.getUserProperties().get(HttpSession.class.getName());
        WebSocket socket = WebSocket.builder().id((String) httpSession.getAttribute("ws_movieId"))
                .nickname((String) httpSession.getAttribute("ws_nickname"))
                .profile((String) httpSession.getAttribute("ws_profile")).build();
        ws.getUserProperties().put("data",socket);
        clients.add(ws);
        System.out.println("세션 연결"+ ws.getId());
        System.out.println("세션 연결"+ clients.size());
    }

    @OnMessage
    public void onMessage(String message,Session session) throws IOException {
        System.out.println(session.getId()+"가 보낸 문자:"+message);
        synchronized (clients){
            for (Session session1 : clients){
                WebSocket entry_socket = (WebSocket) session.getUserProperties().get("data"); // 새로 들어온 사용자
                WebSocket saved_socket = (WebSocket) session1.getUserProperties().get("data"); // 전에 들어온 사용자
                if(entry_socket.getId().equals(saved_socket.getId())) {

                    if (message.split("_")[0].equals("entry")) { //서버로 처음 입장 시
                        String result = entry_socket.getNickname()+"/"+entry_socket.getProfile();// 별명/이미지경로
                        session1.getBasicRemote().sendText(message + "_" + result);
                        System.out.println();
                    } else {// 서버로 들어온 채팅
                        if (!session1.getId().equals(session.getId())) {
                            System.out.println(session1.getId() + "and" + session.getId());
                            String result = entry_socket.getNickname()+"/"+entry_socket.getProfile();// 별명/이미지경로
                            LocalDateTime time = LocalDateTime.now();
                            DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
                            String formattedTime = dateTimeFormatter.format(time);
                            System.out.println(message + "_" + formattedTime);
                            session1.getBasicRemote().sendText(message + "_" + formattedTime + "_" + result);
                        }
                    }

                }
            }
        }
    }

    @OnClose
    public void onClose(Session session){
        clients.remove(session);
        System.out.println("종료"+session.getId());
    }
}
