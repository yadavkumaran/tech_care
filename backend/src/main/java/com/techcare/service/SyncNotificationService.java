package com.techcare.service;

import com.techcare.dto.event.SyncEvent;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class SyncNotificationService {

    // Emitters timeout after 60 minutes; client auto-reconnects
    private static final Long EMITTER_TIMEOUT = 3600000L;

    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();
    private final ScheduledExecutorService heartbeatExecutor = Executors.newSingleThreadScheduledExecutor();

    public SyncNotificationService() {
        // Send keep-alive heartbeat ping every 25 seconds to prevent proxy / browser timeout
        heartbeatExecutor.scheduleAtFixedRate(this::sendHeartbeat, 25, 25, TimeUnit.SECONDS);
    }

    public SseEmitter subscribe(String username) {
        SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT);
        emitters.add(emitter);

        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> {
            emitter.complete();
            emitters.remove(emitter);
        });
        emitter.onError((e) -> emitters.remove(emitter));

        // Initial connection handshake
        try {
            emitter.send(SseEmitter.event()
                    .name("CONNECTED")
                    .data(SyncEvent.builder()
                            .entity("SYSTEM")
                            .action("CONNECTED")
                            .actorUsername(username != null ? username : "anonymous")
                            .timestamp(LocalDateTime.now())
                            .build()));
        } catch (IOException e) {
            emitters.remove(emitter);
        }

        return emitter;
    }

    public void publishEvent(String entity, String action, Long id, String reference, String actorUsername) {
        SyncEvent event = SyncEvent.builder()
                .entity(entity)
                .action(action)
                .id(id)
                .reference(reference)
                .actorUsername(actorUsername)
                .timestamp(LocalDateTime.now())
                .build();

        log.info("Broadcasting real-time sync event: entity={}, action={}, ref={}, actor={}", 
                entity, action, reference, actorUsername);

        List<SseEmitter> failedEmitters = new CopyOnWriteArrayList<>();

        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("SYNC_EVENT")
                        .data(event));
            } catch (Exception e) {
                failedEmitters.add(emitter);
            }
        }

        emitters.removeAll(failedEmitters);
    }

    private void sendHeartbeat() {
        List<SseEmitter> failedEmitters = new CopyOnWriteArrayList<>();
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("PING")
                        .data("keep-alive"));
            } catch (Exception e) {
                failedEmitters.add(emitter);
            }
        }
        emitters.removeAll(failedEmitters);
    }

    @PreDestroy
    public void cleanup() {
        heartbeatExecutor.shutdown();
        for (SseEmitter emitter : emitters) {
            try {
                emitter.complete();
            } catch (Exception ignored) {}
        }
        emitters.clear();
    }
}
