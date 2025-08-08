package com.spring.team.mapper;

import com.spring.team.dto.*;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;


public interface UserMapper {
   void createUser(UserDTO dto);
   UserDTO findUser(String id);
   void insertInterested(UserDTO dto);
   Integer findUserPk(String username);
   void insertEvaluate(UserDTO dto);
   void streaming(UserDTO dto);
   UserDTO getMovieStreamingTime(UserDTO dto);
   void updateStreamingTime(UserDTO dto);
   void deleteEvaluate(@Param("movieId")String movieId, @Param("userId") int userId);
   List<Integer> existentEvaluate(@Param("movieId")String movieId, @Param("userId") int userId);
   void updateEvaluate(UserDTO dto);
   List<Integer>duplicatedInterest(@Param("movieId")String movieId, @Param("userId") int userId);
   void deleteInterest(@Param("interestedId")int interestedId);
   List<ModalDTO> getInterestedWithEvaluate(@Param("movieId")String movieId, @Param("userId") int userId);
   ProfileDTO totalProfile(@Param("user_id") int user_id);
   void updateProfile(ProfileDTO dto);
   List<CountDTO> countEvaluate(@Param("userId") int userId);
   UserDTO fineEmail(@Param("email")String email);
   List<InterestedDTO> findInterested(@Param("username")String username);
   void deleteUser(@Param("userId")int user_id);
   String findPwd(@Param("userId")int user_id);
   ProfileDTO findChatUser(@Param("username")String username);
}
