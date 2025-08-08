package com.spring.team.controller;

import com.spring.team.dto.CountDTO;
import com.spring.team.dto.UserDTO;
import com.spring.team.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpRequest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ResponseBody;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Controller
public class ViewController {

    @Autowired
    UserService userService;
    private UserDTO dto;

    @GetMapping("/")
    public String test(Authentication authentication, Model model){
        withAuthenticationFunc(authentication, model);
        return "index";
    }
    /*좋아요가 5개 이상이면 해당 장르를 가지고 요청
    proxy 응답을 받으면 class로 받고 json으로 parse*/
    @GetMapping("/ai-recommendations")
    public String aiRecommendations(Authentication authentication, Model model){
        System.out.println("ai-recommendations");
        withAuthenticationFunc(authentication, model);
        return "ai-recommendations";
    }
    
    @GetMapping("/movies")
    public String movies(Authentication authentication, Model model){
        System.out.println("movies");
        withAuthenticationFunc(authentication, model);
        return "movies";
    }
    
    @GetMapping("/trending")
    public String trending(Authentication authentication, Model model){
        System.out.println("trending");
        withAuthenticationFunc(authentication, model);
        return "trending";
    }
    
    @GetMapping("/user/my-list")
    public String myList(Authentication authentication, Model model){
        System.out.println("my-list");
        withAuthenticationFunc(authentication, model);
        return "my-list";
    }
    
    @GetMapping("/signup")
    public String signup(){
        System.out.println("signup");
        return "signup";
    }

    @GetMapping("/user/watch-together/{id}")
    public String watchTogether(Authentication authentication, Model model, HttpServletRequest request, @PathVariable String id){
        System.out.println("watch-together");
        withAuthenticationFunc(authentication,model);
        HttpSession session =request.getSession();
        System.out.println(dto.getNickNm()+"/"+dto.getProfile());
        System.out.println(id);
        session.setAttribute("ws_nickname",dto.getNickNm());
        session.setAttribute("ws_movieId",id);
        session.setAttribute("ws_profile",dto.getProfile());
        return "watch-together";
    }

    private void withAuthenticationFunc(Authentication authentication, Model model){
        try {
            String name = authentication.getName();
            dto =userService.findUser(name);
            if (dto.getProvider()!=null){
                model.addAttribute("provider",dto.getProfile());
            }else {
                model.addAttribute("img", dto.getProfile());
            }
        }catch (NullPointerException e){
            System.out.println("인증된 사용자가 아님.");
        }catch (Exception exception){
            System.out.println(exception.toString());
        }
    }
    //ai 탭을 요청할때 사용자가 좋아요누른 장르들을 반환
    @GetMapping("/getGenreIds")
    public ResponseEntity<Map<String,String>> getGenreIds(){
        StringBuilder genre_tv = new StringBuilder();
        StringBuilder genre_movie = new StringBuilder();
        Map<String, Boolean> movie = new HashMap<>();
        Map<String, Boolean> tv = new HashMap<>();
        String result_tv="";
        String result_movie="";
        try {
            if (dto != null) {
                List<CountDTO> countDTOS = userService.countEvaluate(dto.getUserId());
                for (CountDTO countDTO : countDTOS) {
                    System.out.println("장르" + countDTO.toString());
                    if (countDTO.getMedia_type().equals("tv")){
                        for (String data : countDTO.getGenre().split(",")) {
                            if (!tv.containsKey(data)) {
                                tv.put(data, true);
                                System.out.println(data);
                                genre_tv.append(data).append(",");
                            }
                        }
                }else{
                        for (String data : countDTO.getGenre().split(",")) {
                            if (!movie.containsKey(data)) {
                                movie.put(data, true);
                                System.out.println(data);
                                genre_movie.append(data).append(",");
                            }
                        }
                    }
                }
                result_tv = tv.size() !=0?genre_tv.substring(0,genre_tv.length()-1) : "";
                result_movie = movie.size() !=0?genre_movie.substring(0,genre_movie.length()-1) : "";
                System.out.println("결과1" + result_movie);
                System.out.println("결과tv" + result_tv);
            }
        }catch (NullPointerException e){
            System.out.println(e.toString());
        }
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("tv",result_tv,"movie",result_movie));
    }

}
