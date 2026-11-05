package com.techcare.controller;

import com.techcare.dto.response.ApiResponse;
import com.techcare.entity.User;
import com.techcare.entity.enums.Role;
import com.techcare.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/staff")
@RequiredArgsConstructor
public class StaffController {

    private final UserRepository userRepository;

    @GetMapping("/technicians")
    public ResponseEntity<ApiResponse<List<User>>> getTechnicians() {
        List<User> technicians = userRepository.findByRoleAndIsActiveTrue(Role.TECHNICIAN);
        return ResponseEntity.ok(ApiResponse.success(technicians));
    }
}

