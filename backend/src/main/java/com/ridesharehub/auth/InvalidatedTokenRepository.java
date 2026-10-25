package com.ridesharehub.auth;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvalidatedTokenRepository extends JpaRepository<InvalidatedToken, UUID> { }
