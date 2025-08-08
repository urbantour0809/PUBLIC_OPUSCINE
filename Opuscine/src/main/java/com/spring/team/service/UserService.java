package com.spring.team.service;

import com.spring.team.dto.*;
import com.spring.team.mapper.UserMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.User;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;

import java.util.List;

@Service
public class UserService {
    private final UserMapper userMapper;

    @Autowired
    public UserService(UserMapper userMapper){
        this.userMapper = userMapper;
    }

    public void createUser(UserDTO dto){
        userMapper.createUser(dto);
    }

    public UserDTO findUser(String username){
        return userMapper.findUser(username);
    }
    public void insertInterested(UserDTO dto){
        dto.setUserId(userMapper.findUserPk(dto.getUsername()));
        userMapper.insertInterested(dto);

    }
    public void insertEvaluateService(UserDTO dto){
        dto.setUserId(userMapper.findUserPk(dto.getUsername()));
        System.out.println("dto:"+dto.toString());
        userMapper.insertEvaluate(dto);
    }

    public void insertStreaming(UserDTO dto){
        dto.setUserId(userMapper.findUserPk(dto.getUsername()));
        userMapper.streaming(dto);
    }

    public void findDuplicationUsername(String username)  {
        Integer result =userMapper.findUserPk(username);
        if(result == null){throw new IllegalStateException("사용자 없슴");}

    }
    public UserDTO findMovieStreamingTime(UserDTO dto){
        dto.setUserId(userMapper.findUserPk(dto.getUsername()));
        UserDTO result =userMapper.getMovieStreamingTime(dto);
        return result;
    }
    public void updateStreamingTime(UserDTO dto) throws RuntimeException {
        dto.setUserId(userMapper.findUserPk(dto.getUsername()));
        userMapper.updateStreamingTime(dto);
    }
    public void deleteEvaluate(String username, String movieId){
        int userId =userMapper.findUserPk(username);
        System.out.println(userId);
        userMapper.deleteEvaluate(movieId,userId);
    }
    public List<Integer> existentEvaluate(String username, String movieId){
        int userId =userMapper.findUserPk(username);
        return userMapper.existentEvaluate(movieId,userId);
    }
    public void updateEvaluate(UserDTO dto){
        userMapper.updateEvaluate(dto);
    }
    public List<Integer> duplicatedInterest(String username,String movieId){
        int userId =userMapper.findUserPk(username);
        return userMapper.duplicatedInterest(movieId,userId);
    }
    public void deleteInterest(int interestedId){
        userMapper.deleteInterest(interestedId);
    }

    public List<ModalDTO> getInterestedWithEvaluate(String username,String movieId){
        int userId =userMapper.findUserPk(username);
        return userMapper.getInterestedWithEvaluate(movieId,userId);
    }
    public ProfileDTO totalProfile(String username){
        int userId =userMapper.findUserPk(username);
        System.out.println(userId);
        return userMapper.totalProfile(userId);
    }

    public void updateProfile(ProfileDTO dto){
        userMapper.updateProfile(dto);
    }
    public List<CountDTO> countEvaluate(int userId){
        return userMapper.countEvaluate(userId);
    }

    public UserDTO findEmail(String email){
        return userMapper.fineEmail(email);
    }

    public Integer findUserPk(String username){
        return userMapper.findUserPk(username);
    }

    public List<InterestedDTO> findInterested(String username){
        return userMapper.findInterested(username);
    }
    public void deleteUser(int user_id){
        userMapper.deleteUser(user_id);
    }
    public String findPwd(int userid){
        return userMapper.findPwd(userid);
    }
    public ProfileDTO findChatUser(String username){
        return userMapper.findChatUser(username);
    }
}
