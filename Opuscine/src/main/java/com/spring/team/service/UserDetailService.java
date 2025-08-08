package com.spring.team.service;

import com.spring.team.dto.UserDTO;
import com.spring.team.mapper.UserMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class UserDetailService implements UserDetailsService {

    @Autowired
    UserService userService;

    @Override
    public UserDetails loadUserByUsername(String username){
            UserDTO dto = userService.findUser(username);
            if (dto != null) {
                return User.withUsername(dto.getUsername())
                        .password(dto.getPassword())
                        .roles(dto.getRole())
                        .build();
            }

        throw new UsernameNotFoundException("username not found");

    }
}
