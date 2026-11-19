package com.ridesharehub.trip.realtime;

import com.ridesharehub.trip.dto.TripLiveSnapshotResponse;
import java.io.IOException;
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
        String json;
        try {
            json = objectMapper.writeValueAsString(snapshot);
        } catch (Exception ex) {
            log.warn("Failed to serialize TripLiveSnapshotResponse for trip {}: {}", tripId, ex.getMessage());
            return;
        }
        TextMessage message = new TextMessage(json);
        for (WebSocketSession session : sessions) {
            if (!session.isOpen()) {
                sessions.remove(session);
                continue;
            }
            try {
                synchronized (session) {
                    if (session.isOpen()) {
                        session.sendMessage(message);
                    }
                }
            } catch (IOException ex) {
                log.debug("Removing closed/broken WebSocket session {}: {}", session.getId(), ex.getMessage());
                sessions.remove(session);
            }
        }
    }

    public int activeSubscribersCount(Long tripId) {
        Set<WebSocketSession> set = sessionsByTrip.get(tripId);
        return set != null ? set.size() : 0;
    }
}
