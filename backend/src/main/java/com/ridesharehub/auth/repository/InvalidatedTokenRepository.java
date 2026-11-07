package com.ridesharehub.auth.repository;

import com.ridesharehub.auth.entity.InvalidatedToken;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvalidatedTokenRepository extends JpaRepository<InvalidatedToken, UUID> { }
