package com.techcare.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DatabaseSchemaMigrationRunner implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        try {
            log.info("Running automatic database schema column checks...");
            jdbcTemplate.execute("ALTER TABLE repair_tickets ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMP;");
            jdbcTemplate.execute("ALTER TABLE repair_tickets ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;");
            log.info("Database schema columns verified successfully.");
        } catch (Exception e) {
            log.warn("Non-fatal schema migration check notice: {}", e.getMessage());
        }
    }
}
