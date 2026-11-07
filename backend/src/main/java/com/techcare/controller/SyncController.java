package com.techcare.controller;

import com.techcare.security.UserDetailsImpl;
import com.techcare.service.SyncNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/sync")
@RequiredArgsConstructor
public class SyncController {

    private final SyncNotificationService syncService;

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamEvents(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        String username = userDetails != null ? userDetails.getUsername() : "client";
        return syncService.subscribe(username);
    }
}
