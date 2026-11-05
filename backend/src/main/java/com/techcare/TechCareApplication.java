package com.techcare;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class TechCareApplication {

    public static void main(String[] args) {
        SpringApplication.run(TechCareApplication.class, args);
    }
}

