package com.techcare.service;

import com.techcare.dto.request.StaffRequest;
import com.techcare.entity.User;
import com.techcare.entity.enums.Role;
import com.techcare.exception.BadRequestException;
import com.techcare.exception.ResourceNotFoundException;
import com.techcare.repository.RepairTicketRepository;
import com.techcare.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StaffService {

    private final UserRepository userRepository;
    private final RepairTicketRepository ticketRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<User> getAllStaff() {
        return userRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<User> getActiveTechnicians() {
        return userRepository.findByRoleAndIsActiveTrue(Role.TECHNICIAN);
    }

    @Transactional(readOnly = true)
    public User getStaffById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Staff member not found with id: " + id));
    }

    @Transactional
    public User createStaff(StaffRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BadRequestException("Username " + request.getUsername() + " is already taken");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email " + request.getEmail() + " is already in use");
        }
        if (request.getPassword() == null || request.getPassword().trim().isEmpty()) {
            throw new BadRequestException("Password is required when creating a new staff member");
        }

        Role role;
        try {
            role = Role.valueOf(request.getRole().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid role: " + request.getRole());
        }

        User user = User.builder()
                .username(request.getUsername().trim().toLowerCase())
                .email(request.getEmail().trim().toLowerCase())
                .passwordHash(passwordEncoder.encode(request.getPassword().trim()))
                .fullName(request.getFullName().trim())
                .phone(request.getPhone())
                .role(role)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();

        return userRepository.save(user);
    }

    @Transactional
    public User updateStaff(Long id, StaffRequest request) {
        User user = getStaffById(id);

        if (!user.getUsername().equalsIgnoreCase(request.getUsername()) && userRepository.existsByUsername(request.getUsername())) {
            throw new BadRequestException("Username " + request.getUsername() + " is already taken");
        }
        if (!user.getEmail().equalsIgnoreCase(request.getEmail()) && userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email " + request.getEmail() + " is already in use");
        }

        Role role;
        try {
            role = Role.valueOf(request.getRole().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid role: " + request.getRole());
        }

        user.setUsername(request.getUsername().trim().toLowerCase());
        user.setEmail(request.getEmail().trim().toLowerCase());
        user.setFullName(request.getFullName().trim());
        user.setPhone(request.getPhone());
        user.setRole(role);
        if (request.getIsActive() != null) {
            user.setIsActive(request.getIsActive());
        }

        // If a new password is provided, update it
        if (request.getPassword() != null && !request.getPassword().trim().isEmpty()) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword().trim()));
        }

        return userRepository.save(user);
    }

    @Transactional
    public void deleteStaff(Long id) {
        User user = getStaffById(id);

        boolean hasAssignedTickets = !ticketRepository.findByAssignedTechnicianId(id).isEmpty();
        boolean hasCreatedTickets = ticketRepository.existsByCreatedById(id);

        if (hasAssignedTickets || hasCreatedTickets) {
            // Soft-deactivate instead of hard delete to preserve historical integrity and avoid FK constraint errors
            user.setIsActive(false);
            userRepository.save(user);
        } else {
            try {
                userRepository.delete(user);
            } catch (Exception e) {
                // If referenced in audit logs or history, soft-delete safely
                user.setIsActive(false);
                userRepository.save(user);
            }
        }
    }
}

