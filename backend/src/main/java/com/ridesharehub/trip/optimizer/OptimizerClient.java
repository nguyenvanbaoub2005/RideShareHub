package com.ridesharehub.trip.optimizer;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

/**
 * SP3-P1-03: HTTP client bridging Spring Boot backend to Python FastAPI + OR-Tools Optimizer.
 */
@Component
public class OptimizerClient {
    private static final Logger log = LoggerFactory.getLogger(OptimizerClient.class);

    private final String baseUrl;
    private final long timeoutMs;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public OptimizerClient(
            @Value("${optimizer.base-url:http://localhost:8000}") String baseUrl,
            @Value("${optimizer.timeout-ms:8000}") long timeoutMs) {
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.timeoutMs = Math.max(1000L, timeoutMs);
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(Math.min(this.timeoutMs, 4000L)))
                .build();
    }

    public OptimizerRouteResponse optimizeTripRoute(OptimizerRouteRequest request) {
        try {
            String jsonBody = objectMapper.writeValueAsString(request);
            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/optimize/trip-route"))
                    .timeout(Duration.ofMillis(timeoutMs))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            int status = response.statusCode();
            if (status >= 200 && status < 300) {
                return objectMapper.readValue(response.body(), OptimizerRouteResponse.class);
            }
            if (status == 422 || status == 400) {
                throw new ResponseStatusException(
                        HttpStatus.UNPROCESSABLE_ENTITY,
                        "Dữ liệu tối ưu lộ trình không hợp lệ hoặc vượt sức chứa xe: " + response.body());
            }
            log.warn("Optimizer service returned HTTP {}: {}", status, response.body());
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Dịch vụ tối ưu lộ trình (Optimizer) phản hồi lỗi HTTP " + status);
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("Failed to call Optimizer service at {}: {}", baseUrl, ex.getMessage());
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Không thể kết nối tới dịch vụ tối ưu lộ trình tại " + baseUrl
                            + ". Vui lòng kiểm tra container/service Optimizer đang chạy.");
        }
    }

    // ---- Wire DTOs matching FastAPI snake_case schema ----

    public record LocationPoint(String label, double latitude, double longitude) { }

    public record BookingStopInput(
            long booking_id,
            int seat_count,
            LocationPoint pickup,
            LocationPoint dropoff) { }

    public record OptimizerRouteRequest(
            long trip_id,
            int vehicle_capacity,
            LocationPoint start_point,
            LocationPoint end_point,
            double average_speed_kmh,
            double time_limit_seconds,
            List<BookingStopInput> bookings) { }

    public record OptimizedStopOutput(
            int stop_order,
            long booking_id,
            String stop_type,
            String label,
            double latitude,
            double longitude,
            int seat_delta,
            int cumulative_seats_on_board,
            BigDecimal distance_from_prev_km,
            BigDecimal cumulative_distance_km,
            int eta_offset_minutes) { }

    public record OptimizerRouteResponse(
            long trip_id,
            String solver_engine,
            String solver_status,
            BigDecimal total_distance_km,
            BigDecimal baseline_distance_km,
            BigDecimal distance_saved_km,
            int total_duration_minutes,
            int max_seats_on_board,
            int vehicle_capacity,
            List<OptimizedStopOutput> ordered_stops) { }
}
