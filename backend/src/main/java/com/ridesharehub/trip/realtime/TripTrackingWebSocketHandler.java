package com.ridesharehub.trip.realtime;

import com.ridesharehub.auth.enums.UserRole;
import com.ridesharehub.auth.repository.InvalidatedTokenRepository;
import com.ridesharehub.auth.repository.UserRepository;
import com.ridesharehub.security.AuthPrincipal;
import com.ridesharehub.security.JwtService;
import com.ridesharehub.trip.dto.DriverLocationUpdateRequest;
import com.ridesharehub.trip.dto.TripLiveSnapshotResponse;
import com.ridesharehub.trip.service.TripExecutionService;
import java.math.BigDecimal;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
public class TripTrackingWebSocketHandler extends TextWebSocketHandler {
    private static final Logger log = LoggerFactory.getLogger(TripTrackingWebSocketHandler.class);
    private static final String ATTR_TRIP_ID = "tripId";
    private static final String ATTR_PRINCIPAL = "principal";

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final InvalidatedTokenRepository invalidatedTokenRepository;
    private final TripExecutionService tripExecutionService;
    private final TripRealtimeBroadcaster broadcaster;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public TripTrackingWebSocketHandler(
            JwtService jwtService,
            UserRepository userRepository,
            InvalidatedTokenRepository invalidatedTokenRepository,
            TripExecutionService tripExecutionService,
            TripRealtimeBroadcaster broadcaster) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.invalidatedTokenRepository = invalidatedTokenRepository;
        this.tripExecutionService = tripExecutionService;
        this.broadcaster = broadcaster;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        Long tripId = extractTripId(session.getUri());
        if (tripId == null) {
            session.close(new CloseStatus(4400, "Invalid trip ID in WebSocket path"));
            return;
        }

        AuthPrincipal principal = authenticateSession(session);
        if (principal == null) {
            session.close(new CloseStatus(4401, "Unauthorized WebSocket connection"));
            return;
        }

        if (!tripExecutionService.canObserveTrip(tripId, principal)) {
            session.close(new CloseStatus(4403, "Forbidden: not authorized to observe this trip"));
            return;
        }

        session.getAttributes().put(ATTR_TRIP_ID, tripId);
        session.getAttributes().put(ATTR_PRINCIPAL, principal);
        broadcaster.register(tripId, session);

        try {
            TripLiveSnapshotResponse snapshot = tripExecutionService.getLiveSnapshot(tripId, principal);
            broadcaster.sendToSession(session, snapshot);
        } catch (Exception ex) {
            log.warn("Failed to send initial live snapshot for trip {}: {}", tripId, ex.getMessage());
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        Long tripId = (Long) session.getAttributes().get(ATTR_TRIP_ID);
        AuthPrincipal principal = (AuthPrincipal) session.getAttributes().get(ATTR_PRINCIPAL);
        if (tripId == null || principal == null) {
            return;
        }

        try {
            JsonNode root = objectMapper.readTree(message.getPayload());
            String type = root.hasNonNull("type") ? root.get("type").asText() : "";
            if ("PING".equalsIgnoreCase(type)) {
                session.sendMessage(new TextMessage("{\"type\":\"PONG\"}"));
                return;
            }
            if ("LOCATION_UPDATE".equalsIgnoreCase(type) && principal.role() == UserRole.DRIVER) {
                double lat = root.path("latitude").asDouble(Double.NaN);
                double lng = root.path("longitude").asDouble(Double.NaN);
                if (!Double.isNaN(lat) && !Double.isNaN(lng)) {
                    BigDecimal heading = root.hasNonNull("heading")
                            ? BigDecimal.valueOf(root.get("heading").asDouble())
                            : null;
                    BigDecimal speedKmh = root.hasNonNull("speedKmh")
                            ? BigDecimal.valueOf(root.get("speedKmh").asDouble())
                            : null;
                    tripExecutionService.updateDriverLocation(
                            tripId,
                            new DriverLocationUpdateRequest(
                                    BigDecimal.valueOf(lat),
                                    BigDecimal.valueOf(lng),
                                    heading,
                                    speedKmh),
                            principal);
                }
            }
        } catch (Exception ex) {
            log.debug("Ignored WebSocket text frame on trip {}: {}", tripId, ex.getMessage());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        Long tripId = (Long) session.getAttributes().get(ATTR_TRIP_ID);
        broadcaster.unregister(tripId, session);
    }

    private Long extractTripId(URI uri) {
        if (uri == null || uri.getPath() == null) {
            return null;
        }
        String path = uri.getPath();
        int idx = path.lastIndexOf('/');
        if (idx < 0 || idx + 1 >= path.length()) {
            return null;
        }
        try {
            return Long.parseLong(path.substring(idx + 1));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private AuthPrincipal authenticateSession(WebSocketSession session) {
        String rawToken = null;
        List<String> authHeaders = session.getHandshakeHeaders().get("Authorization");
        if (authHeaders != null && !authHeaders.isEmpty()) {
            String header = authHeaders.get(0);
            if (header != null && header.startsWith("Bearer ")) {
                rawToken = header.substring(7).trim();
            }
        }
        if (rawToken == null && session.getUri() != null && session.getUri().getQuery() != null) {
            for (String pair : session.getUri().getQuery().split("&")) {
                int eq = pair.indexOf('=');
                if (eq > 0) {
                    String key = URLDecoder.decode(pair.substring(0, eq), StandardCharsets.UTF_8);
                    if ("token".equals(key)) {
                        rawToken = URLDecoder.decode(pair.substring(eq + 1), StandardCharsets.UTF_8);
                        break;
                    }
                }
            }
        }
        if (rawToken == null || rawToken.isBlank()) {
            return null;
        }
        try {
            JwtService.VerifiedToken verified = jwtService.verify(rawToken, "access");
            if (invalidatedTokenRepository.existsById(verified.id())) {
                return null;
            }
            return userRepository.findById(verified.userId())
                    .filter(user -> user.isActive())
                    .map(user -> new AuthPrincipal(user.getId(), user.getEmail(), user.getRole()))
                    .orElse(null);
        } catch (Exception ex) {
            return null;
        }
    }
}
