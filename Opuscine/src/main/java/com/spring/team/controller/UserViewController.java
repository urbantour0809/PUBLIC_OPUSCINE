package com.spring.team.controller;

import com.spring.team.dto.InterestedDTO;
import com.spring.team.dto.ModalDTO;
import com.spring.team.dto.ProfileDTO;
import com.spring.team.dto.UserDTO;
import com.spring.team.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

//get 요청
@Controller
public class UserViewController {

    @Autowired
    UserService service;

    @GetMapping("/user/streaming")
    @ResponseBody
    public ResponseEntity<Map<String,Map<Integer,Integer>>> getStreamingTime(@RequestParam String id, Authentication authentication){
        System.out.println("스트림 get");
        String username = authentication.getName();
        String[] ids = id.split(",");
        Map<String,Map<Integer,Integer>> map = new HashMap<>(); //<영화id,<시청시간,러닝타임>>
        for (String movie_id : ids){
            UserDTO dto =service.findMovieStreamingTime(UserDTO.builder().movieId(movie_id).username(username).build());
            if (dto != null){
                Map<Integer,Integer> result = Map.of(dto.getTime(),dto.getRunTime());
                map.put(movie_id,result);
            }
        }
        return ResponseEntity.ok(map);
    }


    @GetMapping("/user/totalEvaluate/{id}")
    @ResponseBody
    public ResponseEntity<Map<String,String>> getInterestedWithEvaluate(Authentication authentication,@PathVariable("id")String movieId){
        Map<String,String> map =new HashMap<>();
        System.out.println("모달관심구하기");
        try {
            List<ModalDTO> list = service.getInterestedWithEvaluate(authentication.getName(), movieId);
            if (list.isEmpty()){
                System.out.println("모달 비어있음");
                return ResponseEntity.status(204).build();
            }else{
                for (ModalDTO dto : list){
                    System.out.println("모달결과:"+dto.toString());
                    int inter = dto.getIterested_id();
                    int like = Integer.parseInt(String.valueOf(dto.getE_like()));
                    int dislike = Integer.parseInt(String.valueOf(dto.getE_dislike()));;
                    System.out.println("like:"+like+"dislike"+dislike);
                    if (inter!=0 &&(like!=0||dislike!=0)){
                        System.out.println("둘 다 있음");
                        String result = like !=0?"like":"dislike";
                        map.put("interested","ok");
                        map.put("evaluate",result);
                        System.out.println("결과"+map);
                        break;
                    } else if (inter ==0){
                        System.out.println("관심만 없음");
                        String result = (like !=0)?"like":"dislike";
                        System.out.println("result:"+result);
                        map.put("interested","fail");
                        map.put("evaluate",result);

                    } else {
                        System.out.println("관심만 있음");
                        map.put("interested","ok");
                    }
                }

            }
        }catch (Exception e){
            System.out.println(e.toString());
            ResponseEntity.status(500).build();
        }
        return ResponseEntity.ok(map);
    }


    @GetMapping("/user/profile")
    public String totalProfile(Authentication authentication, Model model){
        try {
            System.out.println("프로필");
            String username = authentication.getName();

            ProfileDTO dto = service.totalProfile(username);
            System.out.println(dto);
            System.out.println("프로필"+dto.toString());

            String[] date = dto.getReg_date().split("-");
            String result = date[0]+"년"+" "+date[1]+"월";
            dto.setReg_date(result);
            System.out.println("프로필"+dto.toString());

            model.addAttribute("profile",dto);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return "profile";
    }



    //관심영화 rest api
    @GetMapping("/user/restInterested")
    @ResponseBody
    public ResponseEntity<List<Map>> getRestInterested(Authentication authentication){
        System.out.println("비동기 관심");
        List<Map> rest_list = new ArrayList<>();
        try {
            String name = authentication.getName();
            List<InterestedDTO> list = service.findInterested(name);
            System.out.println("관심리스트"+list);
            if (list !=null){
                for (InterestedDTO dto:list){
                    rest_list.add(Map.of("type",dto.getMedia_type(),"id",dto.getMovie_id(),"watched", dto.getRegister_date(),"iterestedId",dto.getIterested_id()));
                }
            }
        }catch (Exception e){
            System.out.println(e.getMessage());
        }
        return ResponseEntity.ok(rest_list);
    }

    @GetMapping("/user/watchTogether")
    @ResponseBody
    public ResponseEntity<Map> findChatUser(Authentication authentication){
        System.out.println("watchTogether");
        ProfileDTO dto= new ProfileDTO();
        try {
            String name = authentication.getName();
             dto = service.findChatUser(name);
            System.out.println(dto.toString());
        }catch (Exception e){
            System.out.println(e.getMessage());
        }
        return ResponseEntity.ok(Map.of("nickNm",dto.getNicknmame(),"profile",dto.getImgNm()));
    }
}

