package com.ridesharehub.trip.realtime;

import com.ridesharehub.auth.enums.UserRole;
import com.ridesharehub.security.AuthPrincipal;
import com.ridesharehub.trip.dto.TripLiveSnapshotResponse;
import com.ridesharehub.trip.dto.TripStopResponse;
import java.io.IOException;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import tools.jackson.databind.ObjectMapper;

/**
 * SP3-P2-02: Ephemeral WebSocket session registry and broadcaster per Trip.
 * Durable state is always committed to PostgreSQL first (ADR-003).
 */
@Component
public class TripRealtimeBroadcaster {

    private static final Logger log = LoggerFactory.getLogger(TripRealtimeBroadcaster.class);

    private final ConcurrentHashMap<Long, Set<WebSocketSession>> sessionsByTrip =
            new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;

    public TripRealtimeBroadcaster() {
        this.objectMapper = new ObjectMapper();
    }

    public void register(Long tripId, WebSocketSession session) {
        sessionsByTrip
                .computeIfAbsent(tripId, k -> ConcurrentHashMap.newKeySet())
                .add(session);
    }

    public void unregister(Long tripId, WebSocketSession session) {
        if (tripId == null) return;
        Set<WebSocketSession> set = sessionsByTrip.get(tripId);
        if (set != null) {
            set.remove(session);
            if (set.isEmpty()) {
                sessionsByTrip.remove(tripId, set);
            }
        }
    }

    public void sendToSession(WebSocketSession session, TripLiveSnapshotResponse snapshot) {
        if (session == null || !session.isOpen()) return;
        try {
            String json = objectMapper.writeValueAsString(snapshot);
            synchronized (session) {
                if (session.isOpen()) {
                    session.sendMessage(new TextMessage(json));
                }
            }
        } catch (Exception ex) {
            log.debug("Failed to send snapshot to WebSocket session {}: {}", session.getId(), ex.getMessage());
        }
    }

    public void broadcast(Long tripId, TripLiveSnapshotResponse snapshot) {
        Set<WebSocketSession> sessions = sessionsByTrip.get(tripId);
        if (sessions == null || sessions.isEmpty()) return;
        String fullJson;
        String maskedPassengerJson;
        try {
            fullJson = objectMapper.writeValueAsString(snapshot);
            maskedPassengerJson = objectMapper.writeValueAsString(maskSnapshotForBroadcast(snapshot));
        } catch (Exception ex) {
            log.warn("Failed to serialize TripLiveSnapshotResponse for trip {}: {}", tripId, ex.getMessage());
            return;
        }
        TextMessage fullMessage = new TextMessage(fullJson);
        TextMessage maskedMessage = new TextMessage(maskedPassengerJson);
        for (WebSocketSession session : sessions) {
            if (!session.isOpen()) {
                sessions.remove(session);
                continue;
            }
            Object principalAttr = session.getAttributes().get("principal");
            boolean isPassenger = principalAttr instanceof AuthPrincipal ap && ap.role() == UserRole.PASSENGER;
            TextMessage payload = isPassenger ? maskedMessage : fullMessage;
            try {
                synchronized (session) {
                    if (session.isOpen()) {
                        session.sendMessage(payload);
                    }
                }
            } catch (IOException ex) {
                log.debug("Removing closed/broken WebSocket session {}: {}", session.getId(), ex.getMessage());
                sessions.remove(session);
            }
        }
    }

    /**
     * SP3-P1-04: Masks personal details of passengers in shared WebSocket broadcasts
     * so no passenger receives another passenger's name, phone, or booking code.
     */
    private static TripLiveSnapshotResponse maskSnapshotForBroadcast(TripLiveSnapshotResponse s) {
        List<TripStopResponse> maskedStops = s.routeOptimized() && s.stops() != null
                ? s.stops().stream().map(TripRealtimeBroadcaster::maskStop).toList()
                : List.of();
        TripStopResponse maskedNext = s.nextStop() != null ? maskStop(s.nextStop()) : null;
        return new TripLiveSnapshotResponse(
                s.eventType(),
                s.tripId(),
                s.routeName(),
                s.origin(),
                s.destination(),
                s.departureTime(),
                s.estimatedMinutes(),
                s.tripStatus(),
                s.assignmentStatus(),
                s.companyName(),
                s.vehiclePlate(),
                s.vehicleType(),
                s.driverName(),
                s.driverPhone(),
                s.currentLat(),
                s.currentLng(),
                s.heading(),
                s.speedKmh(),
                s.locationUpdatedAt(),
                s.locationStale(),
                maskedNext,
                s.etaMinutesToNextStop(),
                s.completedStopsCount(),
                s.totalStopsCount(),
                maskedStops,
                s.recentEvents(),
                s.serverTimestamp(),
                s.acceptedProposalId(),
                s.routeOptimized(),
                null,
                null);
    }

    private static TripStopResponse maskStop(TripStopResponse st) {
        return new TripStopResponse(
                st.id(),
                st.tripId(),
                null,
                null,
                "Hành khách",
                null,
                st.seatCount(),
                st.bookingStatus(),
                st.stopType(),
                st.stopOrder(),
                "Điểm dừng dọc tuyến",
                st.latitude(),
                st.longitude(),
                st.status(),
                st.arrivedAt(),
                st.completedAt(),
                st.plannedArrivalAt(),
                st.proposalId(),
                null);
    }

    public int activeSubscribersCount(Long tripId) {
        Set<WebSocketSession> set = sessionsByTrip.get(tripId);
        return set != null ? set.size() : 0;
    }
}
