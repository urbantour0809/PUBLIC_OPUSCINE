package com.spring.team.controller;

import com.spring.team.dto.InterestedDTO;
import com.spring.team.dto.ProfileDTO;
import com.spring.team.dto.UserDTO;
import com.spring.team.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import javax.activation.DataHandler;
import javax.activation.FileDataSource;
import javax.mail.*;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeBodyPart;
import javax.mail.internet.MimeMessage;
import javax.mail.internet.MimeMultipart;
import javax.servlet.http.HttpSession;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.util.*;


//사용자 post,put,delete
@Controller
public class UserApiController {
    @Autowired
    UserService userService;
    @Autowired
    PasswordEncoder encoder;

    @PostMapping("/join")
    public String createUser(UserDTO dto){
        try {
            dto.setPassword(encoder.encode(dto.getPassword()));
            System.out.println(dto);
            userService.createUser(dto);
        }catch (Exception e){
            System.out.println(e.toString());
        }
        return "redirect:/login";
    }

    //메일 인증
    @GetMapping("/mailsend/{usermail}")
    @ResponseBody
    public String sendMail(@PathVariable("usermail")String mail){
        String random =UUID.randomUUID().toString();
        random= random.split("-")[0];
        System.out.println(random);

        // 사용자명 조회 (이메일을 기반으로)
        String username = "사용자"; // 기본값
        try {
            // 이메일로 사용자 정보 조회하는 로직이 필요하다면 여기에 추가
            // 현재는 이메일 주소에서 @ 앞부분을 사용자명으로 사용
            if (mail.contains("@")) {
                username = mail.split("@")[0];
            }
        } catch (Exception e) {
            System.out.println("사용자명 조회 오류: " + e.toString());
        }
        Properties properties = new Properties();
        properties.put("mail.smtp.host","smtp.gmail.com");
        properties.put("mail.smtp.port","587");
        properties.put("mail.smtp.auth","true");
        properties.put("mail.smtp.starttls.enable","true");

        Session session = Session.getInstance(properties, new Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication("YOUR_EMAIL","YOUR_PASSWORD");
            }
        });

        ClassPathResource bannerResource = new ClassPathResource("img/1.png");

        try {
            // 배너 이미지 (1.png)
            MimeBodyPart bannerPart = new MimeBodyPart();
            bannerPart.setDataHandler(new DataHandler(new FileDataSource(bannerResource.getFile())));
            bannerPart.setHeader("Content-ID","<bannerImage>");
            bannerPart.setDisposition(MimeBodyPart.INLINE);


            String dom = """
               <html>
                <body style="margin: 0; padding: 0; font-family: 'Malgun Gothic', sans-serif; background-color: #f5f5f5;">
                    <div style="max-width: 700px; margin: 0 auto; background-color: white;">
                        <!-- 상단 배너 (1.png) - 700x400 -->
                        <div style="width: 100%; text-align: center;">
                            <img src="cid:bannerImage" alt="OpusCine 배너" style="display: block; width: 100%; height: auto; max-width: 700px;">
                        </div>
                        
                        <!-- 메인 텍스트 영역 -->
                        <div style="
                            padding: 60px 40px;
                            text-align: center;
                            background-color: white;
                        ">
                            <div style="
                                max-width: 500px;
                                margin: 0 auto;
                                background: #ffffff;
                                padding: 50px 40px;
                                border-radius: 20px;
                                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                                border: 1px solid #e0e0e0;
                            ">
                                <div style="font-size: 28px; font-weight: bold; margin-bottom: 25px; color: #333;">
                                    USERNAME_PLACEHOLDER님
                                </div>
                                <div style="font-size: 18px; line-height: 1.7; margin-bottom: 35px; color: #555;">
                                    2단계 인증 설정을 위한 인증 코드를<br>
                                    발급하였습니다.<br><br>
                                    아래의 인증 코드를 입력하여 주세요.
                                </div>
                                <div style="
                                    font-size: 36px;
                                    font-weight: bold;
                                    color: rgb(43, 105, 219);
                                    background: rgb(248, 250, 255);
                                    padding: 20px 30px;
                                    border-radius: 12px;
                                    letter-spacing: 5px;
                                    font-family: monospace;
                                    margin: 25px 0;
                                    border: 2px solid rgb(43, 105, 219);
                                ">
                                    RANDOM_PLACEHOLDER
                                </div>
                            </div>
                        </div>
                        
                        <!-- 푸터 -->
                        <div style="padding: 30px; text-align: center; background-color: #f8f9fa; color: #666; font-size: 14px;">
                            <strong>OpusCine</strong> - AI 추천 영화 사이트<br>
                            본 메일은 발신 전용입니다.
                        </div>
                    </div>
                </body>
               </html>
               """;

            // 변수 치환
            dom = dom.replace("USERNAME_PLACEHOLDER", username);
            dom = dom.replace("RANDOM_PLACEHOLDER", random);

            MimeBodyPart text = new MimeBodyPart();
            text.setContent(dom,"text/html; charset=UTF-8");

            Multipart multipart = new MimeMultipart();
            multipart.addBodyPart(bannerPart);  // 배너 이미지 추가
            multipart.addBodyPart(text);        // HTML 텍스트 추가

            Message ms = new MimeMessage(session);
            ms.setFrom(new InternetAddress("YOUR_EMAIL"));
            ms.setRecipient(Message.RecipientType.TO,new InternetAddress(mail));
            ms.setSubject("OPUSCINE 2단계 인증 코드");
            ms.setContent(multipart);
            Transport.send(ms);
        } catch (MessagingException | IOException e) {
            System.out.println("메세지전송 오류:"+e);
            return e.toString();
        }
        return random;

    }
    @RequestMapping("/denied")
    public String userDenied(Model model){
        model.addAttribute("error","권한이 없습니다.");
        return "deniedErrorPage";
    }

    //사용자 아이디 중복 확인
    @GetMapping("/duplication")
    @ResponseBody
    public ResponseEntity<Boolean> duplication(@RequestParam String username){
        try{
            userService.findDuplicationUsername(username);
        }catch (IllegalStateException e){
            System.out.println(e.toString());
            return ResponseEntity.ok(false);
        }
        return ResponseEntity.ok(true);
    }

    @GetMapping("/login")
    public String login(Model model,HttpSession session){
        System.out.println("login");
        String errorText = (String) session.getAttribute("loginError");
        if(errorText != null){
            session.removeAttribute("loginError");
            model.addAttribute("loginError", errorText);
        }
        return "login";
    }

    //사용자 관심
    @PostMapping("/user/interested/{id}/{type}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void setInterested(@PathVariable String id,@PathVariable String type, Authentication authentication){
        String userId = authentication.getName();
        System.out.println(type);
        try{
            List<Integer> list = userService.duplicatedInterest(userId,id);
            if (list.isEmpty()){
                System.out.println("관심처음");
                userService.insertInterested(UserDTO.builder().username(userId).movieId(id).mediaType(type).build());
            }else{
                System.out.println("관심삭제");
                userService.deleteInterest(list.get(0));
            }
        }catch (Exception e){
            System.out.println(e.toString());
        }
    }
    //사용자 좋아요
    @PostMapping("/user/evaluate/{id}")
    public ResponseEntity<Void> userLike(@PathVariable String id, Authentication authentication, @RequestBody UserDTO dto){
        System.out.println("관심"+dto.getEvaluate());
        String userId = authentication.getName();
        dto.setUsername(userId);
        dto.setMovieId(id);
        try{//좋아요 선택 후 싫어요 선택
            List<Integer> list = userService.existentEvaluate(userId,dto.getMovieId());
            System.out.println("list.isEmpty:"+list.isEmpty());
            if (list.isEmpty()){
                userService.insertEvaluateService(dto);
            }else {
                System.out.println("중복 좋아요");
                dto.setEvaluateId(list.get(0));
                userService.updateEvaluate(dto);
            }
        }catch (Exception e) {
            System.out.println(e.toString());
            return ResponseEntity.status(500).build();
        }
        return ResponseEntity.status(200).build();
    }

    //사용자 시청기록
    @PostMapping("/user/streaming")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void userStreaming(@RequestBody UserDTO dto,Authentication authentication){
        String userId = authentication.getName();
        dto.setUsername(userId);
        System.out.println("스트리밍"+dto.toString());
        try{    //시청기록 확인
            UserDTO result =userService.findMovieStreamingTime(dto);
            if (result== null) {
                userService.insertStreaming(UserDTO.builder().username(userId).movieId(dto.getMovieId()).time(dto.getTime()).runTime(dto.getRunTime()).build());
            }else{
                userService.updateStreamingTime(dto);
            }
        }catch (Exception e) {
            System.out.println(e.toString());
        }

    }
    //evaluate 취소
    @DeleteMapping("/user/evaluate/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteEvaluate(@PathVariable String id,Authentication authentication){
        System.out.println("삭제");
        String username = authentication.getName();
        try{
            userService.deleteEvaluate(username,id);
        } catch (Exception e) {
            System.out.println(e.toString());
        }
    }
    @PatchMapping("/user/updateProfile")
    public String updateProfile(@RequestBody ProfileDTO dto){
        System.out.println("프로필 수정");
        System.out.println(dto.toString());
        String encode_pwd = encoder.encode(dto.getPwd());
        dto.setPwd(encode_pwd);
        try {
            userService.updateProfile(dto);
            return "redirect:/user/profile";
        } catch (Exception e) {
            System.out.println(e.toString());
            return "profile";
        }
    }

    @DeleteMapping("/user/delete")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@RequestBody ProfileDTO dto){
        System.out.println("탈퇴");
        System.out.println(dto.toString());
        String pwd = userService.findPwd(dto.getUser_id());
        if(encoder.matches(dto.getPwd(),pwd)){
            userService.deleteUser(dto.getUser_id());
        }
    }

    @DeleteMapping("/user/delete/interested/{movieId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@PathVariable  int movieId){
        System.out.println("찜 콘텐츠 삭제");
        userService.deleteInterest(movieId);
    }



}