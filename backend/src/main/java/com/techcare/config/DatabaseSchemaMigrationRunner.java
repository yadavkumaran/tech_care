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
            jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS base_salary NUMERIC(12, 2) DEFAULT 0.00;");

            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS salary_settlements (
                    id BIGSERIAL PRIMARY KEY,
                    user_id BIGINT NOT NULL REFERENCES users(id),
                    salary_month VARCHAR(30) NOT NULL,
                    base_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                    bonus NUMERIC(12, 2) DEFAULT 0.00,
                    deductions NUMERIC(12, 2) DEFAULT 0.00,
                    net_salary NUMERIC(12, 2) NOT NULL,
                    payment_method VARCHAR(30) NOT NULL,
                    transaction_ref VARCHAR(100),
                    payment_date DATE NOT NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'PAID',
                    notes TEXT,
                    settled_by BIGINT REFERENCES users(id),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """);

            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_salary_settlements_user_id ON salary_settlements(user_id);");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_salary_settlements_payment_date ON salary_settlements(payment_date);");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_salary_settlements_month ON salary_settlements(salary_month);");

            log.info("Database schema columns and tables verified successfully.");
        } catch (Exception e) {
            log.warn("Non-fatal schema migration check notice: {}", e.getMessage());
        }
    }
}

