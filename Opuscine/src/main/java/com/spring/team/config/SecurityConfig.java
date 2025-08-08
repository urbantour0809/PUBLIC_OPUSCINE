package com.spring.team.config;


import com.spring.team.service.UserDetailService;
import com.spring.team.service.UserService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.io.IOException;
import java.util.List;
import java.util.Optional;

@RequiredArgsConstructor
@Configuration
@EnableWebSecurity
@ComponentScan(basePackages ={"com.spring.team.service","com.spring.team.dto"})
public class SecurityConfig {

    private final UserDetailService service;
    private final UserService userService;
    private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);

    @Bean
    public AuthenticationManager manager(HttpSecurity security,PasswordEncoder passwordEncoder) throws Exception {
        return security.getSharedObject(AuthenticationManagerBuilder.class)
                .userDetailsService(service)
                .passwordEncoder(passwordEncoder)
                .and().build();
    }
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity security,AuthenticationEntryPoint point ) throws Exception {

        security.csrf().disable()
                .authorizeRequests()
                .antMatchers("/user/**").hasRole("USER")
                .anyRequest().permitAll()
                .and()
                .oauth2Login(oauth2 ->oauth2.authorizationEndpoint(authorizationEndpoint->
                        authorizationEndpoint.authorizationRequestRepository(cookieAuthorizationRequestRepository()))
                        /*.userInfoEndpoint(userInfoEndpoint -> userInfoEndpoint.userService())*/
                        .successHandler(new CustomOAuth2SuccessHandler(userService,service,passwordEncoder()))
                        .failureHandler((request, response, exception) -> {
                            log.error("OAuth2 인증 실패", exception);
                            String text = exception.getMessage();
                            HttpSession session = request.getSession();
                            session.setAttribute("loginError", text);
                            response.sendRedirect(request.getContextPath() + "/login");
                        }))
                .exceptionHandling(it -> {
                   it
                    .authenticationEntryPoint(point)
                    .accessDeniedPage("/denied");
                })
                .formLogin()
                .loginPage("/login")
                .failureHandler((request,response
                ,exception)->{
                    String text = null;
                    if (exception instanceof BadCredentialsException){
                        text = "아이디 또는 비밀번호가 일치하지 않습니다.";
                    }
                    HttpSession session = request.getSession();
                    session.setAttribute("loginError",text);
                    response.sendRedirect(request.getContextPath()+"/login");

                })
                .defaultSuccessUrl("/")
                .and()
                .logout()
                .and()
                .exceptionHandling()
                ;

        return security.build();
    }
    @Bean
    public PasswordEncoder passwordEncoder(){
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationEntryPoint restEntryPoint(){
        return (request, response, authException) -> {
            boolean json = Optional.ofNullable(request.getHeader("Accept"))
                    .map(value ->value.contains("application/json"))
                    .orElse(false);

            if (json){
                System.out.println("비동기");
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.getWriter().write("login please");
            }else{
                response.sendRedirect(request.getContextPath()+"/login");

            }
        };
    }

    @Bean
    public AuthorizationRequestRepository<OAuth2AuthorizationRequest> cookieAuthorizationRequestRepository(){
        return new HttpCookieOAuth2AuthorizationRequestRepository();
    }
    /*@Bean
    public AuthenticationSuccessHandler customeAuthenticationSuccessHandler(){
        return new CustomOAuth2SuccessHandler(userService,service);
    }*/

   @Bean
   public ClientRegistrationRepository clientRegistrationRepository() {
       List<ClientRegistration> registration = List.of(naver_clientRegistration(),google_clientRegistration());
       return new InMemoryClientRegistrationRepository(registration);
   }

   public ClientRegistration naver_clientRegistration(){
       return   ClientRegistration.withRegistrationId("naver")
               .clientId("YOUR_CLIENT_ID")
               .clientSecret("YOUR_CLIENT_SECRET")
               .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
               .redirectUri("http://localhost:8080/OpusCine/login/oauth2/code/naver")
               .scope("name", "profile_image", "email")
               .authorizationUri("https://nid.naver.com/oauth2.0/authorize")
               .tokenUri("https://nid.naver.com/oauth2.0/token")
               .userInfoUri("https://openapi.naver.com/v1/nid/me")
               .userNameAttributeName("response")
               .clientName("Naver")
               .build();
   }
   public ClientRegistration google_clientRegistration(){
       return   ClientRegistration.withRegistrationId("google")
               .clientId("YOUR_CLIENT_ID")
               .clientSecret("YOUR_CLIENT_SECRET")
               .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
               .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_POST)
               .redirectUri("http://localhost:8080/OpusCine/login/oauth2/code/google")
               .scope("profile,email".split(","))
               .authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
               .tokenUri("https://oauth2.googleapis.com/token")
               .userInfoUri("https://openidconnect.googleapis.com/v1/userinfo")
               .userNameAttributeName("sub")
               .clientName("Google")
               .build();
   }



}
