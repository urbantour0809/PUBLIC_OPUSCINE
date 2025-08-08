package com.spring.team.config;

import com.spring.team.dto.UserDTO;
import com.spring.team.service.UserDetailService;
import com.spring.team.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import javax.mail.Session;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.io.IOException;
import java.util.Map;

public class CustomOAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {
    private UserService userService;
    private UserDetailService service;
    private PasswordEncoder passwordEncoder;
    private Object provider;
    private Object username;
    private Object email;
    private Object nickname;
    private Object profile_image;
    public CustomOAuth2SuccessHandler(UserService userService, UserDetailService service,PasswordEncoder passwordEncoder) {
        this.service = service;
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
       try {

           OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
           System.out.println("oAuth2User:" + oAuth2User);
           Map<String, Object> map = (Map<String, Object>) oAuth2User.getAttributes().get("response");
           if (map !=null){
                provider = "NAVER";
                username =  map.get("id");
                email =  map.get("email");
                nickname =  map.get("nickname");
                profile_image = map.get("profile_image");
           }else{
               map = oAuth2User.getAttributes();
               provider = "GOOGLE";
               username =  map.get("sub");
               email = map.get("email");
               nickname = map.get("name");
               profile_image = map.get("picture");
           }

           Integer user_id = userService.findUserPk((String) username);
           if (user_id == null) {
               System.out.println("null");
               userService.createUser(UserDTO.builder().email((String) email).nickNm((String) nickname).profile((String) profile_image).username((String) username).password(passwordEncoder.encode("1234")).provider((String) provider).build());
           }
           UserDetails userDetails = service.loadUserByUsername((String) username);
           UsernamePasswordAuthenticationToken authenticationToken = new UsernamePasswordAuthenticationToken(
                   userDetails, null, !userDetails.getAuthorities().isEmpty() ? userDetails.getAuthorities() : AuthorityUtils.createAuthorityList("ROLE_USER")
           );
           SecurityContextHolder.getContext().setAuthentication(authenticationToken);
           response.sendRedirect(request.getContextPath());
       }catch (Exception e){
           System.out.println(e.getMessage());
           HttpSession session = request.getSession();
           session.setAttribute("loginError","인증에 실패했습니다. 다시 시도해 주세요");
           response.sendRedirect(request.getContextPath() +"/login");
       }
    }
}
