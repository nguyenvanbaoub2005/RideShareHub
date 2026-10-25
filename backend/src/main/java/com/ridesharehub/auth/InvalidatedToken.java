package com.ridesharehub.auth;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "invalidated_tokens")
public class InvalidatedToken {
    @Id
    private UUID id;
    private Instant expiresAt;

    protected InvalidatedToken() { }

    public InvalidatedToken(UUID id, Instant expiresAt) {
        this.id = id;
        this.expiresAt = expiresAt;
    }
}
