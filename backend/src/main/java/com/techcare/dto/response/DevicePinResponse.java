package com.techcare.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DevicePinResponse {
    private Long deviceId;
    private String serialNumber;
    private String devicePassword;
    private LocalDateTime revealedAt;
    private String revealedBy;
}

