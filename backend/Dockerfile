# Build Stage
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

# Cache dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Build executable jar
COPY src ./src
RUN mvn clean package -DskipTests

# Runtime Stage (Alpine JRE for minimal memory footprint on Render free tier)
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Run as non-root user for security
RUN addgroup -S techcare && adduser -S techcare -G techcare
USER techcare:techcare

COPY --from=build --chown=techcare:techcare /app/target/*.jar app.jar

ENV PORT=8080
# Restrict heap to stay safely within Render's 512MB RAM free-tier limit
ENV JAVA_OPTS="-Xms128m -Xmx320m -XX:+UseG1GC -XX:+ExitOnOutOfMemoryError"

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]

