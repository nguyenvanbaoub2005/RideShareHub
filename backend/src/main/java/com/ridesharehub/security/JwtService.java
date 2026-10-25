package com.ridesharehub.security;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.ridesharehub.auth.User;
import java.nio.charset.StandardCharsets;
import java.text.ParseException;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
    private final byte[] signerKey;
    private final long accessTokenSeconds;
    private final long refreshTokenSeconds;

    public JwtService(
            @Value("${jwt.signer-key}") String signerKey,
            @Value("${jwt.access-token-seconds}") long accessTokenSeconds,
            @Value("${jwt.refresh-token-seconds}") long refreshTokenSeconds) {
        this.signerKey = signerKey.getBytes(StandardCharsets.UTF_8);
        if (this.signerKey.length < 64) {
            throw new IllegalStateException("JWT_SECRET must be at least 64 bytes for HS512");
        }
        this.accessTokenSeconds = accessTokenSeconds;
        this.refreshTokenSeconds = refreshTokenSeconds;
    }

    public String createAccessToken(User user) { return createToken(user, "access", accessTokenSeconds); }
    public String createRefreshToken(User user) { return createToken(user, "refresh", refreshTokenSeconds); }
    public long accessTokenSeconds() { return accessTokenSeconds; }

    public VerifiedToken verify(String token, String expectedType) {
        try {
            SignedJWT signed = SignedJWT.parse(token);
            if (!signed.verify(new MACVerifier(signerKey))) {
                throw invalidToken();
            }
            JWTClaimsSet claims = signed.getJWTClaimsSet();
            if (!expectedType.equals(claims.getStringClaim("type")) || claims.getExpirationTime().before(new Date())) {
                throw invalidToken();
            }
            return new VerifiedToken(
                    UUID.fromString(claims.getJWTID()),
                    claims.getLongClaim("userId"),
                    claims.getStringClaim("role"),
                    claims.getExpirationTime().toInstant());
        } catch (ParseException | JOSEException | IllegalArgumentException ex) {
            throw invalidToken();
        }
    }

    private String createToken(User user, String tokenType, long validForSeconds) {
        Instant now = Instant.now();
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject(user.getEmail())
                .issuer("ridesharehub")
                .issueTime(Date.from(now))
                .expirationTime(Date.from(now.plusSeconds(validForSeconds)))
                .jwtID(UUID.randomUUID().toString())
                .claim("type", tokenType)
                .claim("userId", user.getId())
                .claim("role", user.getRole().name())
                .build();
        try {
            SignedJWT signed = new SignedJWT(new JWSHeader(JWSAlgorithm.HS512), claims);
            signed.sign(new MACSigner(signerKey));
            return signed.serialize();
        } catch (JOSEException ex) {
            throw new IllegalStateException("Cannot sign JWT", ex);
        }
    }

    private SecurityException invalidToken() { return new SecurityException("Invalid or expired token"); }

    public record VerifiedToken(UUID id, Long userId, String role, Instant expiresAt) { }
}
